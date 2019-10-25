pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";

/*
    Base contract for all modules
*/

contract Base is Ownable {

    address constant  ZERO_ADDRESS = address(0);

    function initialize() public initializer {
        Ownable.initialize(msg.sender);
    }

}
