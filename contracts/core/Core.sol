pragma solidity ^0.5.0;

import "../common/Base.sol";
import "../interfaces/core/CoreInterface.sol";

contract Core is CoreInterface, Base {

    /* Short description */
    string  public name;
    string  public description;
    address public founder;


    /* Module constant mapping */
    mapping(bytes32 => bool) is_constant;

    /**
     * @dev Contract ABI storage
     *      the contract interface contains source URI
     */
    mapping(address => string) public abiOf;

    /**
     * @dev DAO constructor
     * @param _name is a DAO name
     * @param _description is a short DAO description
     */

    function initialize(string memory _name, string memory _description) public initializer {

        Base.initialize();

        name         = _name;
        description  = _description;
        founder      = msg.sender;
    }
}
