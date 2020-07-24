pragma solidity ^0.5.12;

import "../modules/funds/DefiFundsModule.sol";

/**
* @notice FundsModule is actually rename of DefiFundsModule to allow upgrade from version without defi module
*
* @dev It's important to NOT STORE any state variables in this contract, to make it easealy changable to another storage.
* If some variables are needed, consider to move it either to BaseFundsModule or, prefferably, to DeFi module.
*/
contract FundsModule is DefiFundsModule {

}