pragma solidity ^0.5.12;

import "../../common/Module.sol";
import "../../token/pTokens/PToken.sol";
import "../../interfaces/curve/ICurveModule.sol";
import "./BondingCurve.sol";


contract CurveModule is Module, ICurveModule, BondingCurve {
    uint256 public constant CURVE_A = 1;
    uint256 public constant CURVE_B = 1;
    uint256 public constant WITHDRAW_FEE_PERCENT = 5;

    function initialize(address sender, address _pool) public initializer {
        Module.initialize(sender, _pool);
        BondingCurve.initialize(CURVE_A, CURVE_B, WITHDRAW_FEE_PERCENT);
    }

}