pragma solidity ^0.5.12;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "../../utils/ISQRT.sol";

contract BondingCurve is Initializable  {
    using ISQRT for uint256;

    uint256 private constant PERCENT_DIVIDER = 100;
    // Original curve formula uses float numbers to represent amounts. 
    // In Solidity we convert them to integers, using ether to wei conversion. 
    // While we use sqrt() operation we should convert formula accordingly.
    uint256 private constant FIX = 10**18; 
    uint256 private constant FIX2 = 10**36;

    uint256 public curveA;
    uint256 public curveB;
    uint256 public withdrawFeePercent;

    /**
     * @notice Initialize curve parameters
     * @param _curveA Constabt A of a curve
     * @param _curveB Constant B of a curve
     * @param _withdrawFeePercent Withdraw fee, stored as a percent (multiplied by 100)
     */
    function initialize(uint256 _curveA, uint256 _curveB, uint256 _withdrawFeePercent) public initializer {
        curveA = _curveA;
        curveB = _curveB;
        withdrawFeePercent = _withdrawFeePercent;
    }

    /**
     * @notice Calculates amount of pTokens which should be minted/unlocked when liquidity added to pool
     * dx = f(A + Deposit) - f(A)
     * A - A is the volume of  total assets (liquid assets in Pool + debt commitments), 
     * Deposit is the size of the deposit, 
     * dx is the number of pTokens tokens received.
     * @param liquidAssets Liquid assets in Pool
     * @param debtCommitments Debt commitments
     * @param amount Amount to deposit
     * @return Amount of pTokens to mint/unlock
     */
    function calculateEnter(
        uint256 liquidAssets,
        uint256 debtCommitments,
        uint256 amount
    ) public view returns (uint256) {
        return curveFunction(liquidAssets+debtCommitments+amount) - curveFunction(liquidAssets+debtCommitments);
    }

    /**
     * @notice Calculates amount of pTokens which should be burned/locked when liquidity removed from pool
     * dx = (1+d)*(f(L) - f(L - Whidraw))
     * L is the volume of liquid assets
     * @param liquidAssets Liquid assets in Pool
     * @param amount Amount to whidraw
     * @return Amount of pTokens to burn/lock
     */
    function calculateExit(
        uint256 liquidAssets,
        uint256 amount
    ) public view returns (uint256) {
        uint256 fldiff = curveFunction(liquidAssets) - curveFunction(liquidAssets - amount);
        return (1*PERCENT_DIVIDER+withdrawFeePercent)*fldiff/PERCENT_DIVIDER;
    }

    /**
     * @notice Calculates value of Bonding Curve at a point s
     * @param s Point to calculate curve
     * @return Value of curve at s
     */
    function curveFunction(uint256 s) public view returns(uint256){
        return curve(curveA, curveB, s);
    }

    /**
     * @notice Bonding Curve function
     * Defined as: f(S) = [-a+sqrt(a^2+4bS)]/2, a>0, b>0
     * Fixed for Solidity as: curve(S) = (-(10^18) * a + sqrt((10^36) * (a^2) + 4 * (10^18) * b * S)) / 2
     * @param a Constant which defines curve
     * @param b Constant which defines curve
     * @param s Point used to calculate curve
     * @return Value of curve at point s
     */
    function curve(uint256 a, uint256 b, uint256 s) private pure returns(uint256){
        uint256 d = FIX2 * (a*a) + 4 * FIX * b * s;
        return (d.sqrt() - FIX*a)/2;
    }


}