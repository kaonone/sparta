pragma solidity ^0.5.0;

import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";


contract Base is Ownable {

    function initialize(uint num) public initializer {
     super.initialize(msg.sender);
    }
}