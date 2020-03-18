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
    event Repay(address indexed sender, uint256 debt, uint256 lDebtLeft, uint256 lFullPaymentAmount, uint256 lInterestPaid, uint256 pInterestPaid, uint256 newlastPayment);
    event UnlockedPledgeWithdraw(address indexed sender, address indexed borrower, uint256 proposal, uint256 debt, uint256 pAmount);
    event DebtDefaultExecuted(address indexed borrower, uint256 debt, uint256 pBurned);

    /**
     * @notice Create DebtProposal
     * @param debtLAmount Amount of debt in liquid tokens
     * @param interest Annual interest rate multiplied by INTEREST_MULTIPLIER (to allow decimal numbers)
     * @param pAmountMax Max amount of pTokens to use as collateral
     * @param descriptionHash Hash of loan description
     * @return Index of created DebtProposal
     */
    function createDebtProposal(uint256 debtLAmount, uint256 interest, uint256 pAmountMax, bytes32 descriptionHash) external returns(uint256);

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

    function repayPTK(uint256 debt, uint256 pAmount, uint256 lAmountMin) external;

    function repayAllInterest(address borrower) external;

    /**
     * @notice Allows anyone to default a debt which is behind it's repay deadline
     * @param borrower Address of borrower
     * @param debt Index of borrowers's debt
     */
    function executeDebtDefault(address borrower, uint256 debt) external;

    /**
     * @notice Withdraw part of the pledge which is already unlocked (borrower repaid part of the debt) + interest
     * @param borrower Address of borrower
     * @param debt Index of borrowers's debt
     */
    function withdrawUnlockedPledge(address borrower, uint256 debt) external;

    /**
     * @notice Calculates if default time for the debt is reached
     * @param borrower Address of borrower
     * @param debt Index of borrowers's debt
     * @return true if debt is defaulted
     */
    function isDebtDefaultTimeReached(address borrower, uint256 debt) external view returns(bool);

    /**
     * @notice Check if user has active debts
     * @param sender Address to check
     * @return True if sender has unpaid debts
     */
    function hasActiveDebts(address sender) external view returns(bool);

    /**
     * @notice Total amount of debts
     * @return Summ of all liquid token in debts
     */
    function totalLDebts() external view returns(uint256);

    /**
     * @notice Total amount of collateral locked in proposals
     * Although this is measured in liquid tokens, it's not actual tokens,
     * just a value wich is supposed to represent the collateral locked in proposals.
     * @return Summ of all collaterals in proposals
     */
    function totalLProposals() external view returns(uint256);

}