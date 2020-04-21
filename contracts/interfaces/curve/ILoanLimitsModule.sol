pragma solidity ^0.5.12;

/**
 * @title Funds Module Interface
 * @dev Funds module is responsible for deposits, withdrawals, debt proposals, debts and repay.
 */
interface ILoanLimitsModule {
    // List of limit types. See LoanLimits struct for descriptions
    enum LoanLimitType {
        L_DEBT_AMOUNT_MIN,
        DEBT_INTEREST_MIN,
        PLEDGE_PERCENT_MIN,
        L_MIN_PLEDGE_MAX,    
        DEBT_LOAD_MAX,       
        MAX_OPEN_PROPOSALS_PER_USER,
        MIN_CANCEL_PROPOSAL_TIMEOUT
    }

    function set(LoanLimitType limit, uint256 value) external;
    function get(LoanLimitType limit) external view returns(uint256);

    function lDebtAmountMin() external view returns(uint256);
    function debtInterestMin() external view returns(uint256);
    function pledgePercentMin() external view returns(uint256);
    function lMinPledgeMax() external view returns(uint256);
    function debtLoadMax() external view returns(uint256);
    function maxOpenProposalsPerUser() external view returns(uint256);
    function minCancelProposalTimeout() external view returns(uint256);
}