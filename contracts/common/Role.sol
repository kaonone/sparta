pragma solidity ^0.5.12;

import "../modules/storage/StorageModule.sol";
import "./Module.sol";

contract Role is Module {
    string constant private ROLE_PREFIX = "role_";

    /**
     * @dev Give an account access to this role.
     */
    function addRole(string memory role, address account) internal {
        require(!hasRole(role, account), "Role: account already has role");
        storageModule().setBool(thisModuleName(), roleKey(role, account), true);
    }

    /**
     * @dev Remove an account's access to this role.
     */
    function removeRole(string memory role, address account) internal {
        require(hasRole(role, account), "Role: account does not have role");
        storageModule().setBool(thisModuleName(), roleKey(role, account), false);
    }

    /**
     * @dev Check if an account has this role.
     * @return bool
     */
    function hasRole(string memory role, address account) internal view returns (bool) {
        require(account != address(0), "Role: account is the zero address");
        return storageModule().getBool(thisModuleName(), roleKey(role, account));
    }

    function thisModuleName() view internal returns(string memory);

    function storageModule() private view returns(StorageModule) {
        address s = getModuleAddress(MODULE_STORAGE);
        require(s != address(0), "Empty Storage address");
        return StorageModule(s);
    }

    function roleKey(string memory role, address account) pure private returns(string memory){
        return string(abi.encodePacked(ROLE_PREFIX, role, account));
    }

}