pragma solidity ^0.5.12;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "./GSNContext.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";

/**
 * Base contract for all modules
 */
contract Base is Initializable, GSNContext, Ownable {
    address constant ZERO_ADDRESS = address(0);

    function initialize() public initializer {
        Ownable.initialize(_msgSender());
        GSNContext.initialize();
    }
}
