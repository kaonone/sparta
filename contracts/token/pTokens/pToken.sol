pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Burnable.sol";
import "../../common/Base.sol";

/**
 * @notice pToken contract mock
 */
contract pToken is Base, ERC20Detailed, ERC20Mintable, ERC20Burnable {

    function initialize() public initializer {
    	Base.initialize(msg.sender);
    	ERC20Detailed.initialize("pToken for DAI", "pDAI", 18);
    	ERC20Mintable.initialize(msg.sender);
    }

}

