pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../../interfaces/access/IAccessModule.sol";
import "../../interfaces/curve/ICurveModule.sol";
import "../../interfaces/curve/IFundsModule.sol";
import "../../interfaces/curve/ILiquidityModule.sol";
import "../../interfaces/curve/ILoanModule.sol";
import "../../interfaces/token/IPToken.sol";
import "../../common/Module.sol";

contract LoanModule is Module, ILoanModule {
    using SafeMath for uint256;

    uint256 public constant INTEREST_MULTIPLIER = 10**3;    // Multiplier to store interest rate (decimal) in int
    uint256 public constant ANNUAL_SECONDS = 365*24*60*60+(24*60*60/4);  // Seconds in a year + 1/4 day to compensate leap years

    uint256 public constant DEBT_REPAY_DEADLINE_PERIOD = 90*24*60*60;   //Period before debt without payments may be defaulted

    uint256 public constant COLLATERAL_TO_DEBT_RATIO_MULTIPLIER = 10**3;
    uint256 public constant COLLATERAL_TO_DEBT_RATIO = /*1.0* */COLLATERAL_TO_DEBT_RATIO_MULTIPLIER; // Regulates how many collateral is required 
    uint256 public constant PLEDGE_PERCENT_MULTIPLIER = 10**3;
    uint256 public constant DEBT_LOAD_MULTIPLIER = 10**3;

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
        uint256 pledgePercentMin;   // Minimal pledge as percent of credit collateral amount. Value is divided to PLEDGE_PERCENT_MULTIPLIER for calculations
        uint256 lMinPledgeMax;      // Maximal value of minimal pledge (in liquid tokens), works together with pledgePercentMin
        uint256 debtLoadMax;        // Maximal ratio LoanModule.lDebts/(FundsModule.lBalance+LoanModule.lDebts)<=debtLoadMax; multiplied to DEBT_LOAD_MULTIPLIER
    }

    mapping(address=>DebtProposal[]) public debtProposals;
    mapping(address=>Debt[]) public debts;                 

    uint256 private lDebts;
    uint256 private lProposals;
    LoanLimits public limits;

    mapping(address=>uint256) public activeDebts;           // Counts how many active debts the address has 

    modifier operationAllowed(IAccessModule.Operation operation) {
        IAccessModule am = IAccessModule(getModuleAddress(MODULE_ACCESS));
        require(am.isOperationAllowed(operation, _msgSender()), "LoanModule: operation not allowed");
        _;
    }

    function initialize(address _pool) public initializer {
        Module.initialize(_pool);
        //100 DAI min credit, 10% min interest, 10% min pledge, 500 DAI max minimal pledge, 50% max debt load
        setLimits(100*10**18, INTEREST_MULTIPLIER*10/100, PLEDGE_PERCENT_MULTIPLIER*10/100, 500*10**18, DEBT_LOAD_MULTIPLIER*50/100);
    }

    /**
     * @notice Create DebtProposal
     * @param debtLAmount Amount of debt in liquid tokens
     * @param interest Annual interest rate multiplied by INTEREST_MULTIPLIER (to allow decimal numbers)
     * @param pAmountMax Max amount of pTokens to use as collateral
     * @param descriptionHash Hash of loan description
     * @return Index of created DebtProposal
     */
    function createDebtProposal(uint256 debtLAmount, uint256 interest, uint256 pAmountMax, bytes32 descriptionHash) 
    public operationAllowed(IAccessModule.Operation.CreateDebtProposal) returns(uint256) {
        require(debtLAmount >= limits.lDebtAmountMin, "LoanModule: debtLAmount should be >= lDebtAmountMin");
        require(interest >= limits.debtInterestMin, "LoanModule: interest should be >= debtInterestMin");
        uint256 fullCollateralLAmount = debtLAmount.mul(COLLATERAL_TO_DEBT_RATIO).div(COLLATERAL_TO_DEBT_RATIO_MULTIPLIER);
        uint256 clAmount = fullCollateralLAmount.mul(BORROWER_COLLATERAL_TO_FULL_COLLATERAL_RATIO).div(BORROWER_COLLATERAL_TO_FULL_COLLATERAL_MULTIPLIER);
        uint256 cpAmount = calculatePoolExit(clAmount);
        require(cpAmount <= pAmountMax, "LoanModule: pAmountMax is too low");

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
        DebtProposal storage prop = debtProposals[_msgSender()][proposalIndex];
        prop.supporters.push(_msgSender());
        prop.pledges[_msgSender()] = DebtPledge({
            senderIndex: 0,
            lAmount: clAmount,
            pAmount: cpAmount
        });
        prop.lCovered = prop.lCovered.add(clAmount);
        prop.pCollected = prop.pCollected.add(cpAmount);
        lProposals = lProposals.add(clAmount); //This is ok only while COLLATERAL_TO_DEBT_RATIO == 1

        fundsModule().depositPTokens(_msgSender(), cpAmount);
        emit PledgeAdded(_msgSender(), _msgSender(), proposalIndex, clAmount, cpAmount);
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
    function addPledge(address borrower, uint256 proposal, uint256 pAmount, uint256 lAmountMin) public operationAllowed(IAccessModule.Operation.AddPledge) {
        require(_msgSender() != borrower, "LoanModule: Borrower can not add pledge");
        DebtProposal storage p = debtProposals[borrower][proposal];
        require(p.lAmount > 0, "LoanModule: DebtProposal not found");
        require(!p.executed, "LoanModule: DebtProposal is already executed");
        // p.lCovered/p.pCollected should be the same as original liquidity token to pToken exchange rate
        (uint256 lAmount, , ) = calculatePoolExitInverse(pAmount); 
        require(lAmount >= lAmountMin, "LoanModule: Minimal amount is too high");
        (uint256 minLPledgeAmount, uint256 maxLPledgeAmount)= getPledgeRequirements(borrower, proposal);
        require(maxLPledgeAmount > 0, "LoanModule: DebtProposal is already funded");
        require(lAmount >= minLPledgeAmount, "LoanModule: pledge is too low");
        if (lAmount > maxLPledgeAmount) {
            uint256 pAmountOld = pAmount;
            lAmount = maxLPledgeAmount;
            pAmount = calculatePoolExit(lAmount);
            assert(pAmount <= pAmountOld); // "<=" is used to handle tiny difference between lAmount and maxLPledgeAmount
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
        lProposals = lProposals.add(lAmount); //This is ok only while COLLATERAL_TO_DEBT_RATIO == 1
        fundsModule().depositPTokens(_msgSender(), pAmount);
        emit PledgeAdded(_msgSender(), borrower, proposal, lAmount, pAmount);
    }

    /**
     * @notice Withdraw pledge from DebtProposal
     * @param borrower Address of borrower
     * @param proposal Index of borrowers's proposal
     * @param pAmount Amount of pTokens to withdraw
     */
    function withdrawPledge(address borrower, uint256 proposal, uint256 pAmount) public operationAllowed(IAccessModule.Operation.WithdrawPledge) {
        require(_msgSender() != borrower, "LoanModule: Borrower can not withdraw pledge");
        DebtProposal storage p = debtProposals[borrower][proposal];
        require(p.lAmount > 0, "LoanModule: DebtProposal not found");
        require(!p.executed, "LoanModule: DebtProposal is already executed");
        DebtPledge storage pledge = p.pledges[_msgSender()];
        require(pAmount <= pledge.pAmount, "LoanModule: Can not withdraw more than locked");
        uint256 lAmount; 
        if (pAmount == pledge.pAmount) {
            // User withdraws whole pledge
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
        lProposals = lProposals.sub(lAmount); //This is ok only while COLLATERAL_TO_DEBT_RATIO == 1

        //Check new min/max pledge AFTER current collateral is adjusted to new values
        //Pledge left should either be 0 or >= minLPledgeAmount
        (uint256 minLPledgeAmount,)= getPledgeRequirements(borrower, proposal); 
        require(pledge.lAmount >= minLPledgeAmount || pledge.pAmount == 0, "LoanModule: pledge left is too small");

        fundsModule().withdrawPTokens(_msgSender(), pAmount);
        emit PledgeWithdrawn(_msgSender(), borrower, proposal, lAmount, pAmount);
    }

    /**
     * @notice Execute DebtProposal
     * @dev Creates Debt using data of DebtProposal
     * @param proposal Index of DebtProposal
     * @return Index of created Debt
     */
    function executeDebtProposal(uint256 proposal) public operationAllowed(IAccessModule.Operation.ExecuteDebtProposal) returns(uint256) {
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

        // NOTE: calculations below expect p.lCovered == p.lAmount. This may be wrong if COLLATERAL_TO_DEBT_RATIO != 1
        lProposals = lProposals.sub(p.lCovered);
        lDebts = lDebts.add(p.lAmount);

        //uint256 debtLoad = DEBT_LOAD_MULTIPLIER.mul(lDebts).div(fundsModule().lBalance().add(lDebts.sub(p.lAmount)));
        uint256 maxDebts = limits.debtLoadMax.mul(fundsModule().lBalance().add(lDebts.sub(p.lAmount))).div(DEBT_LOAD_MULTIPLIER);
        require(lDebts <= maxDebts, "LoanModule: DebtProposal can not be executed now because of debt loan limit");

        //Move locked pTokens to Funds
        uint256[] memory amounts = new uint256[](p.supporters.length);
        for (uint256 i=0; i < p.supporters.length; i++) {
            address supporter = p.supporters[i];
            amounts[i] = p.pledges[supporter].pAmount;
        }
        fundsModule().lockPTokens(p.supporters, amounts);

        increaseActiveDebts(_msgSender());
        fundsModule().withdrawLTokens(_msgSender(), p.lAmount);
        emit DebtProposalExecuted(_msgSender(), proposal, debtIdx, p.lAmount);
        return debtIdx;
    }

    /**
     * @notice Repay amount of lToken and unlock pTokens
     * @param debt Index of Debt
     * @param lAmount Amount of liquid tokens to repay (it will not take more than needed for full debt repayment)
     */
    function repay(uint256 debt, uint256 lAmount) public operationAllowed(IAccessModule.Operation.Repay) {
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
        uint256 poolInterest = pInterest.mul(p.pledges[_msgSender()].lAmount).div(p.lCovered);

        fundsModule().depositLTokens(_msgSender(), lAmount); 
        fundsModule().distributePTokens(poolInterest);
        fundsModule().mintAndLockPTokens(pInterest.sub(poolInterest));

        emit Repay(_msgSender(), debt, d.lAmount, lAmount, actualInterest, pInterest, d.lastPayment);

        if (d.lAmount == 0) {
            //Debt is fully repaid
            decreaseActiveDebts(_msgSender());
            withdrawUnlockedPledge(_msgSender(), debt);
        }
    }

    function repayPTK(uint256 debt, uint256 pAmount, uint256 lAmountMin) public operationAllowed(IAccessModule.Operation.Repay) {
        Debt storage d = debts[_msgSender()][debt];
        require(d.lAmount > 0, "LoanModule: Debt is already fully repaid"); //Or wrong debt index
        require(!_isDebtDefaultTimeReached(d), "LoanModule: debt is already defaulted");
        DebtProposal storage p = debtProposals[_msgSender()][d.proposal];
        require(p.lAmount > 0, "LoanModule: DebtProposal not found");

        (, uint256 lAmount,) = fundsModule().calculatePoolExitInverse(pAmount);
        require(lAmount >= lAmountMin, "LoanModule: Minimal amount is too high");

        uint256 lInterest = calculateInterestPayment(d.lAmount, p.interest, d.lastPayment, now);
        uint256 actualInterest;
        if (lAmount < lInterest) {
            uint256 paidTime = now.sub(d.lastPayment).mul(lAmount).div(lInterest);
            assert(d.lastPayment + paidTime <= now);
            d.lastPayment = d.lastPayment.add(paidTime);
            actualInterest = lAmount;
        } else {
            uint256 fullRepayLAmount = d.lAmount.add(lInterest);
            if (lAmount > fullRepayLAmount) {
                lAmount = fullRepayLAmount;
                pAmount = calculatePoolExitWithFee(lAmount);
            }

            d.lastPayment = now;
            uint256 debtReturned = lAmount.sub(lInterest);
            d.lAmount = d.lAmount.sub(debtReturned);
            lDebts = lDebts.sub(debtReturned);
            actualInterest = lInterest;
        }

        //current liquidity already includes lAmount, which was never actually withdrawn, so we need to remove it here
        uint256 pInterest = calculatePoolEnter(actualInterest, lAmount); 
        d.pInterest = d.pInterest.add(pInterest);
        uint256 poolInterest = pInterest.mul(p.pledges[_msgSender()].lAmount).div(p.lAmount);

        liquidityModule().withdrawForRepay(_msgSender(), pAmount);
        fundsModule().distributePTokens(poolInterest);
        fundsModule().mintAndLockPTokens(pInterest.sub(poolInterest));

        emit Repay(_msgSender(), debt, d.lAmount, lAmount, actualInterest, pInterest, d.lastPayment);

        if (d.lAmount == 0) {
            //Debt is fully repaid
            decreaseActiveDebts(_msgSender());
            withdrawUnlockedPledge(_msgSender(), debt);
        }
    }

    function repayAllInterest(address borrower) public {
        require(_msgSender() == getModuleAddress(MODULE_LIQUIDITY), "LoanModule: call only allowed from LiquidityModule");
        Debt[] storage userDebts = debts[borrower];
        if (userDebts.length == 0) return;
        uint256 totalLFee;
        uint256 totalPWithdraw;
        uint256 totalPInterestToDistribute;
        uint256 totalPInterestToMint;
        uint256 activeDebtCount = 0;
        for (uint256 i=userDebts.length-1; i >= 0; i--){
            Debt storage d = userDebts[i];
            // bool isUnpaid = (d.lAmount != 0);
            // bool isDefaulted = _isDebtDefaultTimeReached(d);
            // if (isUnpaid && !isDefaulted){                      
            if ((d.lAmount != 0) && !_isDebtDefaultTimeReached(d)){ //removed isUnpaid and isDefaulted variables to preent "Stack too deep" error
                DebtProposal storage p = debtProposals[borrower][d.proposal];
                uint256 lInterest = calculateInterestPayment(d.lAmount, p.interest, d.lastPayment, now);
                totalPWithdraw = totalPWithdraw.add(calculatePoolExitWithFee(lInterest, totalLFee));
                totalLFee = totalLFee.add(calculateExitFee(lInterest));

                //Update debt
                d.lastPayment = now;
                //current liquidity already includes totalLFee, which was never actually withdrawn, so we need to remove it here
                uint256 pInterest = calculatePoolEnter(lInterest, lInterest.add(totalLFee)); 
                d.pInterest = d.pInterest.add(pInterest);
                uint256 poolInterest = pInterest.mul(p.pledges[_msgSender()].lAmount).div(p.lAmount);
                totalPInterestToDistribute = totalPInterestToDistribute.add(poolInterest);
                totalPInterestToMint = totalPInterestToMint.add(pInterest.sub(poolInterest));

                emit Repay(borrower, i, d.lAmount, lInterest, lInterest, pInterest, d.lastPayment);

                activeDebtCount++;
                if (activeDebtCount >= activeDebts[borrower]) break;
            }
        }
        if (totalPWithdraw > 0) {
            liquidityModule().withdrawForRepay(borrower, totalPWithdraw);
            fundsModule().distributePTokens(totalPInterestToDistribute);
            fundsModule().mintAndLockPTokens(totalPInterestToMint);
        } else {
            assert(totalPInterestToDistribute == 0);
            assert(totalPInterestToMint == 0);
        }
    }

    /**
     * @notice Allows anyone to default a debt which is behind it's repay deadline
     * @param borrower Address of borrower
     * @param debt Index of borrowers's debt
     */
    function executeDebtDefault(address borrower, uint256 debt) public operationAllowed(IAccessModule.Operation.ExecuteDebtDefault) {
        Debt storage dbt = debts[borrower][debt];
        require(dbt.lAmount > 0, "LoanModule: debt is fully repaid");
        require(!dbt.defaultExecuted, "LoanModule: default is already executed");
        require(_isDebtDefaultTimeReached(dbt), "LoanModule: not enough time passed");
        DebtProposal storage proposal = debtProposals[borrower][dbt.proposal];
        DebtPledge storage borrowerPledge = proposal.pledges[borrower];

        withdrawDebtDefaultPayment(borrower, debt);

        uint256 pLockedBorrower = borrowerPledge.pAmount.mul(dbt.lAmount).div(proposal.lAmount);
        uint256 pUnlockedBorrower = borrowerPledge.pAmount.sub(pLockedBorrower);
        uint256 pSupportersPledge = proposal.pCollected.sub(borrowerPledge.pAmount);
        uint256 pLockedSupportersPledge = pSupportersPledge.mul(dbt.lAmount).div(proposal.lAmount);
        uint256 pLocked = pLockedBorrower.add(pLockedSupportersPledge);
        dbt.defaultExecuted = true;
        lDebts = lDebts.sub(dbt.lAmount);
        uint256 pExtra;
        if (pUnlockedBorrower > pLockedSupportersPledge){
            pExtra = pUnlockedBorrower - pLockedSupportersPledge;
            fundsModule().distributePTokens(pExtra);
        }
        fundsModule().burnLockedPTokens(pLocked.add(pExtra));
        decreaseActiveDebts(borrower);
        emit DebtDefaultExecuted(borrower, debt, pLocked);
    }

    /**
     * @notice Withdraw part of the pledge which is already unlocked (borrower repaid part of the debt) + interest
     * @param borrower Address of borrower
     * @param debt Index of borrowers's debt
     */
    function withdrawUnlockedPledge(address borrower, uint256 debt) public operationAllowed(IAccessModule.Operation.WithdrawUnlockedPledge) {
        (, uint256 pUnlocked, uint256 pInterest, uint256 pWithdrawn) = calculatePledgeInfo(borrower, debt, _msgSender());

        uint256 pUnlockedPlusInterest = pUnlocked.add(pInterest);
        require(pUnlockedPlusInterest > pWithdrawn, "LoanModule: nothing to withdraw");
        uint256 pAmount = pUnlockedPlusInterest.sub(pWithdrawn);

        Debt storage dbt = debts[borrower][debt];
        dbt.claimedPledges[_msgSender()] = dbt.claimedPledges[_msgSender()].add(pAmount);
        
        fundsModule().unlockAndWithdrawPTokens(_msgSender(), pAmount);
        emit UnlockedPledgeWithdraw(_msgSender(), borrower, dbt.proposal, debt, pAmount);
    }

    function setLimits(
        uint256 lDebtAmountMin, 
        uint256 debtInterestMin, 
        uint256 pledgePercentMin, 
        uint256 lMinPledgeMax,
        uint256 debtLoadMax
    ) public onlyOwner {
        require(lDebtAmountMin > 0, "LoanModule: lDebtAmountMin should be > 0");
        limits.lDebtAmountMin = lDebtAmountMin;
        limits.debtInterestMin = debtInterestMin;
        limits.pledgePercentMin = pledgePercentMin;
        limits.lMinPledgeMax = lMinPledgeMax;
        limits.debtLoadMax = debtLoadMax;
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
    function isDebtDefaultTimeReached(address borrower, uint256 debt) public view returns(bool) {
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
    function calculatePledgeInfo(address borrower, uint256 debt, address supporter) public view
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
                if (dbt.defaultExecuted || _isDebtDefaultTimeReached(dbt)) {
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
            pInterest = dbt.pInterest.mul(lPledge).div(proposal.lCovered);
            assert(pInterest <= dbt.pInterest);
            if (dbt.defaultExecuted || _isDebtDefaultTimeReached(dbt)) {
                DebtPledge storage dpb = proposal.pledges[borrower];
                uint256 pLockedBorrower = dpb.pAmount.mul(dbt.lAmount).div(proposal.lAmount);
                uint256 pUnlockedBorrower = dpb.pAmount.sub(pLockedBorrower);
                uint256 pCompensation = pUnlockedBorrower.mul(lPledge).div(proposal.lCovered.sub(dpb.lAmount));
                if (pCompensation > pLocked) {
                    pCompensation = pLocked;
                }
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
    function getRequiredPledge(address borrower, uint256 proposal) public view returns(uint256){
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
        // uint256 pledgePercentMin;   // Minimal pledge as percent of credit amount. Value is divided to PLEDGE_PERCENT_MULTIPLIER for calculations
        // uint256 lMinPledgeMax;      // Maximal value of minimal pledge (in liquid tokens), works together with pledgePercentMin

        DebtProposal storage p = debtProposals[borrower][proposal];
        if (p.executed) return (0, 0);
        uint256 fullCollateralLAmount = p.lAmount.mul(COLLATERAL_TO_DEBT_RATIO).div(COLLATERAL_TO_DEBT_RATIO_MULTIPLIER);
        maxLPledge = fullCollateralLAmount.sub(p.lCovered);

        minLPledge = limits.pledgePercentMin.mul(fullCollateralLAmount).div(PLEDGE_PERCENT_MULTIPLIER);
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
     * @param borrower Address to check
     * @return True if borrower has unpaid debts
     */
    function hasActiveDebts(address borrower) public view returns(bool) {
        return activeDebts[borrower] > 0;
    }

    /**
     * @notice Calculates unpaid interest on all actve debts of the borrower
     * @dev This function may use a lot of gas, so it is not recommended to call it in the context of transaction. Use payAllInterest() instead.
     * @param borrower Address of borrower
     * @return summ of interest payments on all unpaid debts, summ of all interest payments per second
     */
    function getUnpaidInterest(address borrower) public view returns(uint256 totalLInterest, uint256 totalLInterestPerSecond){
        Debt[] storage userDebts = debts[borrower];
        if (userDebts.length == 0) return (0, 0);
        uint256 activeDebtCount;
        for (uint256 i=userDebts.length-1; i >= 0; i--){
            Debt storage d = userDebts[i];
            bool isUnpaid = (d.lAmount != 0);
            bool isDefaulted = _isDebtDefaultTimeReached(d);
            if (isUnpaid && !isDefaulted){
                DebtProposal storage p = debtProposals[borrower][d.proposal];
                uint256 lInterest = calculateInterestPayment(d.lAmount, p.interest, d.lastPayment, now);
                uint256 lInterestPerSecond = lInterest.div(now.sub(d.lastPayment));
                totalLInterest = totalLInterest.add(lInterest);
                totalLInterestPerSecond = totalLInterestPerSecond.add(lInterestPerSecond);

                activeDebtCount++;
                if (activeDebtCount >= activeDebts[borrower]) break;
            }
        }
    }

    /**
     * @notice Total amount of debts
     * @return Sum of all liquid token in debts
     */
    function totalLDebts() public view returns(uint256){
        return lDebts;
    }

    /**
     * @notice Total amount of collateral locked in proposals
     * Although this is measured in liquid tokens, it's not actual tokens,
     * just a value wich is supposed to represent the collateral locked in proposals.
     * @return Sum of all collaterals in proposals
     */
    function totalLProposals() public view returns(uint256){
        return lProposals;
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
     * @notice Calculates how many pTokens should be given to user for increasing liquidity
     * @param lAmount Amount of liquid tokens which will be put into the pool
     * @param liquidityCorrection Amount of liquid tokens to remove from liquidity because it was "virtually" withdrawn
     * @return Amount of pToken which should be sent to sender
     */
    function calculatePoolEnter(uint256 lAmount, uint256 liquidityCorrection) internal view returns(uint256) {
        return fundsModule().calculatePoolEnter(lAmount, liquidityCorrection);
    }

    /**
     * @notice Calculates how many pTokens should be taken from user for decreasing liquidity
     * @param lAmount Amount of liquid tokens which will be removed from the pool
     * @return Amount of pToken which should be taken from sender
     */
    function calculatePoolExit(uint256 lAmount) internal view returns(uint256) {
        return fundsModule().calculatePoolExit(lAmount);
    }
    
    function calculatePoolExitWithFee(uint256 lAmount) internal view returns(uint256) {
        return fundsModule().calculatePoolExitWithFee(lAmount);
    }

    function calculatePoolExitWithFee(uint256 lAmount, uint256 liquidityCorrection) internal view returns(uint256) {
        return fundsModule().calculatePoolExitWithFee(lAmount, liquidityCorrection);
    }

    /**
     * @notice Calculates how many liquid tokens should be removed from pool when decreasing liquidity
     * @param pAmount Amount of pToken which should be taken from sender
     * @return Amount of liquid tokens which will be removed from the pool: total, part for sender, part for pool
     */
    function calculatePoolExitInverse(uint256 pAmount) internal view returns(uint256, uint256, uint256) {
        return fundsModule().calculatePoolExitInverse(pAmount);
    }

    function calculateExitFee(uint256 lAmount) internal view returns(uint256){
        return ICurveModule(getModuleAddress(MODULE_CURVE)).calculateExitFee(lAmount);
    }

    function fundsModule() internal view returns(IFundsModule) {
        return IFundsModule(getModuleAddress(MODULE_FUNDS));
    }

    function liquidityModule() internal view returns(ILiquidityModule) {
        return ILiquidityModule(getModuleAddress(MODULE_LIQUIDITY));
    }

    function pToken() internal view returns(IPToken){
        return IPToken(getModuleAddress(MODULE_PTOKEN));
    }

    function increaseActiveDebts(address borrower) private {
        activeDebts[borrower] = activeDebts[borrower].add(1);
    }

    function decreaseActiveDebts(address borrower) private {
        activeDebts[borrower] = activeDebts[borrower].sub(1);
    }

    function withdrawDebtDefaultPayment(address borrower, uint256 debt) private {
        Debt storage d = debts[borrower][debt];
        DebtProposal storage p = debtProposals[borrower][d.proposal];
        uint256 lInterest = calculateInterestPayment(d.lAmount, p.interest, d.lastPayment, now);
        uint256 lAmount = d.lAmount.add(lInterest);
        uint256 pAmount = calculatePoolExitWithFee(lAmount);
        uint256 pBalance = pToken().balanceOf(borrower);
        if (pBalance == 0) return;

        if (pAmount > pBalance) {
            pAmount = pBalance;
            (, lAmount,) = fundsModule().calculatePoolExitInverse(pAmount);
        }
        
        uint256 actualInterest;
        if (lAmount < lInterest) {
            uint256 paidTime = now.sub(d.lastPayment).mul(lAmount).div(lInterest);
            assert(d.lastPayment + paidTime <= now);
            d.lastPayment = d.lastPayment.add(paidTime);
            actualInterest = lAmount;
        } else {
            d.lastPayment = now;
            uint256 debtReturned = lAmount.sub(lInterest);
            d.lAmount = d.lAmount.sub(debtReturned);
            lDebts = lDebts.sub(debtReturned);
            actualInterest = lInterest;
        }

        //current liquidity already includes lAmount, which was never actually withdrawn, so we need to remove it here
        uint256 pInterest = calculatePoolEnter(actualInterest, lAmount); 
        d.pInterest = d.pInterest.add(pInterest);
        uint256 poolInterest = pInterest.mul(p.pledges[borrower].lAmount).div(p.lAmount);

        liquidityModule().withdrawForRepay(borrower, pAmount);
        fundsModule().distributePTokens(poolInterest);
        fundsModule().mintAndLockPTokens(pInterest.sub(poolInterest));

        emit Repay(borrower, debt, d.lAmount, lAmount, actualInterest, pInterest, d.lastPayment);
    }

    function _isDebtDefaultTimeReached(Debt storage dbt) private view returns(bool) {
        uint256 timeSinceLastPayment = now.sub(dbt.lastPayment);
        return timeSinceLastPayment > DEBT_REPAY_DEADLINE_PERIOD;
    }
}