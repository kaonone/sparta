pragma solidity ^0.5.0;

import "../factory/Factory.sol";
import "../factory/FactoryCore.sol";

contract DaoFactory is Factory {
    function create(string memory _name, string memory _description)  public returns (address) {

        Core dao = FactoryCore.create(_name, _description);
        getContractsOf[msg.sender].push(address(dao));
        emit Builded(msg.sender, address(dao));

        return address(dao);
    }
}
