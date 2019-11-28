pragma solidity ^0.5.12;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "../../utils/ISQRT.sol";

contract BondingCurve is Initializable  {
    using ISQRT for uint256;

    uint256 public constant CURVE_A = 1;
    uint256 public constant CURVE_B = 1;
    uint256 public constant WITHDRAW_FEE_PERCENT = 5;
    uint256 private constant PERCENT_DIVIDER = 100;

    /**
     * dx = f(A + Deposit) - f(A)
     * A - A is the volume of  total assets (liquid assets in Pool + debt commitments), 
     * Deposit is the size of the deposit, 
     * dx is the number of pTokens tokens received.
     */
    function calculateEnter(
        uint256 liquidAssets,
        uint256 debtCommitments,
        uint256 amount
    ) external pure returns (uint256) {
        return curveFunction(liquidAssets+debtCommitments+amount) - curveFunction(liquidAssets);
    }

    /**
     * dx = (1+d)*(f(L) - f(L - Whidraw))
     * L is the volume of liquid assets
     */
    function calculateExit(
        uint256 liquidAssets,
        uint256 amount
    ) external pure returns (uint256) {
        uint256 fldiff = curveFunction(liquidAssets) - curveFunction(liquidAssets - amount);
        return (1*PERCENT_DIVIDER+WITHDRAW_FEE_PERCENT)*fldiff/PERCENT_DIVIDER;
    }

    function curveFunction(uint256 s) public pure returns(uint256){
        return curve(CURVE_A, CURVE_B, s);
    }

    /**
     * @notice Bonding Curve function
     * Defined as: f(S) = [-a+sqrt(a^2+4bS)]/2, a>0, b>0
     * @param a Constant which defines curve
     * @param b Constant which defines curve
     * @param s Value used to calculate curve
     * @return value of curve at point s
     */
    function curve(uint256 a, uint256 b, uint256 s) private pure returns(uint256){
        //TODO add asserts to check overflow
        uint256 d = a*a + 4*b*s;
        return (d.sqrt() - a)/2;
    }
}