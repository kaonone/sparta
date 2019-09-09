pragma solidity ^0.5.0;

import "../common/Base.sol";
import "../interfaces/core/CoreInterface.sol";
import "../utils/AddressMap.sol";

contract Core is CoreInterface, Base {

    /* Short description */
    string  public name;
    string  public description;
    address public founder;

    /* Modules map */
    AddressMap.Data modules;

    using AddressList for AddressList.Data;
    using AddressMap for AddressMap.Data;

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


    /**
     * @dev Fast module exist check
     * @param _module is a module address
     * @return `true` wnen core contains module
     */
    function contains(address _module) public view returns (bool)
    {
        return modules.items.contains(_module);
    }

    /**
     * @dev Modules counter
     * @return count of modules in core
     */
    function size() public view returns (uint)
    {
        return modules.size();
    }

    /**
     * @dev Check for module have permanent name
     * @param _name is a module name
     * @return `true` when module have permanent name
     */
    function isConstant(string memory _name) public view returns (bool)
    {
        return is_constant[keccak256(abi.encodePacked(_name))];
    }

    /**
     * @dev Get module by name
     * @param _name is module name
     * @return module address
     */
    function get(string memory _name) public view returns (address)
    {
        return modules.get(_name);
    }

    /**
     * @dev Get module name by address
     * @param _module is a module address
     * @return module name
     */
    function getName(address _module) public view returns (string memory)
    {
        return modules.keyOf[_module];
    }

    /**
     * @dev Get first module
     * @return first address
     */
    function first() public view returns (address)
    {
        return modules.items.head;
    }

    /**
     * @dev Get next module
     * @param _current is an current address
     * @return next address
     */
    function next(address _current) public view returns (address)
    {
        return modules.items.next(_current);
    }

    /**
     * @dev Set new module for given name
     * @param _name infrastructure node name
     * @param _module infrastructure node address
     * @param _abi node interface URI
     * @param _constant have a `true` value when you create permanent name of module
     */
    function set(string memory _name, address _module, string  memory _abi, bool _constant) public onlyOwner {


        require(isConstant(_name), "is not module name");

        // Notify
        if (modules.get(_name) != ZERO_ADDRESS)
            emit ModuleReplaced(modules.get(_name), _module);
        else
            emit ModuleAdded(_module);

        // Set module in the map
        modules.set(_name, _module);

        // Register module abi
        abiOf[_module] = _abi;

        // Register constant flag
        is_constant[keccak256(abi.encodePacked(_name))] = _constant;
    }

    /**
     * @dev Remove module by name
     * @param _name module name
     */
    function remove(string memory _name)  public onlyOwner {

        require(isConstant(_name), "is not module name");

        // Notify
        emit ModuleRemoved(modules.get(_name));

        // Remove module
        modules.remove(_name);
    }
}
