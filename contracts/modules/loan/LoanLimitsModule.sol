pragma solidity ^0.5.12;

import "../../common/Module.sol";
import "../../interfaces/curve/ILoanLimitsModule.sol";

contract LoanLimitsModule is Module, ILoanLimitsModule{
    // This constants are copied from LoanModule   
    uint256 public constant INTEREST_MULTIPLIER = 10**3;
    uint256 public constant PLEDGE_PERCENT_MULTIPLIER = 10**3;
    uint256 public constant DEBT_LOAD_MULTIPLIER = 10**3;



    // struct LoanLimits {
    //     uint256 lDebtAmountMin;     // Minimal amount of proposed credit (DebtProposal.lAmount)
    //     uint256 debtInterestMin;    // Minimal value of debt interest
    //     uint256 pledgePercentMin;   // Minimal pledge as percent of credit collateral amount. Value is divided to PLEDGE_PERCENT_MULTIPLIER for calculations
    //     uint256 lMinPledgeMax;      // Maximal value of minimal pledge (in liquid tokens), works together with pledgePercentMin
    //     uint256 debtLoadMax;        // Maximal ratio LoanModule.lDebts/(FundsModule.lBalance+LoanModule.lDebts)<=debtLoadMax; multiplied to DEBT_LOAD_MULTIPLIER
    //     uint256 maxOpenProposalsPerUser;  // How many open proposals are allowed for user
    //     uint256 minCancelProposalTimeout; // Minimal time (seconds) before a proposal can be cancelled
    // }
    //LoanLimits public limits;

    uint256[7] limits;

    function initialize(address _pool) public initializer {
        Module.initialize(_pool);
        // limits = LoanLimits({
        //     lDebtAmountMin: 100*10**18,                         // 100 DAI min credit
        //     debtInterestMin: INTEREST_MULTIPLIER*10/100,        // 10% min interest
        //     pledgePercentMin: PLEDGE_PERCENT_MULTIPLIER*10/100, // 10% min pledge 
        //     lMinPledgeMax: 500*10**18,                          // 500 DAI max minimal pledge
        //     debtLoadMax: DEBT_LOAD_MULTIPLIER*50/100,           // 50% max debt load
        //     maxOpenProposalsPerUser: 1,                         // 1 open proposal per user
        //     minCancelProposalTimeout: 7*24*60*60                // 7-day timeout before cancelling proposal
        // });
        limits[uint256(LoanLimitType.L_DEBT_AMOUNT_MIN)] = 100*10**18;                           // 100 DAI min credit
        limits[uint256(LoanLimitType.DEBT_INTEREST_MIN)] = INTEREST_MULTIPLIER*10/100;           // 10% min interest
        limits[uint256(LoanLimitType.PLEDGE_PERCENT_MIN)] = PLEDGE_PERCENT_MULTIPLIER*10/100;     // 10% min pledge 
        limits[uint256(LoanLimitType.L_MIN_PLEDGE_MAX)] = 500*10**18;                           // 500 DAI max minimal pledge
        limits[uint256(LoanLimitType.DEBT_LOAD_MAX)] = DEBT_LOAD_MULTIPLIER*50/100;          // 50% max debt load
        limits[uint256(LoanLimitType.MAX_OPEN_PROPOSALS_PER_USER)] = 1;                           // 1 open proposal per user
        limits[uint256(LoanLimitType.MIN_CANCEL_PROPOSAL_TIMEOUT)] = 7*24*60*60;                   // 7-day timeout before cancelling proposal
    }

    function set(LoanLimitType limit, uint256 value) public onlyOwner {
        limits[uint256(limit)] = value;
    }

    function get(LoanLimitType limit) public view returns(uint256) {
        return limits[uint256(limit)];
    }

    function lDebtAmountMin() public view returns(uint256){
        return limits[uint256(LoanLimitType.L_DEBT_AMOUNT_MIN)];
    }     

    function debtInterestMin() public view returns(uint256){
        return limits[uint256(LoanLimitType.DEBT_INTEREST_MIN)];
    }

    function pledgePercentMin() public view returns(uint256){
        return limits[uint256(LoanLimitType.PLEDGE_PERCENT_MIN)];
    }

    function lMinPledgeMax() public view returns(uint256){
        return limits[uint256(LoanLimitType.L_MIN_PLEDGE_MAX)];
    }

    function debtLoadMax() public view returns(uint256){
        return limits[uint256(LoanLimitType.DEBT_LOAD_MAX)];
    }

    function maxOpenProposalsPerUser() public view returns(uint256){
        return limits[uint256(LoanLimitType.MAX_OPEN_PROPOSALS_PER_USER)];
    }

    function minCancelProposalTimeout() public view returns(uint256){
        return limits[uint256(LoanLimitType.MIN_CANCEL_PROPOSAL_TIMEOUT)];
    }

}