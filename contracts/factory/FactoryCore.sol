pragma solidity ^0.5.12;

import '../core/Core.sol';

library FactoryCore {

    function create(string memory _name, string memory _description) public returns (Core)
    {
        Core c = new Core();
        c.initialize(_name, _description);

        return c;
    }
}