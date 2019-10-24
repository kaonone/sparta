pragma solidity ^0.5.12;

import "../common/Base.sol";

contract Factory is Base {

    /**
     * @dev this event emitted for every builded contract
     */
    event Builded(address indexed client, address indexed instance);

    /* Addresses builded contracts at sender */
    mapping(address => address[]) public getContractsOf;


    function initialize() public initializer {
        Base.initialize();
    }

    /**
    * @dev Get last address
    * @return last address contract
    */
    function getLastContract() public view returns (address) {
        address[] storage sender_contracts = getContractsOf[msg.sender];
        return sender_contracts[sender_contracts.length - 1];
    }
}
