pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../../interfaces/curve/IFundsModule.sol";
import "../../interfaces/curve/ILoanModule.sol";
import "../../token/pTokens/PToken.sol";
import "../../common/Module.sol";

contract LoanModule is Module, ILoanModule {
    using SafeMath for uint256;

    uint256 public constant INTEREST_MULTIPLIER = 10**3;    // Multiplier to store interest rate (decimal) in int
    uint256 public constant ANNUAL_SECONDS = 365*24*60*60+(24*60*60/4);  // Seconds in a year + 1/4 day to compensate leap years

    uint256 public constant DEBT_REPAY_DEADLINE_PERIOD = 90*24*60*60;   //Period before debt without payments may be defaulted

    uint256 public constant COLLATERAL_TO_DEBT_RATIO_MULTIPLIER = 10**3;
    uint256 public constant COLLATERAL_TO_DEBT_RATIO = 1.00*COLLATERAL_TO_DEBT_RATIO_MULTIPLIER; // Regulates how many collateral is required 
    uint256 public constant PLEDGE_PERCENT_MIN_MULTIPLIER = 10**3;

    uint256 public constant BORROWER_COLLATERAL_TO_FULL_COLLATERAL_MULTIPLIER = 10**3;
    uint256 public constant BORROWER_COLLATERAL_TO_FULL_COLLATERAL_RATIO = BORROWER_COLLATERAL_TO_FULL_COLLATERAL_MULTIPLIER/2;

    struct DebtPledge {
        uint256 senderIndex;  //Index of pledge sender in the array
        uint256 lAmount;      //Amount of liquid tokens, covered by this pledge
        uint256 pAmount;      //Amount of pTokens locked for this pledge
    }

    struct DebtProposal {
        uint256 lAmount;             //Amount of proposed credit (in liquid token)
        uint256 interest;            //Annual interest rate multiplied by INTEREST_MULTIPLIER
        bytes32 descriptionHash;     //Hash of description, description itself is stored on Swarm   
        mapping(address => DebtPledge) pledges;    //Map of all user pledges (this value will not change after proposal )
        address[] supporters;       //Array of all supporters, first supporter (with zero index) is borrower himself
        uint256 lCovered;           //Amount of liquid tokens, covered by pledges
        uint256 pCollected;         //How many pTokens were locked for this proposal
        bool executed;              //If Debt is created for this proposal
    }

    struct Debt {
        uint256 proposal;           // Index of DebtProposal in adress's proposal list
        uint256 lAmount;            // Current amount of debt (in liquid token). If 0 - debt is fully paid
        uint256 lastPayment;        // Timestamp of last interest payment (can be timestamp of last payment or a virtual date untill which interest is paid)
        uint256 pInterest;          // Amount of pTokens minted as interest for this debt
        mapping(address => uint256) claimedPledges;  //Amount of pTokens already claimed by supporter
        bool defaultExecuted;       // If debt default is already executed by executeDebtDefault()
    }

    struct LoanLimits {
        uint256 lDebtAmountMin;     // Minimal amount of proposed credit (DebtProposal.lAmount)
        uint256 debtInterestMin;    // Minimal value of debt interest
        uint256 pledgePercentMin;   // Minimal pledge as percent of credit collateral amount. Value is divided to PLEDGE_PERCENT_MIN_MULTIPLIER for calculations
        uint256 lMinPledgeMax;      // Maximal value of minimal pledge (in liquid tokens), works together with pledgePercentMin
    }

    mapping(address=>DebtProposal[]) public debtProposals;
    mapping(address=>Debt[]) public debts;

    uint256 private lDebts;
    uint256 private lProposals;
    LoanLimits public limits;

    function initialize(address _pool) public initializer {
        Module.initialize(_pool);
        //100 DAI min credit, 10% min interest, 10% min pledge, 500 DAI max minimal pledge
        setLimits(100*10**18, INTEREST_MULTIPLIER*10/100, PLEDGE_PERCENT_MIN_MULTIPLIER*10/100, 500*10**18);
    }

    /**
     * @notice Create DebtProposal
     * @param debtLAmount Amount of debt in liquid tokens
     * @param interest Annual interest rate multiplied by INTEREST_MULTIPLIER (to allow decimal numbers)
     * @param pAmountMax Max amount of pTokens to use as collateral
     * @param descriptionHash Hash of loan description
     * @return Index of created DebtProposal
     */
    function createDebtProposal(uint256 debtLAmount, uint256 interest, uint256 pAmountMax, bytes32 descriptionHash) public returns(uint256){
        require(debtLAmount > 0, "LoanModule: debtLAmount should not be 0");
        require(debtLAmount >= limits.lDebtAmountMin, "LoanModule: debtLAmount should be >= lDebtAmountMin");
        require(interest >= limits.debtInterestMin, "LoanModule: interest should be >= debtInterestMin");
        uint256 fullCollateralLAmount = debtLAmount.mul(COLLATERAL_TO_DEBT_RATIO).div(COLLATERAL_TO_DEBT_RATIO_MULTIPLIER);
        uint256 clAmount = fullCollateralLAmount.mul(BORROWER_COLLATERAL_TO_FULL_COLLATERAL_RATIO).div(BORROWER_COLLATERAL_TO_FULL_COLLATERAL_MULTIPLIER);
        uint256 fpAmount = calculatePoolExit(fullCollateralLAmount);
        uint256 pAmount = fpAmount.mul(BORROWER_COLLATERAL_TO_FULL_COLLATERAL_RATIO).div(BORROWER_COLLATERAL_TO_FULL_COLLATERAL_MULTIPLIER);
        require(pAmount <= pAmountMax, "LoanModule: pAmountMax is too low");

        debtProposals[_msgSender()].push(DebtProposal({
            lAmount: debtLAmount,
            interest: interest,
            descriptionHash: descriptionHash,
            supporters: new address[](0),
            lCovered: 0,
            pCollected: 0,
            executed: false
        }));
        uint256 proposalIndex = debtProposals[_msgSender()].length-1;
        emit DebtProposalCreated(_msgSender(), proposalIndex, debtLAmount, interest, descriptionHash);

        //Add pldege of the creator
        DebtProposal storage p = debtProposals[_msgSender()][proposalIndex];
        p.supporters.push(_msgSender());
        p.pledges[_msgSender()] = DebtPledge({
            senderIndex: 0,
            lAmount: clAmount,
            pAmount: pAmount
        });
        p.lCovered = p.lCovered.add(clAmount);
        p.pCollected = p.pCollected.add(pAmount);
        lProposals = lProposals.add(debtLAmount);

        fundsModule().depositPTokens(_msgSender(), pAmount);
        emit PledgeAdded(_msgSender(), _msgSender(), proposalIndex, clAmount, pAmount);
        return proposalIndex;
    }

    /**
     * @notice Add pledge to DebtProposal
     * @param borrower Address of borrower
     * @param proposal Index of borroers's proposal
     * @param pAmount Amount of pTokens to use as collateral
     * @param lAmountMin Minimal amount of liquid tokens to cover by this pledge
     * 
     * There is a case, when pAmount is too high for this debt, in this case only part of pAmount will be used.
     * In such edge case we may return less then lAmountMin, but price limit lAmountMin/pAmount will be honored.
     */
    function addPledge(address borrower, uint256 proposal, uint256 pAmount, uint256 lAmountMin) public {
        require(_msgSender() != borrower, "LoanModule: Borrower can not add pledge");
        DebtProposal storage p = debtProposals[borrower][proposal];
        require(p.lAmount > 0, "LoanModule: DebtProposal not found");
        require(!p.executed, "LoanModule: DebtProposal is already executed");
        (uint256 lAmount, , ) = calculatePoolExitInverse(pAmount);
        require(lAmount >= lAmountMin, "LoanModule: Minimal amount is too high");
        (uint256 minLPledgeAmount, uint256 maxLPledgeAmount)= getPledgeRequirements(borrower, proposal);
        require(maxLPledgeAmount > 0, "LoanModule: DebtProposal is already funded");
        require(lAmount >= minLPledgeAmount, "LoanModule: pledge is too low");
        if (lAmount > maxLPledgeAmount) {
            uint256 pAmountOld = pAmount;
            lAmount = maxLPledgeAmount;
            pAmount = calculatePoolExit(lAmount);
            assert(pAmount <= pAmountOld);
        } 
        if (p.pledges[_msgSender()].senderIndex == 0) {
            p.supporters.push(_msgSender());
            p.pledges[_msgSender()] = DebtPledge({
                senderIndex: p.supporters.length-1,
                lAmount: lAmount,
                pAmount: pAmount
            });
        } else {
            p.pledges[_msgSender()].lAmount = p.pledges[_msgSender()].lAmount.add(lAmount);
            p.pledges[_msgSender()].pAmount = p.pledges[_msgSender()].pAmount.add(pAmount);
        }
        p.lCovered = p.lCovered.add(lAmount);
        p.pCollected = p.pCollected.add(pAmount);
        fundsModule().depositPTokens(_msgSender(), pAmount);
        emit PledgeAdded(_msgSender(), borrower, proposal, lAmount, pAmount);
    }

    /**
     * @notice Withdraw pledge from DebtProposal
     * @param borrower Address of borrower
     * @param proposal Index of borrowers's proposal
     * @param pAmount Amount of pTokens to withdraw
     */
    function withdrawPledge(address borrower, uint256 proposal, uint256 pAmount) public {
        require(_msgSender() != borrower, "LoanModule: Borrower can not withdraw pledge");
        DebtProposal storage p = debtProposals[borrower][proposal];
        require(p.lAmount > 0, "LoanModule: DebtProposal not found");
        require(!p.executed, "LoanModule: DebtProposal is already executed");
        DebtPledge storage pledge = p.pledges[_msgSender()];
        require(pAmount <= pledge.pAmount, "LoanModule: Can not withdraw more then locked");
        uint256 lAmount; 
        if (pAmount == pledge.pAmount) {
            lAmount = pledge.lAmount;
        } else {
            // pAmount < pledge.pAmount
            lAmount = pledge.lAmount.mul(pAmount).div(pledge.pAmount);
            assert(lAmount < pledge.lAmount);
        }
        pledge.pAmount = pledge.pAmount.sub(pAmount);
        pledge.lAmount = pledge.lAmount.sub(lAmount);
        p.pCollected = p.pCollected.sub(pAmount);
        p.lCovered = p.lCovered.sub(lAmount);

        //Check new min/max pledge AFTER current collateral is adjusted to new values
        (uint256 minLPledgeAmount,)= getPledgeRequirements(borrower, proposal); 
        require(pledge.pAmount >= minLPledgeAmount || pledge.pAmount == 0, "LoanModule: pledge left is too small");

        fundsModule().withdrawPTokens(_msgSender(), pAmount);
        emit PledgeWithdrawn(_msgSender(), borrower, proposal, lAmount, pAmount);
    }

    /**
     * @notice Execute DebtProposal
     * @dev Creates Debt using data of DebtProposal
     * @param proposal Index of DebtProposal
     * @return Index of created Debt
     */
    function executeDebtProposal(uint256 proposal) public returns(uint256){
        DebtProposal storage p = debtProposals[_msgSender()][proposal];
        require(p.lAmount > 0, "LoanModule: DebtProposal not found");
        require(getRequiredPledge(_msgSender(), proposal) == 0, "LoanModule: DebtProposal is not fully funded");
        require(!p.executed, "LoanModule: DebtProposal is already executed");
        debts[_msgSender()].push(Debt({
            proposal: proposal,
            lAmount: p.lAmount,
            lastPayment: now,
            pInterest: 0,
            defaultExecuted: false
        }));
        // We do not initialize pledges map here to save gas!
        // Instead we check PledgeAmount.initialized field and do lazy initialization
        p.executed = true;
        uint256 debtIdx = debts[_msgSender()].length-1; //It's important to save index before calling external contract
        lProposals = lProposals.sub(p.lAmount);
        lDebts = lDebts.add(p.lAmount);
        fundsModule().withdrawLTokens(_msgSender(), p.lAmount);
        emit DebtProposalExecuted(_msgSender(), proposal, debtIdx, p.lAmount);
        return debtIdx;
    }

    /**
     * @notice Repay amount of lToken and unlock pTokens
     * @param debt Index of Debt
     * @param lAmount Amount of liquid tokens to repay (it will not take more than needed for full debt repayment)
     */
    function repay(uint256 debt, uint256 lAmount) public {
        Debt storage d = debts[_msgSender()][debt];
        require(d.lAmount > 0, "LoanModule: Debt is already fully repaid"); //Or wrong debt index
        require(!_isDebtDefaultTimeReached(d), "LoanModule: debt is already defaulted");
        DebtProposal storage p = debtProposals[_msgSender()][d.proposal];
        require(p.lAmount > 0, "LoanModule: DebtProposal not found");

        uint256 lInterest = calculateInterestPayment(d.lAmount, p.interest, d.lastPayment, now);

        uint256 actualInterest;
        if (lAmount < lInterest) {
            uint256 paidTime = now.sub(d.lastPayment).mul(lAmount).div(lInterest);
            assert(d.lastPayment + paidTime <= now);
            d.lastPayment = d.lastPayment.add(paidTime);
            actualInterest = lAmount;
        } else {
            uint256 fullRepayLAmount = d.lAmount.add(lInterest);
            if (lAmount > fullRepayLAmount) lAmount = fullRepayLAmount;

            d.lastPayment = now;
            uint256 debtReturned = lAmount.sub(lInterest);
            d.lAmount = d.lAmount.sub(debtReturned);
            lDebts = lDebts.sub(debtReturned);
            actualInterest = lInterest;
        }

        uint256 pInterest = calculatePoolEnter(actualInterest);
        d.pInterest = d.pInterest.add(pInterest);

        fundsModule().depositLTokens(_msgSender(), lAmount); 
        fundsModule().mintPTokens(getModuleAddress(MODULE_FUNDS), pInterest);

        emit Repay(_msgSender(), debt, d.lAmount, lAmount, actualInterest, pInterest, d.lastPayment);
    }

    /**
     * @notice Allows anyone to default a debt which is behind it's repay deadline
     * @param borrower Address of borrower
     * @param debt Index of borrowers's debt
     */
    function executeDebtDefault(address borrower, uint256 debt) public {
        Debt storage dbt = debts[borrower][debt];
        require(dbt.lAmount > 0, "LoanModule: debt is fully repaid");
        require(!dbt.defaultExecuted, "LoanModule: default is already executed");
        require(_isDebtDefaultTimeReached(dbt), "LoanModule: not enough time passed");
        DebtProposal storage proposal = debtProposals[borrower][dbt.proposal];
        uint256 pLocked = proposal.pCollected.mul(dbt.lAmount).div(proposal.lAmount);
        dbt.defaultExecuted = true;
        lDebts = lDebts.sub(dbt.lAmount);
        IFundsModule funds = fundsModule();
        funds.burnPTokens(pLocked);
        emit DebtDefaultExecuted(borrower, debt, pLocked);
    }

    /**
     * @notice Withdraw part of the pledge which is already unlocked (borrower repaid part of the debt) + interest
     * @param borrower Address of borrower
     * @param debt Index of borrowers's debt
     */
    function withdrawUnlockedPledge(address borrower, uint256 debt) public {
        (, uint256 pUnlocked, uint256 pInterest, uint256 pWithdrawn) = calculatePledgeInfo(borrower, debt, _msgSender());

        uint256 pUnlockedPlusInterest = pUnlocked.add(pInterest);
        require(pUnlockedPlusInterest > pWithdrawn, "LoanModule: nothing to withdraw");
        uint256 pAmount = pUnlockedPlusInterest.sub(pWithdrawn);

        Debt storage dbt = debts[borrower][debt];
        dbt.claimedPledges[_msgSender()] = dbt.claimedPledges[_msgSender()].add(pAmount);
        fundsModule().withdrawPTokens(_msgSender(), pAmount);
        emit UnlockedPledgeWithdraw(_msgSender(), borrower, dbt.proposal, debt, pAmount);
    }

    function setLimits(uint256 lDebtAmountMin, uint256 debtInterestMin, uint256 pledgePercentMin, uint256 lMinPledgeMax) public onlyOwner {
        limits.lDebtAmountMin = lDebtAmountMin;
        limits.debtInterestMin = debtInterestMin;
        limits.pledgePercentMin = pledgePercentMin;
        limits.lMinPledgeMax = lMinPledgeMax;
    }

    /**
     * @notice This function is only used for testing purpuses (test liquidations)
     * @dev SHOULD BE DELETED BEFORE MAINNET RELEASE
     * @param borrower Address of borrower
     * @param debt Index of borrowers's debt
     * @param newDate New timestamp of the last payment for this debt
     */
    function __changeDebtLastPaymentDate(address borrower, uint256 debt, uint256 newDate) public onlyOwner {
        Debt storage dbt = debts[borrower][debt];
        dbt.lastPayment = newDate;
    }

    /**
     * @notice Calculates if default time for the debt is reached
     * @param borrower Address of borrower
     * @param debt Index of borrowers's debt
     * @return true if debt is defaulted
     */
    function isDebtDefaultTimeReached(address borrower, uint256 debt) view public returns(bool) {
        Debt storage dbt = debts[borrower][debt];
        return _isDebtDefaultTimeReached(dbt);
    }

    /**
     * @notice Calculates current pledge state
     * @param borrower Address of borrower
     * @param debt Index of borrowers's debt
     * @param supporter Address of supporter to check. If supporter == borrower, special rules applied.
     * @return current pledge state:
     *      pLocked - locked pTokens
     *      pUnlocked - unlocked pTokens (including already withdrawn)
     *      pInterest - received interest
     *      pWithdrawn - amount of already withdrawn pTokens
     */
    function calculatePledgeInfo(address borrower, uint256 debt, address supporter) view public 
    returns(uint256 pLocked, uint256 pUnlocked, uint256 pInterest, uint256 pWithdrawn){
        Debt storage dbt = debts[borrower][debt];
        DebtProposal storage proposal = debtProposals[borrower][dbt.proposal];
        require(proposal.lAmount > 0 && proposal.executed, "LoanModule: DebtProposal not found");

        pWithdrawn = dbt.claimedPledges[supporter];

        DebtPledge storage dp = proposal.pledges[supporter];

        if (supporter == borrower) {
            if (dbt.lAmount == 0) {
                pLocked = 0;
                pUnlocked = dp.pAmount;
            } else {
                pLocked = dp.pAmount;
                pUnlocked = 0;
                if (_isDebtDefaultTimeReached(dbt)) {
                    pLocked = 0; 
                }
            }
            pInterest = 0;
        }else{
            uint256 lPledge = dp.lAmount;
            uint256 pPledge = dp.pAmount;
            pLocked = pPledge.mul(dbt.lAmount).div(proposal.lAmount);
            assert(pLocked <= pPledge);
            pUnlocked = pPledge.sub(pLocked);
            pInterest = dbt.pInterest.mul(lPledge).div(proposal.lAmount);
            assert(pInterest <= dbt.pInterest);
            if (_isDebtDefaultTimeReached(dbt)) {
                DebtPledge storage dpb = proposal.pledges[borrower];
                uint256 pLockedBorrower = dpb.pAmount.mul(dbt.lAmount).div(proposal.lAmount);
                uint256 pUnlockedBorrower = dpb.pAmount.sub(pLockedBorrower);
                uint256 pCompensation = pUnlockedBorrower.mul(lPledge).div(proposal.lAmount);
                if (dbt.defaultExecuted) {
                    pLocked = 0;
                    pUnlocked = pUnlocked.add(pCompensation);
                }else {
                    pLocked = pCompensation;
                }
            }
        }
    }

    /**
     * @notice Calculates how many tokens are not yet covered by borrower or supporters
     * @param borrower Borrower address
     * @param proposal Proposal index
     * @return amounts of liquid tokens currently required to fully cover proposal
     */
    function getRequiredPledge(address borrower, uint256 proposal) view public returns(uint256){
        DebtProposal storage p = debtProposals[borrower][proposal];
        if (p.executed) return 0;
        uint256 fullCollateralLAmount = p.lAmount.mul(COLLATERAL_TO_DEBT_RATIO).div(COLLATERAL_TO_DEBT_RATIO_MULTIPLIER);
        return  fullCollateralLAmount.sub(p.lCovered);
    }

    /**
     * @notice Calculates pledge requirements
     * Max allowed pledge = how many tokens are not yet covered by borrower or supporters.
     * @param borrower Borrower address
     * @param proposal Proposal index
     * @return minimal allowed pledge, maximal allowed pledge
     */
    function getPledgeRequirements(address borrower, uint256 proposal) public view returns(uint256 minLPledge, uint256 maxLPledge){
        // uint256 pledgePercentMin;   // Minimal pledge as percent of credit amount. Value is divided to PLEDGE_PERCENT_MIN_MULTIPLIER for calculations
        // uint256 lMinPledgeMax;      // Maximal value of minimal pledge (in liquid tokens), works together with pledgePercentMin

        DebtProposal storage p = debtProposals[borrower][proposal];
        if (p.executed) return (0, 0);
        uint256 fullCollateralLAmount = p.lAmount.mul(COLLATERAL_TO_DEBT_RATIO).div(COLLATERAL_TO_DEBT_RATIO_MULTIPLIER);
        maxLPledge = fullCollateralLAmount.sub(p.lCovered);

        minLPledge = limits.pledgePercentMin.mul(fullCollateralLAmount).div(PLEDGE_PERCENT_MIN_MULTIPLIER);
        if (minLPledge > limits.lMinPledgeMax) minLPledge = limits.lMinPledgeMax;
        if (minLPledge > maxLPledge) minLPledge = maxLPledge;
    }

    /**
     * @notice Calculates current pledge state
     * @param borrower Address of borrower
     * @param debt Index of borrowers's debt
     * @return Amount of unpaid debt, amount of interest payment
     */
    function getDebtRequiredPayments(address borrower, uint256 debt) public view returns(uint256, uint256) {
        Debt storage d = debts[borrower][debt];
        if (d.lAmount == 0) {
            return (0, 0);
        }
        DebtProposal storage p = debtProposals[borrower][d.proposal];
        require(p.lAmount > 0, "LoanModule: DebtProposal not found");

        uint256 interest = calculateInterestPayment(d.lAmount, p.interest, d.lastPayment, now);
        return (d.lAmount, interest);
    }

    /**
     * @notice Check if user has active debts
     * @param sender Address to check
     * @return True if sender has unpaid debts
     */
    function hasActiveDebts(address sender) public view returns(bool) {
        //TODO: iterating through all debts may be too expensive if there are a lot of closed debts. Need to test this and find solution
        Debt[] storage userDebts = debts[sender];
        if (userDebts.length == 0) return false;
        for (uint256 i=userDebts.length-1; i >= 0; i--){ //searching in reverse order because probability to find active loan is higher for latest loans
            bool isUnpaid = userDebts[i].lAmount != 0;
            bool isDefaulted = isUnpaid && _isDebtDefaultTimeReached(userDebts[i]);
            if (isUnpaid && !isDefaulted) return true;
            if (i == 0) break;   //fix i-- fails because i is unsigned
        }
        return false;
    }

    /**
     * @notice Total amount of debts
     * @return Summ of all liquid token in debts
     */
    function totalLDebts() public view returns(uint256){
        return lDebts;
    }

    /**
     * @notice Total amount of debts
     * @return Summ of all liquid token in proposals
     */
    function totalLProposals() public view returns(uint256){
        return lProposals;
    }

    /**
     * @notice Total amount of debts
     * @return Summ of all liquid token in debts and proposals
     */
    function totalLDebtsAndProposals() public view returns(uint256){
        return lDebts.add(lProposals);
    }

    /**
     * @notice Calculates interest amount for a debt
     * @param debtLAmount Current amount of debt
     * @param interest Annual interest rate multiplied by INTEREST_MULTIPLIER
     * @param prevPayment Timestamp of previous payment
     * @param currentPayment Timestamp of current payment
     */
    function calculateInterestPayment(uint256 debtLAmount, uint256 interest, uint256 prevPayment, uint currentPayment) public pure returns(uint256){
        require(prevPayment <= currentPayment, "LoanModule: prevPayment should be before currentPayment");
        uint256 annualInterest = debtLAmount.mul(interest).div(INTEREST_MULTIPLIER);
        uint256 time = currentPayment.sub(prevPayment);
        return time.mul(annualInterest).div(ANNUAL_SECONDS);
    }

    /**
     * @notice Calculates how many pTokens should be given to user for increasing liquidity
     * @param lAmount Amount of liquid tokens which will be put into the pool
     * @return Amount of pToken which should be sent to sender
     */
    function calculatePoolEnter(uint256 lAmount) internal view returns(uint256) {
        return fundsModule().calculatePoolEnter(lAmount);
    }

    /**
     * @notice Calculates how many pTokens should be taken from user for decreasing liquidity
     * @param lAmount Amount of liquid tokens which will be removed from the pool
     * @return Amount of pToken which should be taken from sender
     */
    function calculatePoolExit(uint256 lAmount) internal view returns(uint256) {
        return fundsModule().calculatePoolExit(lAmount);
    }

    /**
     * @notice Calculates how many liquid tokens should be removed from pool when decreasing liquidity
     * @param pAmount Amount of pToken which should be taken from sender
     * @return Amount of liquid tokens which will be removed from the pool: total, part for sender, part for pool
     */
    function calculatePoolExitInverse(uint256 pAmount) internal view returns(uint256, uint256, uint256) {
        return fundsModule().calculatePoolExitInverse(pAmount);
    }

    function fundsModule() internal view returns(IFundsModule) {
        return IFundsModule(getModuleAddress(MODULE_FUNDS));
    }

    function _isDebtDefaultTimeReached(Debt storage dbt) view private returns(bool) {
        uint256 timeSinceLastPayment = now.sub(dbt.lastPayment);
        return timeSinceLastPayment > DEBT_REPAY_DEADLINE_PERIOD;
    }
}