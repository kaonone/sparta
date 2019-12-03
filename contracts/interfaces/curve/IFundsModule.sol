pragma solidity ^0.5.12;

/**
 * @title Funds Module Interface
 * @dev Funds module is responsible for deposits, withdrawals, debt proposals, debts and repay.
 */
interface IFundsModule {

    event Deposit(address sender, uint256 liquidTokenAmount, uint256 pTokenAmount);
    event Withdraw(address sender, uint256 liquidTokenAmount, uint256 pTokenAmount);
    event DebtProposalCreated(address sender, uint256 proposal, uint256 liquidTokenAmount, uint256 pTokenAmount);
    event PledgeAdded(address sender, address borrower, uint256 proposal, uint256 pTokenAmount);
    event DebtProposalExecuted(address sender, uint256 proposal, uint256 debt, uint256 liquidTokenAmount, uint256 pTokenAmount);
    event Repay(address sender, uint256 debt, uint256 liquidTokenAmount, uint256 pTokenAmount);

    /*
     * @notice Deposit amount of liquidToken and mint pTokens
     * @param amount Amount of liquid tokens to invest
     */ 
    function deposit(uint256 amount) external;

    /**
     * @notice Withdraw amount of liquidToken and burn pTokens
     * @param amount Amount of liquid tokens to withdraw
     */
    function withdraw(uint256 amount) external;

    /**
     * @notice Create DebtProposal
     * @param amount Amount of liquid tokens to borrow
     * @return Index of created DebtProposal
     */
    function createDebtProposal(uint256 amount) external returns(uint256);

    /**
     * @notice Execute DebtProposal
     * @dev Creates Debt using data of DebtProposal
     * @param proposal Index of DebtProposal
     * @return Index of created Debt
     */
    function executeDebtProposal(uint256 proposal) external returns(uint256);

    /**
     * @notice Repay amount of liquidToken and unlock pTokens
     * @param amount Amount of liquid tokens to repay
     * @param debt Index of Debt
     */
    function repay(uint256 amount, uint256 debt) external;
}