pragma solidity ^0.5.12;

import "../../common/Base.sol";
import "../../token/ptokens/PToken.sol";
import "./BondingCurve.sol";

contract CurveModule is Base, BondingCurve {

    function initialize(address sender) public initializer {
        Base.initialize(sender);
    }




}