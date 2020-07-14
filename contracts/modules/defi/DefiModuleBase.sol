pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../../interfaces/defi/IDefiModule.sol";
import "../../interfaces/token/IPToken.sol";
import "../../common/Module.sol";
import "./DefiOperatorRole.sol";

/**
* @dev DeFi integration module
* This module should be initialized only *AFTER* PTK module is available and address
* of DeFi source is set.
*/
//solhint-disable func-order
contract DefiModuleBase is Module, DefiOperatorRole, IDefiModule {
    using SafeMath for uint256;

    uint256 public constant DISTRIBUTION_AGGREGATION_PERIOD = 24*60*60;

    struct Distribution {
        uint256 totalPTK;                           // Total shares (PTK distribution supply) before distribution
        mapping(address => uint256) amounts;        // Amounts of each token being distributed during the event
        mapping(address => uint256) balances;       // Total amount of each token stored
    }

    struct InvestmentBalance {
        uint256 ptkBalance;                             // User's share of PTK
        mapping(address => uint256) availableBalances;  // Amounts of each token available to redeem
        uint256 nextDistribution;                       // First distribution not yet processed
    }

    Distribution[] public distributions;                            // Array of all distributions
    uint256 public nextDistributionTimestamp;                       // Timestamp when next distribuition should be fired
    mapping(address => InvestmentBalance) public balances;          // Map account to first distribution not yet processed
    mapping(address => uint256) depositsSinceLastDistribution;      // Amount DAI deposited since last distribution;
    mapping(address => uint256) withdrawalsSinceLastDistribution;   // Amount DAI withdrawn since last distribution;


    // == Abstract functions to be defined in realization ==
    function registeredTokens() public view returns(address[] memory);
    function handleDepositInternal(address token, address sender, uint256 amount) internal;
    function withdrawInternal(address token, address beneficiary, uint256 amount) internal;
    function poolBalanceOf(address token) internal /*view*/ returns(uint256); //This is not a view function because cheking cDAI balance may update it

    // == Initialization functions
    function initialize(address _pool) public initializer {
        Module.initialize(_pool);
        DefiOperatorRole.initialize(_msgSender());
        _createInitialDistribution();
    }

    // == Public functions
    function handleDeposit(address token, address sender, uint256 amount) public onlyDefiOperator {
        depositsSinceLastDistribution[token] = depositsSinceLastDistribution[token].add(amount);
        handleDepositInternal(token, sender, amount);
        emit Deposit(token, amount);
    }

    function withdraw(address beneficiary, uint256 amount) public onlyDefiOperator {
        address token = getPrefferableTokenForWithdraw(amount);
        withdrawalsSinceLastDistribution[token] = withdrawalsSinceLastDistribution[token].add(amount);
        withdrawInternal(token, beneficiary, amount);
        emit Withdraw(token, amount);
    }

    function withdrawAll() public onlyDefiOperator {
        address[] memory _registeredTokens = registeredTokens();
        for (uint256 i = 0; i < _registeredTokens.length; i++) {
            address token = _registeredTokens[i];
            uint256 balance = poolBalanceOf(token);
            withdrawInternal(token, getModuleAddress(MODULE_FUNDS), balance);
        }
    }

    function withdrawInterest() public {
        _createDistributionIfReady();
        _updateUserBalance(_msgSender(), distributions.length);
        address[] memory tokens = registeredTokens();
        InvestmentBalance storage ib = balances[_msgSender()];
        for (uint256 i=0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 amount = ib.availableBalances[token];
            if (amount > 0) {
                ib.availableBalances[token] = 0;
                withdrawInternal(token, _msgSender(), amount);
                emit WithdrawInterest(_msgSender(), token, amount);
            }
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
     * @notice Full token balance of the pool. Useful to transfer all funds to another module.
     * @dev Note, this call MAY CHANGE state  (internal DAI balance in Compound, for example)
     */
    function poolBalance(address token) public returns(uint256) {
        return poolBalanceOf(token);
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
    function availableInterest(address account) public view returns(address[] memory tokens, uint256[] memory amounts) {
        InvestmentBalance storage ib = balances[account];
        tokens = registeredTokens();

        if (ib.ptkBalance == 0) {
            amounts = new uint256[](tokens.length); //Zero-filled array
            return (tokens, amounts);
        }

        amounts = _calculateDistributedAmount(ib.nextDistribution, distributions.length, ib.ptkBalance, tokens);

        for (uint256 i=0; i < tokens.length; i++) {
            address token = tokens[i];
            amounts[i] = amounts[i].add(ib.availableBalances[token]);
        }
    }

    function distributionsLength() public view returns(uint256) {
        return distributions.length;
    }

    // == Internal functions of DefiModule
    function totalSupplyOfPTK() internal view returns(uint256) {
        return pToken().distributionTotalSupply();
    }

    function getPrefferableTokenForWithdraw(uint256 lAmount) internal returns(address){
        address[] memory tokens = registeredTokens();
        //Use simplest strategy: return first one with enough liquitdity
        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 balance = poolBalanceOf(tokens[i]);
            if (balance > lAmount) return tokens[i];
        }
        //If not found, just return first one
        return tokens[0];
    }

    function _createInitialDistribution() internal {
        assert(distributions.length == 0);
        uint256 totalPTK = 0; //totalSupplyOfPTK();
        distributions.push(Distribution(totalPTK));
        //Distribution storage d = distributions[distributions.length-1];
    }

    function _createDistributionIfReady() internal {
        if (now < nextDistributionTimestamp) return;
        _createDistribution();
    }

    function _createDistribution() internal {
        Distribution storage prev = distributions[distributions.length - 1]; //This is safe because _createInitialDistribution called in initialize.

        uint256 totalPTK = totalSupplyOfPTK();

        address[] memory tokens = registeredTokens();

        bool hasDistributions;
        uint256[] memory distrAmounts = new uint256[](tokens.length);
        uint256[] memory currBalances = new uint256[](tokens.length);

        for (uint256 i=0; i < tokens.length; i++) {
            address token = tokens[i];
            currBalances[i] = poolBalanceOf(token);
            distrAmounts[i] = calculateDistributionAmount(token, prev.balances[token], currBalances[i]);
            hasDistributions = hasDistributions || (distrAmounts[i] > 0);
        }

        if (!hasDistributions) return;

        distributions.push(Distribution(totalPTK));
        uint256 distributionIdx = distributions.length-1;
        Distribution storage d = distributions[distributionIdx];
        for (uint256 i=0; i < tokens.length; i++) {
            address token = tokens[i];
            d.amounts[token] = distrAmounts[i];
            d.balances[token] = currBalances[i];

            depositsSinceLastDistribution[token] = 0;
            withdrawalsSinceLastDistribution[token] = 0;

            if (distrAmounts[i] > 0){
                emit InvestmentDistributionCreated(distributionIdx, token, distrAmounts[i], currBalances[i], totalPTK);
            }
        }        

        nextDistributionTimestamp = now.sub(now % DISTRIBUTION_AGGREGATION_PERIOD).add(DISTRIBUTION_AGGREGATION_PERIOD);
    }

    function calculateDistributionAmount(address token, uint256 prevBalance, uint256 currentBalance) internal view returns(uint256) {
        // // This calculation expects that, without deposit/withdrawals, DAI balance can only be increased
        // // Such assumption may be wrong if underlying system (Compound) is compromised.
        // // In that case SafeMath will revert transaction and we will have to update our logic.
        // uint256 distributionAmount =
        //     currentBalance
        //     .add(withdrawalsSinceLastDistribution)
        //     .sub(depositsSinceLastDistribution)
        //     .sub(prevBalance);
        uint256 a = currentBalance.add(withdrawalsSinceLastDistribution[token]);
        uint256 b = depositsSinceLastDistribution[token].add(prevBalance);
        uint256 distributionAmount;
        if (a > b) {
            distributionAmount = a - b;
        }
        // else { //For some reason our balance on underlying system decreased (for example - on first deposit, because of rounding)
        //     distributionAmount = 0; //it is already 0
        // }
        return distributionAmount;
    }

    function _updateUserBalance(address account, uint256 toDistribution) internal {
        InvestmentBalance storage ib = balances[account];
        if (ib.ptkBalance == 0) return;

        uint256 fromDistribution = ib.nextDistribution;
        address[] memory tokens = registeredTokens();
        uint256[] memory interest = _calculateDistributedAmount(fromDistribution, toDistribution, ib.ptkBalance, tokens);
        ib.nextDistribution = toDistribution;
        for (uint256 i=0; i < tokens.length; i++) {
            address token = tokens[i];
            ib.availableBalances[token] = ib.availableBalances[token].add(interest[i]);
            emit InvestmentDistributionsClaimed(account, ib.ptkBalance, token, interest[i], fromDistribution, toDistribution);
        }
    }

    function _calculateDistributedAmount(uint256 fromDistribution, uint256 toDistribution, uint256 ptkBalance, address[] memory tokens) internal view returns(uint256[] memory) {
        assert(ptkBalance != 0); //This conditions should be checked in caller function
        uint256 next = fromDistribution;
        if (next == 0) next = 1; //skip initial distribution as it is always zero
        uint256[] memory totalInterest = new uint256[](tokens.length);
        while (next < toDistribution) {
            Distribution storage d = distributions[next];
            for (uint256 i=0; i < tokens.length; i++) {
                uint256 distrAmount = d.amounts[tokens[i]];
                totalInterest[i] = totalInterest[i].add(distrAmount.mul(ptkBalance).div(d.totalPTK)); 
            }
            next++;
        }
        return totalInterest;
    }

    function pToken() private view returns(IPToken){
        return IPToken(getModuleAddress(MODULE_PTOKEN));
    }
}