pragma solidity ^0.5.12;

import "../core/Pool.sol";

library FactoryCore {

    function create(string memory _name, string memory _description) internal returns (Pool)
    {
        Pool c = new Pool();
        c.initialize(msg.sender);
        c.setMetadata(_name, _description);
        return c;
    }
}