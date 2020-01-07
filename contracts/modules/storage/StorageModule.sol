pragma solidity ^0.5.12;

import "../../common/Module.sol";

/**
 * @title Generic storage for data which should persist between implementations
 * This torage uses key=>value model to provide database-like storage.
 * Keys are defined as keccak256(module_name + variable_name) to allow independent keys for each module.
 * Also write to a module's key is only allowed for that module
 */
contract StorageModule is Module {
    /* solhint-disable func-order, separate-by-one-line-in-contract */

    //Mappings for all base types
    mapping(bytes32 => bool) internal boolStorage;
    mapping(bytes32 => int256) internal intStorage;
    mapping(bytes32 => uint256) internal uintStorage;
    mapping(bytes32 => bytes) internal bytesStorage;
    mapping(bytes32 => string) internal stringStorage;

    modifier onlyModule(string memory module){
        address moduleAddress = getModuleAddress(module);
        //require(moduleAddress != address(0), "StorageModule: Module not found");
        require(moduleAddress == _msgSender(), "StorageModule: Sender does not match module name");
        _;
    }

    function initialize(address _pool) public initializer {
        Module.initialize(_pool);
    }

    function getBool(string calldata module, string calldata name) view external returns(bool){
        return boolStorage[key(module, name)];
    }
    function setBool(string calldata module, string calldata name, bool value) onlyModule(module) external {
        boolStorage[key(module, name)] = value;
    }

    function getInt256(string calldata module, string calldata name) view external returns(int256){
        return intStorage[key(module, name)];
    }
    function setInt256(string calldata module, string calldata name, int256 value) onlyModule(module) external {
        intStorage[key(module, name)] = value;
    }

    function getUint256(string calldata module, string calldata name) view external returns(uint256){
        return uintStorage[key(module, name)];
    }
    function setUint256(string calldata module, string calldata name, uint256 value) onlyModule(module) external {
        uintStorage[key(module, name)] = value;
    }

    function getBytes(string calldata module, string calldata name) view external returns(bytes memory){
        return bytesStorage[key(module, name)];
    }
    function setBytes(string calldata module, string calldata name, bytes calldata value) onlyModule(module) external {
        bytesStorage[key(module, name)] = value;
    }

    function getString(string calldata module, string calldata name) view external returns(string memory){
        return stringStorage[key(module, name)];
    }
    function setString(string calldata module, string calldata name, string calldata value) onlyModule(module) external {
        stringStorage[key(module, name)] = value;
    }

    function key(string memory module, string memory name) pure public returns(bytes32){
        return keccak256(abi.encodePacked(module, name));
    }
}