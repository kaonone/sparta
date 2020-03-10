pragma solidity ^0.5.12;

/**
 * @title Liquidity Module Interface
 * @dev Liquidity module is responsible for deposits, withdrawals and works with Funds module.
 */
interface ILiquidityModule {

    event Deposit(address indexed sender, uint256 lAmount, uint256 pAmount);
    event Withdraw(address indexed sender, uint256 lAmountTotal, uint256 lAmountUser, uint256 pAmount);

    /*
     * @notice Deposit amount of lToken and mint pTokens
     * @param lAmount Amount of liquid tokens to invest
     * @param pAmountMin Minimal amout of pTokens suitable for sender
     */ 
    function deposit(uint256 lAmount, uint256 pAmountMin) external;

    /**
     * @notice Withdraw amount of lToken and burn pTokens
     * @param pAmount Amount of pTokens to send
     * @param lAmountMin Minimal amount of liquid tokens to withdraw
     */
    function withdraw(uint256 pAmount, uint256 lAmountMin) external;

    /**
     * @notice Simulate withdrawal for loan repay with PTK
     * @param pAmount Amount of pTokens to use
     */
    function withdrawForRepay(address borrower, uint256 pAmount) external;
}