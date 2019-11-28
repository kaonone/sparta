pragma solidity ^0.5.12;

import "../../common/Base.sol";
import "../../token/pTokens/PToken.sol";
import "../../interfaces/curve/ICurveModule.sol";
import "./BondingCurve.sol";


//contract CurveModule is Base, ICurveModule, BondingCurve {
contract CurveModule is Base, BondingCurve {
    uint256 public constant CURVE_A = 1;
    uint256 public constant CURVE_B = 1;
    uint256 public constant WITHDRAW_FEE_PERCENT = 5;

    function initialize(address sender) public initializer {
        Base.initialize(sender);
        BondingCurve.initialize(CURVE_A, CURVE_B, WITHDRAW_FEE_PERCENT);
    }

}