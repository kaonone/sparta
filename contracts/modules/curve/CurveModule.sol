pragma solidity ^0.5.12;

import "../../common/Base.sol";
import "../../token/ptokens/pToken.sol";

contract CurveModule is Base {

    function initialize(address sender) public initializer {
        Base.initialize(sender);
    }


}