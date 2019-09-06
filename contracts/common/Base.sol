pragma solidity ^0.5.0;

import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";

/*
    Base contract for all modules
*/

contract Base is Ownable {

    function initialize() public initializer  Int{
        Ownable.initialize(msg.sender);
    }
}