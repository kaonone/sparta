pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Burnable.sol";
import "../../common/Module.sol";
import "../../interfaces/token/IPToken.sol";
import "../../interfaces/curve/IFundsModule.sol";
import "./DistributionToken.sol";

/**
 * @notice Implementation of Akropolis Pool Token
 */
contract PToken is Module, IPToken, ERC20, ERC20Detailed, ERC20Mintable, ERC20Burnable, DistributionToken {


    function initialize(address _pool) public initializer {
        Module.initialize(_pool);
        ERC20Detailed.initialize("Akropolis Sparta Pool Token", "ASPT", 18);
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
     * @dev Overrides DistributionToken.distributionBalanceOf() to handle FundsModule
     */
    function distributionBalanceOf(address account) public view returns(uint256) {
        IFundsModule funds = fundsModule();
        if (account == address(funds)) {
            return 0; //FundsModule itself does not receive distributions
        }
        uint256 fundsBalance = funds.pBalanceOf(account);
        return super.distributionBalanceOf(account).add(fundsBalance);
    }

    function distributionTotalSupply() public view returns(uint256){
        IFundsModule funds = fundsModule();
        uint256 fullSupply = super.distributionTotalSupply();
        uint256 locked = funds.pBalanceOf(address(funds));
        return fullSupply.sub(locked);
    }

    function fundsModule() internal view returns(IFundsModule) {
        return IFundsModule(getModuleAddress(MODULE_FUNDS));
    }

    /**
     * @dev Check that sender/receipient of transfer are allowed
     */
    function requireAllowedParties(address from, address to, address funds) private pure{
        require(funds == from || funds == to, "PToken: only transfers to/from FundsModule allowed");
    }
}

