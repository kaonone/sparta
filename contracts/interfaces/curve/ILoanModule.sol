pragma solidity ^0.5.12;

/**
 * @title Funds Module Interface
 * @dev Funds module is responsible for deposits, withdrawals, debt proposals, debts and repay.
 */
interface ILoanModule {
    event DebtProposalCreated(address indexed sender, uint256 proposal, uint256 lAmount, uint256 interest, bytes32 descriptionHash);
    event PledgeAdded(address indexed sender, address indexed borrower, uint256 proposal, uint256 lAmount, uint256 pAmount);
    event PledgeWithdrawn(address indexed sender, address indexed borrower, uint256 proposal, uint256 lAmount, uint256 pAmount);
    event DebtProposalExecuted(address indexed sender, uint256 proposal, uint256 debt, uint256 lAmount);
    event Repay(address indexed sender, uint256 debt, uint256 lDebtLeft, uint256 lFullPaymentAmount, uint256 lInterestPaid, uint256 newlastPayment);
    event UnlockedPledgeWithdraw(address indexed sender, address indexed borrower, uint256 proposal, uint256 debt, uint256 pAmount);
    event DebtDefaultExecuted(address indexed borrower, uint256 debt, uint256 pBurned);

    /**
     * @notice Create DebtProposal
     * @param interest Annual interest rate multiplied by INTEREST_MULTIPLIER (to allow decimal numbers)
     * @param pAmount Amount of pTokens to use as collateral
     * @param lAmountMin Minimal amount of liquid tokens 
     * @return Index of created DebtProposal
     */
    function createDebtProposal(uint256 debtLAmount, uint256 interest, uint256 pAmount, uint256 lAmountMin, bytes32 descriptionHash) external returns(uint256);

    /**
     * @notice Add pledge to DebtProposal
     * @param borrower Address of borrower
     * @param proposal Index of borroers's proposal
     * @param pAmount Amount of pTokens to use as collateral
     * @param lAmountMin Minimal amount of liquid tokens to cover by this pledge
     */
    function addPledge(address borrower, uint256 proposal, uint256 pAmount, uint256 lAmountMin) external;

    /**
     * @notice Withdraw pledge from DebtProposal
     * @param borrower Address of borrower
     * @param proposal Index of borrowers's proposal
     * @param pAmount Amount of pTokens to withdraw
     */
    function withdrawPledge(address borrower, uint256 proposal, uint256 pAmount) external;

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
     * @param lAmount Amount of liquid tokens to repay
     */
    function repay(uint256 debt, uint256 lAmount) external;

    /**
     * @notice Allows anyone to default a debt which is behind it's repay deadline
     * @param borrower Address of borrower
     * @param debt Index of borrowers's debt
     */
    function executeDebtDefault(address borrower, uint256 debt) external;

    /**
     * @notice Calculates if default time for the debt is reached
     * @param borrower Address of borrower
     * @param debt Index of borrowers's debt
     * @return true if debt is defaulted
     */
    function isDebtDefaultTimeReached(address borrower, uint256 debt) view external returns(bool);

    /**
     * @notice Check if user has active debts
     * @param sender Address to check
     * @return True if sender has unpaid debts
     */
    function hasActiveDebts(address sender) external view returns(bool);

    /**
     * @notice Total amount of debts
     * @return Summ of all liquid token debts
     */
    function totalLDebts() external view returns(uint256);
}