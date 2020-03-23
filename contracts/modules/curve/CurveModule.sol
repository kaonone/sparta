pragma solidity ^0.5.12;

import "../../common/Module.sol";
import "../../token/pTokens/PToken.sol";
import "../../interfaces/curve/ICurveModule.sol";
import "./BondingCurve.sol";


contract CurveModule is Module, ICurveModule, BondingCurve {
    uint256 private constant DEFAULT_CURVE_A = 1*FIX;
    uint256 private constant DEFAULT_CURVE_B = 1*FIX;

    uint256 private constant DEFAULT_WITHDRAW_FEE_PERCENT = 0; //0 used for start, normal will be 5
    uint256 public constant PERCENT_DIVIDER = 100;

    uint256 public withdrawFeePercent;

    function initialize(address _pool) public initializer {
        Module.initialize(_pool);
        BondingCurve.initialize(DEFAULT_CURVE_A, DEFAULT_CURVE_B);
        setWithdrawFee(DEFAULT_WITHDRAW_FEE_PERCENT);
    }

    /**
     * @notice Set withdraw fee
     * @param _withdrawFeePercent Withdraw fee, stored as a percent (multiplied by PERCENT_DIVIDER)
     */
    function setWithdrawFee(uint256 _withdrawFeePercent) public onlyOwner {
        require(_withdrawFeePercent <= PERCENT_DIVIDER, "CurveModule: _withdrawFeePercent is too high");
        withdrawFeePercent = _withdrawFeePercent;
    }

    function setCurveParams(uint256 _curveA, uint256 _curveB) public onlyOwner {
        _setCurveParams(_curveA, _curveB);
    }

    /**
     * @notice Calculates amount of liquid tokens one can withdraw from the pool when pTokens are burned/locked
     * Withdraw = L-g(x-dx)
     * x = f(L)
     * dx - amount of pTokens taken from user
     * Withdraw: total amount of liquid tokens to withdraw.
     * WithdrawU = Withdraw*(1-d) : amount of liquid tokens which should be sent to user
     * WithdrawP = Withdraw*d     : amount of liquid tokens which should be sent to the pool owners.
     * @param liquidAssets Liquid assets in Pool
     * @param pAmount Amount of pTokens to withdraw
     * @return Amount of liquid tokens to withdraw: total, for user, for pool owners
     */
    function calculateExitInverseWithFee(
        uint256 liquidAssets,
        uint256 pAmount
    ) public view returns (uint256 withdraw, uint256 withdrawU, uint256 withdrawP) {
        withdraw = BondingCurve.calculateExitInverse(liquidAssets, pAmount);
        //withdrawU = withdraw*(1*PERCENT_DIVIDER-withdrawFeePercent)/PERCENT_DIVIDER;
        //withdrawP = withdraw*withdrawFeePercent/PERCENT_DIVIDER;
        withdrawP = withdraw.mul(withdrawFeePercent).div(PERCENT_DIVIDER);
        withdrawU = withdraw.sub(withdrawP);
    }

    /**
     * @notice Calculates amount of pTokens which should be burned/locked when liquidity removed from pool
     * @param liquidAssets Liquid assets in Pool
     * @param lAmount Amount of liquid tokens beeing withdrawn. Does NOT include fee = withdrawU
     * @return Amount of pTokens to burn/lock
     */
    function calculateExitWithFee(uint256 liquidAssets, uint256 lAmount) public view returns(uint256){
        uint256 withdraw = lAmount.mul(PERCENT_DIVIDER).div(PERCENT_DIVIDER.sub(withdrawFeePercent));
        return calculateExit(liquidAssets, withdraw);
    }

    /**
     * @notice Calculates lAmount to be taken as fee upon withdraw
     * @param lAmount Amount of liquid tokens beeing withdrawn. Does NOT include fee
     * @return Amount of liquid tokens which will be additionally taken as a pool fee
     */
    function calculateExitFee(uint256 lAmount) public view returns(uint256){
        return lAmount.mul(withdrawFeePercent).div(PERCENT_DIVIDER.sub(withdrawFeePercent));        
    }
}