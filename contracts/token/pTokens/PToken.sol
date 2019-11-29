pragma solidity ^0.5.12;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Burnable.sol";

/**
 * @notice PToken contract mock
 */
contract PToken is Initializable, Ownable, ERC20Detailed, ERC20Mintable, ERC20Burnable {

    function initialize(address sender) public initializer {
        Ownable.initialize(sender);
        ERC20Detailed.initialize("pToken for DAI", "pDAI", 18);
        ERC20Mintable.initialize(sender);
    }

}

