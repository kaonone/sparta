pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/curve/IFundsModule.sol";
import "../../interfaces/curve/ILoanModule.sol";
import "../../token/pTokens/PToken.sol";
import "../../common/Module.sol";

contract LoanModule is Module, ILoanModule {
    uint256 public constant INTEREST_MULTIPLIER = 10**3;    // Multiplier to store interest rate (decimal) in int
    uint256 public constant ANNUAL_SECONDS = 365*24*60*60+(24*60*60/4);  // Seconds in a year + 1/4 day to compensate leap years

    struct DebtPledge {
        uint256 senderIndex;  //Index of pledge sender in the array
        uint256 lAmount;      //Amount of liquid tokens, covered by this pledge
        uint256 pAmount;      //Amount of pTokens locked for this pledge
    }

    struct DebtProposal {
        uint256 lAmount;             //Amount of proposed credit (in liquid token)
        uint256 interest;            //Annual interest rate multiplied by INTEREST_MULTIPLIER
        mapping(address => DebtPledge) pledges;    //Map of all user pledges (this value will not change after proposal )
        address[] supporters;       //Array of all supporters, first supporter (with zero index) is borrower himself
        bool executed;              //If Debt is created for this proposal
    }

    struct Debt {
        uint256 proposal;           // Index of DebtProposal in adress's proposal list
        uint256 lAmount;            // Current amount of debt (in liquid token). If 0 - debt is fully paid
        uint256 lastPayment;        // Timestamp of last interest payment (can be timestamp of last payment or a virtual date untill which interest is paid)
        uint256 pInterest;          // Amount of pTokens minted as interest for this debt
        mapping(address => uint256) claimedPledges;  //Amount of pTokens already claimed by supporter
    }

    mapping(address=>DebtProposal[]) public debtProposals;
    mapping(address=>Debt[]) public debts;

    uint256 private lDebts;

    function initialize(address _pool) public initializer {
        Module.initialize(_pool);
    }

    /**
     * @notice Create DebtProposal
     * @param debtLAmount Amount of debt in liquid tokens
     * @param interest Annual interest rate multiplied by INTEREST_MULTIPLIER (to allow decimal numbers)
     * @param pAmount Amount of pTokens to use as collateral
     * @param lAmountMin Minimal amount of liquid tokens used as collateral.
     * @return Index of created DebtProposal
     */
    function createDebtProposal(uint256 debtLAmount, uint256 interest, uint256 pAmount, uint256 lAmountMin) public returns(uint256){
        require(debtLAmount > 0, "FundsModule: DebtProposal amount should not be 0");
        (uint256 clAmount, , ) = calculatePoolExitInverse(pAmount);
        require(clAmount >= lAmountMin, "FundsModule: Minimal amount is too high");
        require(clAmount >= debtLAmount/2, "FundsModule: Less then 50% of loan is covered by borrower");

        fundsModule().depositPTokens(_msgSender(), pAmount);
        debtProposals[_msgSender()].push(DebtProposal({
            lAmount: debtLAmount,
            interest: interest,
            supporters: new address[](0),
            executed: false
        }));
        uint256 proposalIndex = debtProposals[_msgSender()].length-1;
        emit DebtProposalCreated(_msgSender(), proposalIndex, debtLAmount, interest);
        DebtProposal storage p = debtProposals[_msgSender()][proposalIndex];
        p.supporters.push(_msgSender());
        p.pledges[_msgSender()] = DebtPledge({
            senderIndex: 0,
            lAmount: clAmount,
            pAmount: pAmount
        });
        emit PledgeAdded(_msgSender(), _msgSender(), proposalIndex, clAmount, pAmount);
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
        DebtProposal storage p = debtProposals[borrower][proposal];
        require(p.lAmount > 0, "FundsModule: DebtProposal not found");
        require(!p.executed, "FundsModule: DebtProposal is already executed");
        (uint256 lAmount, , ) = calculatePoolExitInverse(pAmount);
        require(lAmount >= lAmountMin, "FundsModule: Minimal amount is too high");
        uint256 rlAmount= getRequiredPledge(borrower, proposal);
        require(rlAmount > 0, "FundsModule: DebtProposal is already funded");
        if (lAmount > rlAmount) {
            uint256 pAmountOld = pAmount;
            lAmount = rlAmount;
            pAmount = calculatePoolExit(lAmount);
            assert(pAmount <= pAmountOld);
        } 
        fundsModule().depositPTokens(_msgSender(), pAmount);
        if (p.pledges[_msgSender()].senderIndex == 0 && _msgSender() != borrower) {
            p.supporters.push(_msgSender());
            p.pledges[_msgSender()] = DebtPledge({
                senderIndex: p.supporters.length-1,
                lAmount: lAmount,
                pAmount: pAmount
            });
        } else {
            p.pledges[_msgSender()].lAmount += lAmount;
            p.pledges[_msgSender()].pAmount += pAmount;
        }
        emit PledgeAdded(_msgSender(), borrower, proposal, lAmount, pAmount);
    }

    /**
     * @notice Withdraw pledge from DebtProposal
     * @param borrower Address of borrower
     * @param proposal Index of borrowers's proposal
     * @param pAmount Amount of pTokens to withdraw
     */
    function withdrawPledge(address borrower, uint256 proposal, uint256 pAmount) public {
        DebtProposal storage p = debtProposals[borrower][proposal];
        require(p.lAmount > 0, "FundsModule: DebtProposal not found");
        require(!p.executed, "FundsModule: DebtProposal is already executed");
        DebtPledge storage pledge = p.pledges[_msgSender()];
        require(pAmount <= pledge.pAmount, "FundsModule: Can not withdraw more then locked");
        uint256 lAmount; 
        if (pAmount == pledge.pAmount) {
            lAmount = pledge.lAmount;
        } else {
            // pAmount < pledge.pAmount
            lAmount = pledge.lAmount * pAmount / pledge.pAmount;
            assert(lAmount < pledge.lAmount);
        }
        if (_msgSender() == borrower) {
            require(pledge.lAmount - lAmount >= p.lAmount/2, "FundsModule: Borrower's pledge should cover at least half of debt amount");
        }
        pledge.pAmount -= pAmount;
        pledge.lAmount -= lAmount;
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
        require(p.lAmount > 0, "FundsModule: DebtProposal not found");
        require(getRequiredPledge(_msgSender(), proposal) == 0, "FundsModule: DebtProposal is not fully funded");
        require(!p.executed, "FundsModule: DebtProposal is already executed");
        debts[_msgSender()].push(Debt({
            proposal: proposal,
            lAmount: p.lAmount,
            lastPayment: now,
            pInterest: 0
        }));
        // We do not initialize pledges map here to save gas!
        // Instead we check PledgeAmount.initialized field and do lazy initialization
        p.executed = true;
        uint256 debtIdx = debts[_msgSender()].length-1; //It's important to save index before calling external contract
        lDebts += p.lAmount;
        fundsModule().withdrawLTokens(_msgSender(), p.lAmount);
        emit DebtProposalExecuted(_msgSender(), proposal, debtIdx, p.lAmount);
    }

    /**
     * @notice Repay amount of lToken and unlock pTokens
     * @param debt Index of Debt
     * @param lAmount Amount of liquid tokens to repay
     */
    function repay(uint256 debt, uint256 lAmount) public {
        Debt storage d = debts[_msgSender()][debt];
        require(d.lAmount > 0, "FundsModule: Debt is already fully repaid"); //Or wrong debt index
        DebtProposal storage p = debtProposals[_msgSender()][d.proposal];
        require(p.lAmount > 0, "FundsModule: DebtProposal not found");

        uint256 lInterest = calculateInterestPayment(d.lAmount, p.interest, d.lastPayment, now);
        require(lAmount <= d.lAmount+lInterest, "FundsModule: can not repay more then debt.lAmount + interest");

        fundsModule().depositLTokens(_msgSender(), lAmount); //TODO Think of reentrancy here. Which operation should be first?

        uint256 actualInterest;
        if (lAmount < lInterest) {
            uint256 paidTime = (now - d.lastPayment) * lAmount / lInterest;
            assert(d.lastPayment + paidTime <= now);
            d.lastPayment += paidTime;
            actualInterest = lAmount;
        } else {
            d.lastPayment = now;
            uint256 debtReturned = lAmount - lInterest;
            d.lAmount -= debtReturned;
            assert(lDebts >= debtReturned);
            lDebts -= debtReturned;
            actualInterest = lInterest;
        }

        //Mint pTokens to pay interest for supporters
        uint256 pInterest = calculatePoolEnter(actualInterest);
        fundsModule().mintPTokens(getModuleAddress(MODULE_FUNDS), pInterest);

        //TODO: Think how to update supporters balance
        d.pInterest += pInterest;

        emit Repay(_msgSender(), debt, d.lAmount, lAmount, actualInterest, d.lastPayment);
    }

    /**
     * @notice Withdraw part of the pledge which is already unlocked (borrower repaid part of the debt) + interest
     * @param borrower Address of borrower
     * @param debt Index of borrowers's debt
     */
    function withdrawUnlockedPledge(address borrower, uint256 debt) public {
        (, uint256 pUnlocked, uint256 pInterest, uint256 pWithdrawn) = calculatePledgeInfo(borrower, debt, _msgSender());

        uint256 pUnlockedPlusInterest = pUnlocked + pInterest;
        require(pUnlockedPlusInterest > pWithdrawn, "FundsModule: nothing to withdraw");
        uint256 pAmount = pUnlockedPlusInterest - pWithdrawn;

        Debt storage dbt = debts[borrower][debt];
        dbt.claimedPledges[_msgSender()] += pAmount;
        fundsModule().withdrawPTokens(_msgSender(), pAmount);
        emit UnlockedPledgeWithdraw(_msgSender(), borrower, debt, pAmount);
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
        DebtProposal storage proposal = debtProposals[_msgSender()][dbt.proposal];
        require(proposal.lAmount > 0 && proposal.executed, "FundsModule: DebtProposal not found");

        DebtPledge storage dp = proposal.pledges[supporter];

        //Do not count 50% of debt for borrower in following calculations 
        uint256 pPledge;
        uint256 lPledge;
        if (supporter == borrower) {
            lPledge = dp.lAmount - proposal.lAmount/2;       //Only pay interest for part of the pledge which is on top of 50% 
            pPledge = dp.pAmount - (proposal.lAmount*dp.pAmount)/(dp.lAmount*2); //Decrease pledge for calculations of unlocked amount
        } else {
            lPledge = dp.lAmount;
            pPledge = dp.pAmount;
        }

        pLocked = pPledge * dbt.lAmount / proposal.lAmount;
        assert(pLocked <= pPledge);
        pUnlocked = pPledge - pLocked;

        pInterest = dbt.pInterest * lPledge / proposal.lAmount;
        assert(pInterest <= dbt.pInterest);

        //Unlock 50% of debt only after it is fully paid
        if (supporter == borrower) {
            if (dbt.lAmount == 0) {
                pLocked = 0;
                pUnlocked = dp.pAmount;
            } else {
                pLocked += (proposal.lAmount*dp.pAmount)/(dp.lAmount*2);
            }
        }

        pWithdrawn = dbt.claimedPledges[supporter];
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
        uint256 covered = 0;
        for (uint256 i = 0; i < p.supporters.length; i++) {
            address s = p.supporters[i];
            covered += p.pledges[s].lAmount;
        }
        assert(covered <= p.lAmount);
        return  p.lAmount - covered;
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
        require(p.lAmount > 0, "FundsModule: DebtProposal not found");

        uint256 interest = calculateInterestPayment(d.lAmount, p.interest, d.lastPayment, now);
        return (d.lAmount, interest);
    }

    /**
     * @notice Check if user has active debts
     * @param sender Address to check
     * @return True if sender has unpaid debts
     */
    function hasActiveDebts(address sender) public view returns(bool) {
        // return false;
        //TODO: iterating through all debts may be too expensive if there are a lot of closed debts. Need to test this and find solution
        Debt[] storage userDebts = debts[sender];
        if(userDebts.length == 0) return false;
        for (uint256 i=userDebts.length-1; i >= 0; i--){ //searching in reverse order because probability to find active loan is higher for latest loans
            if (userDebts[i].lAmount == 0) return true;
        }
        return false;
    }

    /**
     * @notice Total amount of debts
     * @return Summ of all liquid token debts
     */
    function totalLDebts() public view returns(uint256){
        return lDebts;
    }

    /**
     * @notice Calculates interest amount for a debt
     * @param debtLAmount Current amount of debt
     * @param interest Annual interest rate multiplied by INTEREST_MULTIPLIER
     * @param prevPayment Timestamp of previous payment
     * @param currentPayment Timestamp of current payment
     */
    function calculateInterestPayment(uint256 debtLAmount, uint256 interest, uint256 prevPayment, uint currentPayment) public pure returns(uint256){
        require(prevPayment <= currentPayment, "FundsModule: prevPayment should be before currentPayment");
        uint256 annualInterest = debtLAmount * interest / INTEREST_MULTIPLIER;
        uint256 time = currentPayment - prevPayment;
        return time * annualInterest / ANNUAL_SECONDS;
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
}