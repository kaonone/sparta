pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "../../utils/ISQRT.sol";

/* solhint-disable func-order */
contract BondingCurve is Initializable  {
    using ISQRT for uint256;
    using SafeMath for uint256;

    // Original curve formula uses float numbers to represent amounts. 
    // In Solidity we convert them to integers, using ether to wei conversion. 
    // While we use sqrt() operation we should convert formula accordingly.
    uint256 private constant FIX = 10**18; 
    uint256 private constant FIX2 = 10**36;

    uint256 public constant LIQUIDITY_WEIGHT_DIVIDER = 10**3;

    uint256 public curveA;
    uint256 public curveB;
    uint256 public liquidityWeightEnter;
    uint256 public debtWeightEnter;
    uint256 public liquidityWeightExit;
    uint256 public debtWeightExit;

    /**
     * @notice Initialize curve parameters
     * @param _curveA Constabt A of a curve
     * @param _curveB Constant B of a curve
     * @param _liquidityWeightEnter Weight of available liquidity in total pool liquidity used for entering pool
     * @param _debtWeightEnter Weight of debts in total pool liquidity used for entering pool
     * @param _liquidityWeightEnter Weight of available liquidity in total pool liquidity used for exiting pool
     * @param _debtWeightEnter Weight of debts in total pool liquidity used for exiting pool
     */
    function initialize(
        uint256 _curveA, 
        uint256 _curveB, 
        uint256 _liquidityWeightEnter, 
        uint256 _debtWeightEnter,
        uint256 _liquidityWeightExit, 
        uint256 _debtWeightExit
    ) public initializer {
        _setCurveParams(_curveA, _curveB, _liquidityWeightEnter, _debtWeightEnter, _liquidityWeightExit, _debtWeightExit);
    }

    function _setCurveParams(
        uint256 _curveA, 
        uint256 _curveB, 
        uint256 _liquidityWeightEnter, 
        uint256 _debtWeightEnter,
        uint256 _liquidityWeightExit, 
        uint256 _debtWeightExit
    ) internal {
        curveA = _curveA;
        curveB = _curveB;
        liquidityWeightEnter = _liquidityWeightEnter;
        debtWeightEnter = _debtWeightEnter;
        liquidityWeightExit = _liquidityWeightExit;
        debtWeightExit = _debtWeightExit;
    }

    /**
     * @notice Calculates amount of pTokens which should be minted/unlocked when liquidity added to pool
     * dx = f(A + Deposit) - f(A)
     * A - A is the volume of  total assets (liquid assets in Pool + debt commitments, taken with their weight coefficients)
     * Deposit is the size of the deposit, 
     * dx is the number of pTokens tokens received.
     * @param liquidAssets Liquid assets in Pool
     * @param debtCommitments Debt commitments
     * @param lAmount Amount of liquidTokens to deposit
     * @return Amount of pTokens to mint/unlock
     */
    function calculateEnter(
        uint256 liquidAssets,
        uint256 debtCommitments,
        uint256 lAmount
    ) public view returns (uint256) {
        uint256 liquidity = liquidAssets.mul(liquidityWeightEnter).add(debtCommitments.mul(debtWeightEnter)).div(LIQUIDITY_WEIGHT_DIVIDER);
        return curveFunction(liquidity.add(lAmount)).sub(curveFunction(liquidity));
    }

    /**
     * @notice Calculates amount of pTokens which should be burned/locked when liquidity removed from pool
     * dx = f(L) - f(L - Whidraw)
     * L - L is the volume of  total assets (liquid assets in Pool + debt commitments, taken with their weight coefficients)
     * @param liquidAssets Liquid assets in Pool
     * @param debtCommitments Debt commitments
     * @param lAmount Amount of liquid tokens to withdraw (full: sum of withdrawU and withdrawP)
     * @return Amount of pTokens to burn/lock
     */
    function calculateExit(
        uint256 liquidAssets,
        uint256 debtCommitments,
        uint256 lAmount
    ) public view returns (uint256) {
        uint256 liquidity = liquidAssets.mul(liquidityWeightExit).add(debtCommitments.mul(debtWeightExit)).div(LIQUIDITY_WEIGHT_DIVIDER);
        uint256 fL = curveFunction(liquidity);
        uint256 fLW = curveFunction(liquidity.sub(lAmount));
        return fL.sub(fLW);
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
     * @param debtCommitments Debt commitments
     * @param pAmount Amount of pTokens to withdraw
     * @return Amount of liquid tokens to withdraw
     */
    function calculateExitInverse(
        uint256 liquidAssets,
        uint256 debtCommitments,
        uint256 pAmount
    ) public view returns (uint256) {
        uint256 liquidity = liquidAssets.mul(liquidityWeightExit).add(debtCommitments.mul(debtWeightExit)).div(LIQUIDITY_WEIGHT_DIVIDER);
        uint256 x = curveFunction(liquidity);
        uint256 pdiff = x.sub(pAmount);
        uint256 ldiff = inverseCurveFunction(pdiff);
        assert(liquidity >= ldiff);
        return liquidity.sub(ldiff);
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
     * @notice Calculates inversed value of Bonding Curve at a point x
     * @param x Point to calculate curve
     * @return Value of curve at s
     */
    function inverseCurveFunction(uint256 x) public view returns(uint256){
        return inverseCurve(curveA, curveB, x);
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
        //uint256 d = FIX2 * (a*a) + 4 * FIX * b * s;
        //return (d.sqrt() - FIX*a)/2;
        uint256 d = FIX2.mul(a).mul(a).add(FIX.mul(4).mul(b).mul(s));
        return d.sqrt().sub(FIX.mul(a)).div(2);
    }

    /**
     * @notice Bonding Curve function
     * S = g(x)=(x^2+ax)/b
     */
    function inverseCurve(uint256 a, uint256 b, uint256 x) private pure returns(uint256){
        //return (x*x + FIX*a*x)/FIX*b;
        return x.mul(x).add(FIX.mul(a).mul(x)).div(FIX.mul(b));
    }

}