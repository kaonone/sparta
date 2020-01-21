pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Burnable.sol";
import "../../common/Base.sol";

/**
 * @notice Implementation of Akropolis Pool Token
 */
contract PToken is Base, ERC20Detailed, ERC20Mintable, ERC20Burnable {

    function initialize() public initializer {
        Base.initialize();
        ERC20Detailed.initialize("Akropolis Pool Token", "PTK", 18);
        ERC20Mintable.initialize(_msgSender());
    }

}

