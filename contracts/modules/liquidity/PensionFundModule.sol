pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../../interfaces/token/IPToken.sol";
import "./LiquidityModule.sol";

/**
 * @notice PensionFundLiquidityModule is a modification of standart
 * LiquidityModule which changes withdrawal rules according to pension plan.
 * Pension plan has a specific duration, and partial withdrawals allowed only 
 * after end of its deposit period.
 * Before end of this period user only allowed to cancel his plan with a penalty, 
 * proportional to the time till end of this period.
 * After the end of deposit period plan user is allowed to withraw during withdrawal
 * period, proportionally to the time till end of this period.
 */
contract PensionFundModule is LiquidityModule {
    using SafeMath for uint256;

    uint256 public constant ANNUAL_SECONDS = 365*24*60*60+(24*60*60/4);  // Seconds in a year + 1/4 day to compensate leap years
    uint256 private constant MULTIPLIER = 1e18;

    struct PensionPlanSettings {
        uint256 depositPeriodDuration;      // Duration of deposit period
        uint256 minPenalty;                 // Min penalty (if withdraw full amount just before deposit period ends or during withdraw period)
        uint256 maxPenalty;                 // Max penalty (if withdraw rigt after deposit). Calculated as pBalance*maxPenalty/MULTIPLIER
        uint256 withdrawPeriodDuration;     // Duration of withdraw period
        uint256 initalWithdrawAllowance;    // How much user can withdraw right after deposit period ends. Calculated as pBalance*initalWithdrawAllowance/MULTIPLIER
    }

    struct PensionPlan {
        uint256 created;    // Timestamp of first deposit, which created this plan
        uint256 pWithdrawn; // pTokens already withdawn from this plan
    }

    PensionPlanSettings public planSettings;        // Settings of all pension plans

    mapping(address => PensionPlan) public plans;   // Attributes of pension plan per user

    function initialize(address _pool) public initializer {
        LiquidityModule.initialize(_pool);
    }

    /**
     * @notice Deposit amount of lToken and mint pTokens
     * @param lAmount Amount of liquid tokens to invest
     * @param pAmountMin Minimal amout of pTokens suitable for sender
     */ 
    function deposit(uint256 lAmount, uint256 pAmountMin) public /*operationAllowed(IAccessModule.Operation.Deposit)*/ {
        PensionPlan storage plan  = plans[_msgSender()];
        if (plan.created == 0){
            //create new plan
            plan.created = now;
        }
        uint256 planEnd = plan.created.add(planSettings.depositPeriodDuration).add(planSettings.withdrawPeriodDuration);
        require(planEnd < now, "PensionFundLiquidityModule: plan ended");
        super.deposit(lAmount, pAmountMin);
    }

    /**
     * @notice Withdraw amount of lToken and burn pTokens
     * @param pAmount Amount of pTokens to send (this amount does not include pTokens used to pay interest)
     * @param lAmountMin Minimal amount of liquid tokens to withdraw
     */
    function withdraw(uint256 pAmount, uint256 lAmountMin) public /*operationAllowed(IAccessModule.Operation.Withdraw)*/ {
        address user = _msgSender();
        PensionPlan storage plan  = plans[user];
        require(plan.created != 0, "PensionFundLiquidityModule: plan not found");
        uint256 pBalance = pToken().distributionBalanceOf(user);
        uint256 allownce = _withdrawLimit(plan, pBalance);
        require(allownce >= pAmount, "PensionFundLiquidityModule: not enough withdraw allowance");
        plan.pWithdrawn = plan.pWithdrawn.add(pAmount);
        super.withdraw(pAmount, lAmountMin);
        
        //Additional balance request required because of possible distributions which could be claimed during withdraw
        uint256 pLeft = pToken().distributionBalanceOf(user); 
        if (pLeft == 0) {
            plan.created = 0;   //Close plan, so that user can create a new one
        }
    }

    /**
     * @notice Close plan withdrawing all available lTokens
     * @param lAmountMin Minimal amount of liquid tokens to withdraw
     */
    function closePlan(uint256 lAmountMin) public operationAllowed(IAccessModule.Operation.Withdraw) {
        address user = _msgSender();
        PensionPlan storage plan  = plans[user];
        require(plan.created != 0, "PensionFundLiquidityModule: plan not found");
        IPToken pToken = pToken();
        pToken.claimDistributions(user);    // We need to claim distributions to know full user balance
        uint256 pBalance = pToken.distributionBalanceOf(user);
        uint256 pWithdrawableBalance = pToken.balanceOf(user);
        require(pBalance == pWithdrawableBalance, "PensionFundLiquidityModule: has locked PTK");   //Some funds may be locked in proposals
        uint256 pPenalty = _pPenalty(plan, pBalance);
        uint256 pRefund = pBalance.sub(pPenalty);
        
        if (pRefund > 0) {
            super.withdraw(pRefund, lAmountMin);
        } else {
            require(lAmountMin == 0, "PensionFundLiquidityModule: lAmountMin prevents zero refund");
        }
        if (pPenalty > 0) {
            IFundsModule fundsModule = fundsModule();
            fundsModule.burnPTokens(user, pPenalty);
            fundsModule.distributePTokens(pPenalty);
        }

        // Check balance again to prevent possible actions during lToken transfer
        pBalance = pToken.distributionBalanceOf(user);
        require(pBalance == 0, "PensionFundLiquidityModule: not zero balance after full withdraw");
        plan.created = 0; 
    }

    function withdrawForRepay(address, uint256) public {
        revert("PensionFundLiquidityModule: operation not supported");
    }

    /**
     * @notice Calculates amount of pToken user can withdraw during withdraw period
     * @dev This calculation does not count possible not-yet-claimed distributions
     */
    function withdrawLimit(address user) public view returns(uint256) {
        PensionPlan storage plan  = plans[user];
        require(plan.created != 0, "PensionFundLiquidityModule: plan not found");
        uint256 pBalance = pToken().distributionBalanceOf(user);
        return _withdrawLimit(plan, pBalance);
    }

    /**
     * @notice Calculates amount of pToken user can withdraw during deposit period on plan close
     * @dev This calculation does not count possible not-yet-claimed distributions
     */
    function pRefund(address user) public view returns(uint256) {
        PensionPlan storage plan  = plans[user];
        require(plan.created != 0, "PensionFundLiquidityModule: plan not found");
        uint256 pBalance = pToken().distributionBalanceOf(user);
        uint256 pPenalty = _pPenalty(plan, pBalance);
        return pBalance.sub(pPenalty);
    }

    function _withdrawLimit(PensionPlan storage plan, uint256 pBalance) internal view returns(uint256) {
        uint256 withdrawStart = plan.created.add(planSettings.depositPeriodDuration);
        if (withdrawStart < now) return 0;
        uint256 sinceWithdrawStart = now - withdrawStart;
        if (sinceWithdrawStart >= planSettings.withdrawPeriodDuration) {
            return pBalance;
        }
        uint256 pInitialAllowance = pBalance.mul(planSettings.initalWithdrawAllowance).div(MULTIPLIER);
        uint256 pTimeAllowance = pBalance.sub(pInitialAllowance).mul(sinceWithdrawStart).div(planSettings.withdrawPeriodDuration);
        uint256 fullAllowance = pInitialAllowance.add(pTimeAllowance);
        if (fullAllowance <= plan.pWithdrawn) return 0;
        return fullAllowance - plan.pWithdrawn;
    }

    function _pPenalty(PensionPlan storage plan, uint256 pBalance) internal view returns(uint256) {
        uint256 withdrawStart = plan.created.add(planSettings.depositPeriodDuration);
        uint256 planEnd = withdrawStart.add(planSettings.withdrawPeriodDuration);
        if (now >= planEnd) {
            //After end ow withdraw period - can close plan without penalty            
            return 0;
        }
        uint256 pPenalty;
        if (now < withdrawStart){
            //During deposit period
            uint256 tillWithdrawStart = withdrawStart - now;
            uint256 pMinPenalty = pBalance.mul(planSettings.minPenalty).div(MULTIPLIER);
            uint256 pMaxPenalty = pBalance.mul(planSettings.maxPenalty).div(MULTIPLIER);
            pPenalty = pMinPenalty.add(pMaxPenalty.sub(pMinPenalty).mul(tillWithdrawStart).div(planSettings.depositPeriodDuration));
        } else {
            //During withdraw period
            pPenalty = pBalance.mul(planSettings.minPenalty).div(MULTIPLIER);
        }
        return pPenalty;
    }

    function fundsModule() internal view returns(IFundsModule) {
        return IFundsModule(getModuleAddress(MODULE_FUNDS));
    }

    function pToken() private view returns(IPToken){
        return IPToken(getModuleAddress(MODULE_PTOKEN));
    }
}