pragma solidity ^0.5.12;

/**
 * @title Bonding Curve Interface
 * @dev A bonding curve is a method for continous token minting / burning.
 */
interface IFundsModule {

    /**
     * @notice Deposit amount of liquidToken and mint pTokens
     * @param sender Address of Capital provider
     * @param amount Amount of liquid tokens to invest
     */
    function deposit(address sender, uint256 amount) external;

    /**
     * @notice Withdraw amount of liquidToken and burn pTokens
     * @param sender Address of Capital provider
     * @param amount Amount of liquid tokens to withdraw
     */
    function withdraw(address sender, uint256 amount) external;

    /**
     * @notice Borrow amount of liquidToken and lock pTokens
     * @param sender Address of Borrower
     * @param amount Amount of liquid tokens to borrow
     */
    function borrow(address sender, uint256 amount) external;

    /**
     * @notice Repay amount of liquidToken and unlock pTokens
     * @param sender Address of Borrower
     * @param amount Amount of liquid tokens to repay
     */
    function repay(address sender, uint256 amount) external;
}