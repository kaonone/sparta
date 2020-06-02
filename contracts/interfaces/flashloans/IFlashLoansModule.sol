pragma solidity ^0.5.12;

import "./IFlashLoanReceiver.sol";

/**
 * @title FlashLoans Module Interface
 * @dev FlashLoans module is responsible for managing flash-loans.
 */
interface IFlashLoansModule {
    function executeLoan(IFlashLoanReceiver receiver, uint256 amount, bytes calldata data) external;

}