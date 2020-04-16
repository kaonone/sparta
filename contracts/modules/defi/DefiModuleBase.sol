pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../../common/Module.sol";
import "./DefiOperatorRole.sol";

/**
* @dev DeFi integration module
* This module should be initialized only *AFTER* PTK module is available and address
* of DeFi source is set.
*/
contract DefiModuleBase is Module, DefiOperatorRole {
    using SafeMath for uint256;

    event InvestmentDistributionCreated(uint256 amount, uint256 currentBalance, uint256 totalShares);
    event InvestmentDistributionsClaimed(address account, uint256 shares, uint256 amount, uint256 fromDistribution, uint256 toDistribution);

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
    mapping(address => InvestmentBalance) public balances;  // Map account to first distribution not yet processed
    uint256 depositsSinceLastDistribution;                  // Amount DAI deposited since last distribution;
    uint256 withdrawalsSinceLastDistribution;               // Amount DAI withdrawn since last distribution;

    function initialize(address _pool) public initializer {
        Module.initialize(_pool);
        DefiOperatorRole.initialize(_msgSender());
        _createInitialDistribution();
    }

    // == Public functions
    function deposit(address sender, uint256 amount) public onlyDefiOperator {
        depositsSinceLastDistribution = depositsSinceLastDistribution.add(amount);
        depositInternal(sender, amount);
    }
    function withdraw(address beneficiary, uint256 amount) public onlyDefiOperator {
        withdrawalsSinceLastDistribution = withdrawalsSinceLastDistribution.add(amount);
        withdrawInternal(beneficiary, amount);
    }
    function withdrawInterest() public {
        InvestmentBalance storage ib = balances[_msgSender()];
        if(ib.availableBalance > 0) {
            withdrawInternal(_msgSender(), ib.availableBalance);
        }
    }
    /**
     * @notice Update user balance with interest received
     * @param account Address of the user
     */
    function claimDistributions(address account) external {
        _updateUserBalance(account, distributions.length);
    }
    /**
     * @notice Update state of user balance for next distributions
     * @param account Address of the user
     * @param ptkBalance New PTK balance of the user
     */
    function updatePTKBalance(address account, uint256 ptkBalance) public onlyDefiOperator {
        _updateUserBalance(account, distributions.length);
        balances[account].ptkBalance = ptkBalance;
    }

    // == Abstract functions to be defined in realization ==
    function depositInternal(address sender, uint256 amount) internal;
    function withdrawInternal(address beneficiary, uint256 amount) internal;
    function poolBalanceOfDAI() internal view returns(uint256);
    function totalSupplyOfPTK() internal view returns(uint256);

    // == Internal functions of DefiModule

    function _createInitialDistribution() internal {
        assert(distributions.length == 0);
        distributions.push(Distribution({
            amount:0,
            balance: poolBalanceOfDAI(),
            totalPTK: totalSupplyOfPTK()
        }));
    }

    function _createDistribution() internal {
        Distribution storage prev = distributions[distributions.length - 1]; //This is safe because _createInitialDistribution called in initialize.
        uint256 currentBalanceOfDAI = poolBalanceOfDAI();
        uint256 totalPTK = totalSupplyOfPTK();

        // This calculation expects that, without deposit/withdrawals, DAI balance can only be increased
        // Such assumption may be wrong if underlying system (Compound) is compromised.
        // In that case SafeMath will revert transaction and we will have to update our logic.
        uint256 distributionAmount =
            currentBalanceOfDAI
            .add(withdrawalsSinceLastDistribution)
            .sub(depositsSinceLastDistribution)
            .sub(prev.balance);
        if (distributionAmount == 0) return;

        distributions.push(Distribution({
            amount:distributionAmount,
            balance: currentBalanceOfDAI,
            totalPTK: totalPTK
        }));
        depositsSinceLastDistribution = 0;
        withdrawalsSinceLastDistribution = 0;
        emit InvestmentDistributionCreated(distributionAmount, currentBalanceOfDAI, totalPTK);
    }

    function _updateUserBalance(address account, uint256 toDistribution) internal {
        InvestmentBalance storage ib = balances[account];
        uint256 fromDistribution = ib.nextDistribution;
        uint256 interest = _calculateDistributedAmount(fromDistribution, toDistribution, ib.ptkBalance);
        ib.availableBalance = ib.availableBalance.add(interest);
        emit InvestmentDistributionsClaimed(account, ib.ptkBalance, interest, fromDistribution, toDistribution);
    }

    function _calculateDistributedAmount(uint256 fromDistribution, uint256 toDistribution, uint256 ptkBalance) internal view returns(uint256) {
        if(ptkBalance == 0) return 0;
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