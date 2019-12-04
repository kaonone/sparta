pragma solidity ^0.5.12;

/**
 * @title Funds Module Interface
 * @dev Funds module is responsible for deposits, withdrawals, debt proposals, debts and repay.
 */
interface IFundsModule {

    event Deposit(address indexed sender, uint256 liquidTokenAmount, uint256 pTokenAmount);
    event Withdraw(address indexed sender, uint256 liquidTokenAmount, uint256 pTokenAmount);
    event DebtProposalCreated(address indexed sender, uint256 proposal, uint256 liquidTokenAmount, uint256 pTokenAmount);
    event PledgeAdded(address indexed sender, address indexed borrower, uint256 proposal, uint256 liquidTokenAmount, uint256 pTokenAmount);
    event PledgeWithdrawn(address indexed sender, address indexed borrower, uint256 proposal, uint256 liquidTokenAmount, uint256 pTokenAmount);
    event DebtProposalExecuted(address indexed sender, uint256 proposal, uint256 debt, uint256 liquidTokenAmount);
    event Repay(address indexed sender, uint256 debt, uint256 liquidTokenAmount);
    event UnlockedPledgeWithdraw(address indexed sender, address indexed borrower, uint256 debt, uint256 pTokenAmount);

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
     * @param debt Index of Debt
     * @param amount Amount of liquid tokens to repay
     */
    function repay(uint256 debt, uint256 amount) external;
}