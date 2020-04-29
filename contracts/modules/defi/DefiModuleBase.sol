pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../../interfaces/defi/IDefiModule.sol";
import "../../common/Module.sol";
import "./DefiOperatorRole.sol";

/**
* @dev DeFi integration module
* This module should be initialized only *AFTER* PTK module is available and address
* of DeFi source is set.
*/
contract DefiModuleBase is Module, DefiOperatorRole, IDefiModule {
    using SafeMath for uint256;

    uint256 public constant DISTRIBUTION_AGGREGATION_PERIOD = 24*60*60;

    struct Distribution {
        uint256 amount;         // Amount of DAI being distributed during the event
        uint256 balance;        // Total amount of DAI stored
        uint256 totalPTK;       // Total shares (PTK distribution supply) before distribution
    }

    struct InvestmentBalance {
        uint256 ptkBalance;             // User's share of PTK
        uint256 availableBalance;       // Amount of DAI available to redeem
        uint256 nextDistribution;       // First distribution not yet processed
    }

    Distribution[] public distributions;                    // Array of all distributions
    uint256 public nextDistributionTimestamp;               //Timestamp when next distribuition should be fired
    mapping(address => InvestmentBalance) public balances;  // Map account to first distribution not yet processed
    uint256 depositsSinceLastDistribution;                  // Amount DAI deposited since last distribution;
    uint256 withdrawalsSinceLastDistribution;               // Amount DAI withdrawn since last distribution;

    function initialize(address _pool) public initializer {
        Module.initialize(_pool);
        DefiOperatorRole.initialize(_msgSender());
        _createInitialDistribution();
    }

    // == Public functions
    function handleDeposit(address sender, uint256 amount) public onlyDefiOperator {
        depositsSinceLastDistribution = depositsSinceLastDistribution.add(amount);
        handleDepositInternal(sender, amount);
        emit Deposit(amount);
    }

    function withdraw(address beneficiary, uint256 amount) public onlyDefiOperator {
        withdrawalsSinceLastDistribution = withdrawalsSinceLastDistribution.add(amount);
        withdrawInternal(beneficiary, amount);
        emit Withdraw(amount);
    }

    function withdrawInterest() public {
        _createDistributionIfReady();
        _updateUserBalance(_msgSender(), distributions.length);
        InvestmentBalance storage ib = balances[_msgSender()];
        if (ib.availableBalance > 0) {
            withdrawInternal(_msgSender(), ib.availableBalance);
            emit WithdrawInterest(_msgSender(), ib.availableBalance);
        }
    }

    /**
     * @notice Update state of user balance for next distributions
     * @param account Address of the user
     * @param ptkBalance New PTK balance of the user
     */
    function updatePTKBalance(address account, uint256 ptkBalance) public {
        require(_msgSender() == getModuleAddress(MODULE_PTOKEN), "DefiModuleBase: operation only allowed for PToken");
        _createDistributionIfReady();
        _updateUserBalance(account, distributions.length);
        balances[account].ptkBalance = ptkBalance;
        emit PTKBalanceUpdated(account, ptkBalance);
    }

    /**
     * @notice Full DAI balance of the pool. Useful to transfer all funds to another module.
     * @dev Note, this call MAY CHANGE state  (internal DAI balance in Compound, for example)
     */
    function poolBalance() public returns(uint256) {
        return poolBalanceOfDAI();
    }

    /**
     * @notice Update user balance with interest received
     * @param account Address of the user
     */
    function claimDistributions(address account) public {
        _createDistributionIfReady();
        _updateUserBalance(account, distributions.length);
    }

    function claimDistributions(address account, uint256 toDistribution) public {
        require(toDistribution <= distributions.length, "DefiModuleBase: lastDistribution too hight");
        _updateUserBalance(account, toDistribution);
    }

    /**
     * @notice Returns how many DAI can be withdrawn by withdrawInterest()
     * @param account Account to check
     * @return Amount of DAI which will be withdrawn by withdrawInterest()
     */
    function availableInterest(address account) public view returns (uint256) {
        InvestmentBalance storage ib = balances[account];
        uint256 unclaimed = _calculateDistributedAmount(ib.nextDistribution, distributions.length, ib.ptkBalance);
        return ib.availableBalance.add(unclaimed);
    }

    function distributionsLength() public view returns(uint256) {
        return distributions.length;
    }

    // == Abstract functions to be defined in realization ==
    function handleDepositInternal(address sender, uint256 amount) internal;
    function withdrawInternal(address beneficiary, uint256 amount) internal;
    function poolBalanceOfDAI() internal /*view*/ returns(uint256); //This is not a view function because cheking cDAI balance may update it
    function totalSupplyOfPTK() internal view returns(uint256);
    function initialBalances() internal returns(uint256 poolDAI, uint256 totalPTK); //This is not a view function because cheking cDAI balance may update it

    // == Internal functions of DefiModule
    function _createInitialDistribution() internal {
        assert(distributions.length == 0);
        (uint256 poolDAI, uint256 totalPTK) = initialBalances();
        distributions.push(Distribution({
            amount:0,
            balance: poolDAI,
            totalPTK: totalPTK
        }));
    }

    function _createDistributionIfReady() internal {
        if (now < nextDistributionTimestamp) return;
        _createDistribution();
    }

    function _createDistribution() internal {
        Distribution storage prev = distributions[distributions.length - 1]; //This is safe because _createInitialDistribution called in initialize.
        uint256 currentBalanceOfDAI = poolBalanceOfDAI();
        uint256 totalPTK = totalSupplyOfPTK();

        // // This calculation expects that, without deposit/withdrawals, DAI balance can only be increased
        // // Such assumption may be wrong if underlying system (Compound) is compromised.
        // // In that case SafeMath will revert transaction and we will have to update our logic.
        // uint256 distributionAmount =
        //     currentBalanceOfDAI
        //     .add(withdrawalsSinceLastDistribution)
        //     .sub(depositsSinceLastDistribution)
        //     .sub(prev.balance);
        uint256 a = currentBalanceOfDAI.add(withdrawalsSinceLastDistribution);
        uint256 b = depositsSinceLastDistribution.add(prev.balance);
        uint256 distributionAmount;
        if (a > b) {
            distributionAmount = a - b;
        }
        // else { //For some reason our balance on underlying system decreased (for example - on first deposit, because of rounding)
        //     distributionAmount = 0; //it is already 0
        // }

        if (distributionAmount == 0) return;

        distributions.push(Distribution({
            amount:distributionAmount,
            balance: currentBalanceOfDAI,
            totalPTK: totalPTK
        }));
        depositsSinceLastDistribution = 0;
        withdrawalsSinceLastDistribution = 0;
        nextDistributionTimestamp = now.sub(now % DISTRIBUTION_AGGREGATION_PERIOD).add(DISTRIBUTION_AGGREGATION_PERIOD);
        emit InvestmentDistributionCreated(distributionAmount, currentBalanceOfDAI, totalPTK);
    }

    function _updateUserBalance(address account, uint256 toDistribution) internal {
        InvestmentBalance storage ib = balances[account];
        uint256 fromDistribution = ib.nextDistribution;
        uint256 interest = _calculateDistributedAmount(fromDistribution, toDistribution, ib.ptkBalance);
        ib.availableBalance = ib.availableBalance.add(interest);
        ib.nextDistribution = toDistribution;
        emit InvestmentDistributionsClaimed(account, ib.ptkBalance, interest, fromDistribution, toDistribution);
    }

    function _calculateDistributedAmount(uint256 fromDistribution, uint256 toDistribution, uint256 ptkBalance) internal view returns(uint256) {
        if (ptkBalance == 0) return 0;
        uint256 next = fromDistribution;
        uint256 totalInterest;
        while (next < toDistribution) {
            Distribution storage d = distributions[next];
            totalInterest = totalInterest.add(d.amount.mul(ptkBalance).div(d.totalPTK)); 
            next++;
        }
        return totalInterest;
    }
}