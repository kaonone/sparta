pragma solidity ^0.5.12;

import "../../common/Module.sol";
import "../../token/pTokens/PToken.sol";
import "../../interfaces/curve/ICurveModule.sol";
import "./BondingCurve.sol";


contract CurveModule is Module, ICurveModule, BondingCurve {
    uint256 private constant DEFAULT_CURVE_A = 1;
    uint256 private constant DEFAULT_CURVE_B = 1;

    uint256 private constant DEFAULT_WITHDRAW_FEE_PERCENT = 5;
    uint256 public constant PERCENT_DIVIDER = 100;

    uint256 withdrawFeePercent;

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
     * WithdrawU = Withdraw*(1-d)
     * WithdrawP = Withdraw*d
     * Withdraw - amount of liquid token which should be sent to user
     * @param liquidAssets Liquid assets in Pool
     * @param pAmount Amount of pTokens to withdraw
     * @return Amount of liquid tokens to withdraw: total, for user, for pool
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
}