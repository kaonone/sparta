pragma solidity ^0.5.12;

import "./DefiModuleBase.sol";

contract CompoundModule is DefiModuleBase {

    function initialize(address _pool) public initializer {
        DefiModuleBase.initialize(_pool);
    }

    function depositInternal(uint256 amount) internal {
    }

    function withdrawInternal(uint256 amount) internal {
    }

    function balanceOfDAI() internal view returns(uint256) {
    }

    function totalSupplyOfPTK() internal view returns(uint256) {
    }
}