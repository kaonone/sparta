pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../../interfaces/curve/IFundsModule.sol";
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
    }

    Distribution[] public distributions;                    // Array of all distributions
    uint256 public nextDistributionTimestamp;               //Timestamp when next distribuition should be fired
    uint256 depositsSinceLastDistribution;                  // Amount DAI deposited since last distribution;
    uint256 withdrawalsSinceLastDistribution;               // Amount DAI withdrawn since last distribution;

    function initialize(address _pool) public initializer {
        Module.initialize(_pool);
        DefiOperatorRole.initialize(_msgSender());
        _createInitialDistribution();
    }

    // == Public functions
    function createDistributionIfReady() public {
        _createDistributionIfReady();
    }

    function handleDeposit(address sender, uint256 amount) public onlyDefiOperator {
        _createDistributionIfReady();
        depositsSinceLastDistribution = depositsSinceLastDistribution.add(amount);
        handleDepositInternal(sender, amount);
        emit Deposit(amount);
    }

    function withdraw(address beneficiary, uint256 amount) public onlyDefiOperator {
        _createDistributionIfReady();
        withdrawalsSinceLastDistribution = withdrawalsSinceLastDistribution.add(amount);
        withdrawInternal(beneficiary, amount);
        emit Withdraw(amount);
    }

    /**
     * @notice Full DAI balance of the pool. Useful to transfer all funds to another module.
     * @dev Note, this call MAY CHANGE state  (internal DAI balance in Compound, for example)
     */
    function poolBalance() public returns(uint256) {
        return poolBalanceOfDAI();
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
        (uint256 poolDAI, ) = initialBalances();
        distributions.push(Distribution({
            amount:0,
            balance: poolDAI
        }));
    }

    function _createDistributionIfReady() internal {
        if (now < nextDistributionTimestamp) return;
        _createDistribution();
    }

    function _createDistribution() internal {
        Distribution storage prev = distributions[distributions.length - 1]; //This is safe because _createInitialDistribution called in initialize.
        uint256 currentBalanceOfDAI = poolBalanceOfDAI();

        uint256 a = currentBalanceOfDAI.add(withdrawalsSinceLastDistribution);
        uint256 b = depositsSinceLastDistribution.add(prev.balance);
        uint256 distributionAmount;
        if (a > b) {
            distributionAmount = a - b;
        }
        if (distributionAmount == 0) return;

        distributions.push(Distribution({
            amount:distributionAmount,
            balance: currentBalanceOfDAI
        }));
        depositsSinceLastDistribution = 0;
        withdrawalsSinceLastDistribution = 0;
        nextDistributionTimestamp = now.sub(now % DISTRIBUTION_AGGREGATION_PERIOD).add(DISTRIBUTION_AGGREGATION_PERIOD);

        //Notify FundsModule about new liquidity and distribute PTK
        IFundsModule fundsModule = fundsModule();
        uint256 pAmount = fundsModule.distributeLInterest(distributionAmount);
        emit InvestmentDistributionCreated(distributionAmount, currentBalanceOfDAI, pAmount);
    }

    function fundsModule() internal view returns(IFundsModule) {
        return IFundsModule(getModuleAddress(MODULE_FUNDS));
    }

}