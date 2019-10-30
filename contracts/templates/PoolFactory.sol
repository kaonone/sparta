pragma solidity ^0.5.12;

import "../factory/Factory.sol";
import "../factory/FactoryCore.sol";

contract PoolFactory is Factory {
    function create(string memory _name, string memory _description)  public returns (address) {

        Core pool = FactoryCore.create(_name, _description);
        getContractsOf[msg.sender].push(address(pool));
        emit Builded(msg.sender, address(pool));

        return address(pool);
    }
}
