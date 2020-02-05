pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Burnable.sol";
import "../../common/Module.sol";
import "../../interfaces/token/IPToken.sol";

/**
 * @notice Implementation of Akropolis Pool Token
 */
contract PToken is Module, IPToken, ERC20, ERC20Detailed, ERC20Mintable, ERC20Burnable {

    function initialize(address _pool) public initializer {
        Module.initialize(_pool);
        ERC20Detailed.initialize("Akropolis Pool Token", "PTK", 18);
        ERC20Mintable.initialize(_msgSender());
    }

    /**
     * @dev Overrides ERC20 transfer to add check  for allowed parties
     */
    function transfer(address to, uint256 value) public returns (bool) {
        address funds = getModuleAddress(MODULE_FUNDS);
        requireAllowedParties(_msgSender(), to, funds);
        return super.transfer(to, value);
    }

    /**
     * @dev Overrides ERC20 transfer to add check  for allowed parties
     * and make calls from FundsModule work without approval
     */
    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        address funds = getModuleAddress(MODULE_FUNDS);
        if (_msgSender() == funds) {
            _transfer(from, to, value);
            return true;
        } else {
            requireAllowedParties(from, to, funds);
            return super.transferFrom(from, to, value);
        }
    }

    /**
     * @dev Overrides ERC20Burnable burnFrom to allow calls from FundsModule work without approval
     */
    function burnFrom(address account, uint256 amount) public {
        address funds = getModuleAddress(MODULE_FUNDS);
        if (_msgSender() == funds) {
            _burn(account, amount);
        } else {
            super.burnFrom(account, amount);
        }
    }

    /**
     * @dev Check that sender/receipient of transfer are allowed
     */
    function requireAllowedParties(address from, address to, address fundsModule) private pure{
        require(fundsModule == from || fundsModule == to, "PToken: only transfers to/from FundsModule allowed");
    }
}

