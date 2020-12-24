pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/lifecycle/Pausable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/roles/WhitelistedRole.sol";
import "../../common/Module.sol";
import "../../interfaces/access/IAccessModule.sol";

contract AccessModule is Module, IAccessModule, Pausable, WhitelistedRole {
    event WhitelistEnabled();
    event WhitelistDisabled();

    bool public whitelistEnabled;
    mapping(uint256=>bool) public disabledOperations;


    function initialize(address _pool) public initializer {
        Module.initialize(_pool);
        Pausable.initialize(_msgSender());
        WhitelistedRole.initialize(_msgSender());
        // enableWhitelist(); //whitelist is disabled by default for testnet, will be enabled by default for mainnet
    }

    function enableWhitelist() public onlyWhitelistAdmin {
        whitelistEnabled = true;
        emit WhitelistEnabled();
    }
    
    function disableWhitelist() public onlyWhitelistAdmin {
        whitelistEnabled = false;
        emit WhitelistDisabled();
    }

    function setOperationDisabled(Operation operation, bool disabled) public onlyWhitelistAdmin {
        uint256 opNum = uint256(operation);
        disabledOperations[opNum] = disabled;
    }

    function isOperationDisabled(Operation operation) public view returns(bool){
        uint256 opNum = uint256(operation);
        return disabledOperations[opNum];
    }

    function isOperationAllowed(Operation operation, address sender) public view returns(bool) {
        if (paused()) return false;
        if (!whitelistEnabled) {
            return !isOperationDisabled(operation);
        } else if (
            // This operations are allowed even if sender is not whitelisted
            (operation == Operation.Repay) ||               // allowed to prevent unnecessary defaults and interest payments
            (operation == Operation.WithdrawUnlockedPledge) // allowed because repay() calls withdrawUnlockedPledge() after full repay
        ) {
            return !isOperationDisabled(operation);   
        } else {
            return isWhitelisted(sender);
        }
    }
}
