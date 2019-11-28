pragma solidity ^0.5.12;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "../../utils/ISQRT.sol";

contract BondingCurve is Initializable  {
    using ISQRT for uint256;

    uint256 public constant CURVE_A = 1;
    uint256 public constant CURVE_B = 1;
    uint256 public constant WITHDRAW_FEE_PERCENT = 5;
    uint256 private constant PERCENT_DIVIDER = 100;
    uint256 private constant SQRT_DIMENSION_FIX = 10**9; //Original curve formula uses float numbers to represent amounts. In Solidity we convert them to integers, using ether to wei conversion. While we use sqrt() operation we should convert formula accordingly.
    uint256 private constant SDF0 = 10**9;
    uint256 private constant SDF = 10**18;
    uint256 private constant SDF2 = 10**36;

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
        return curveFunction(liquidAssets+debtCommitments+amount) - curveFunction(liquidAssets+debtCommitments);
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
     * Fixed for Solidity as: curve(S) = (-(10^18) * a + sqrt((10^36) * (a^2) + 4 * (10^18) * b * S)) / 2
     * @param a Constant which defines curve
     * @param b Constant which defines curve
     * @param s Value used to calculate curve
     * @return value of curve at point s
     */
    function curve(uint256 a, uint256 b, uint256 s) private pure returns(uint256){
        //f(s) = (-(10^18) * a + sqrt((10^36) * (a^2) + 4 * (10^18) * b * S)) / 2
        // d = SDF2 * (a*a) + 4 * (SDF) * b * S
        // f(s) = (sqrt(d) - (SDF) * a  ) / 2

        uint256 d = SDF2 * (a*a) + 4 * SDF * b * s;
        return (d.sqrt() - SDF*a)/2;
    }

    /**
     * @notice Bonding Curve function
     * Defined as: f(S) = [-a+sqrt(a^2+4bS)]/2, a>0, b>0
     * Fixed for Solidity as: f(S) = (10^9) * (-(10^9) * a + sqrt((10^18) * (a^2) + 4*b*S)) / 2
     * @param a Constant which defines curve
     * @param b Constant which defines curve
     * @param s Value used to calculate curve
     * @return value of curve at point s
     */
    function curveOld(uint256 a, uint256 b, uint256 s) private pure returns(uint256){
        //TODO add asserts to check overflow
        uint256 d = SQRT_DIMENSION_FIX*SQRT_DIMENSION_FIX*a*a + 4*b*s;
        return SQRT_DIMENSION_FIX*((d.sqrt() - SQRT_DIMENSION_FIX*a)/2);
    }


}