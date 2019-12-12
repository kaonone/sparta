pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/curve/IFundsModule.sol";
import "../../interfaces/curve/ICurveModule.sol";
import "../../token/pTokens/PToken.sol";
import "../../common/Module.sol";

contract FundsModule is Module, IFundsModule {
    uint256 public constant INTEREST_MULTIPLIER = 10**3;    // Multiplier to store interest rate (decimal) in int

    IERC20 public lToken;
    PToken public pToken;

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

    struct PledgeAmount {
        bool initialized;   //If !initialized, we need first load amount from DebtProposal
        uint256 pAmount;     //Amount of pTokens stored by Funds for this pledge. Locked + unlocked. 
    }

    struct Debt {
        uint256 proposal;   // Index of DebtProposal in adress's proposal list
        uint256 lAmount;     // Current amount of debt (in liquid token). If 0 - debt is fully paid
        mapping(address => PledgeAmount) pledges; //Map of all tokens (pledges) stored (some may be unlocked) in this debt by users.
    }

    mapping(address=>DebtProposal[]) public debtProposals;
    mapping(address=>Debt[]) public debts;

    uint256 public totalDebts;  //Sum of all debts amounts (in liquid tokens)

    function initialize(address sender, address _pool, IERC20 _lToken, PToken _pToken) public initializer {
        Module.initialize(sender, _pool);
        lToken = _lToken;
        pToken = _pToken;
    }

    /*
     * @notice Deposit amount of lToken and mint pTokens
     * @param lAmount Amount of liquid tokens to invest
     * @param pAmountMin Minimal amout of pTokens suitable for sender
     */ 
    function deposit(uint256 lAmount, uint256 pAmountMin) public {
        require(lAmount > 0, "FundsModule: amount should not be 0");
        require(!hasActiveDebts(_msgSender()), "FundsModule: Deposits forbidden if address has active debts");
        require(lToken.transferFrom(_msgSender(), address(this), lAmount), "FundsModule: Deposit of liquid token failed");
        uint pAmount = calculatePoolEnter(lAmount);
        require(pAmount >= pAmountMin, "FundsModule: Minimal amount is too high");
        require(pToken.mint(_msgSender(), pAmount), "FundsModule: Mint of pToken failed");
        emit Deposit(_msgSender(), lAmount, pAmount);
    }

    /**
     * @notice Withdraw amount of lToken and burn pTokens
     * @param pAmount Amount of pTokens to send
     * @param lAmountMin Minimal amount of liquid tokens to withdraw
     */
    function withdraw(uint256 pAmount, uint256 lAmountMin) public {
        require(pAmount > 0, "FundsModule: amount should not be 0");
        (uint256 lAmountT, uint256 lAmountU, uint256 lAmountP) = calculatePoolExitInverse(pAmount);
        require(lAmountU >= lAmountMin, "FundsModule: Minimal amount is too high");
        pToken.burnFrom(_msgSender(), pAmount);   //This call will revert if we have not enough allowance or sender has not enough pTokens
        require(lToken.transfer(_msgSender(), lAmountU), "FundsModule: Withdraw of liquid token failed");
        require(lToken.transfer(owner(), lAmountP), "FundsModule: Withdraw of liquid token failed");
        emit Withdraw(_msgSender(), lAmountT, lAmountU, pAmount);
    }

    /**
     * @notice Create DebtProposal
     * @param amount Amount of liquid tokens to borrow
     * @param interest Annual interest rate multiplied by INTEREST_MULTIPLIER (to allow decimal numbers)
     * @return Index of created DebtProposal
     */
    function createDebtProposal(uint256 amount, uint256 interest) public returns(uint256){
        require(amount > 0, "FundsModule: DebtProposal amount should not be 0");
        uint256 lAmount = amount/2; //50% of loan should be covered by borrower's pTokens
        uint256 pAmount = calculatePoolExit(lAmount);  
        require(pToken.transferFrom(_msgSender(), address(this), pAmount));
        debtProposals[_msgSender()].push(DebtProposal({
            lAmount: amount,
            interest: interest,
            supporters: new address[](0),
            executed: false
        }));
        uint256 proposalIndex = debtProposals[_msgSender()].length-1;
        emit DebtProposalCreated(_msgSender(), proposalIndex, amount, pAmount);
        DebtProposal storage p = debtProposals[_msgSender()][proposalIndex];
        p.supporters.push(_msgSender());
        p.pledges[_msgSender()] = DebtPledge({
            senderIndex: 0,
            lAmount: lAmount,
            pAmount: pAmount
        });
        emit PledgeAdded(_msgSender(), _msgSender(), proposalIndex, lAmount, pAmount);
    }
    /**
     * @notice Calculates how many tokens are not yet covered by borrower or supporters
     * @param borrower Borrower address
     * @param proposal Proposal index
     * @return amounts of liquid tokens currently required to fully cover proposal
     */
    function getRequiredPledge(address borrower, uint256 proposal) view public returns(uint256){
        DebtProposal storage p = debtProposals[borrower][proposal];
        if(p.executed) return 0;
        uint256 covered = 0;
        for(uint256 i = 0; i < p.supporters.length; i++){
            address s = p.supporters[i];
            covered += p.pledges[s].lAmount;
        }
        assert(covered <= p.lAmount);
        return  p.lAmount - covered;
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
        (uint256 lAmount,,) = calculatePoolExitInverse(pAmount);
        require(lAmount >= lAmountMin, "FundsModule: Minimal amount is too high");
        uint256 rlAmount= getRequiredPledge(borrower, proposal);
        if(lAmount > rlAmount){
            uint256 pAmountOld = pAmount;
            lAmount = rlAmount;
            pAmount = calculatePoolExit(lAmount);
            assert(pAmount <= pAmountOld);
        } 
        require(pToken.transferFrom(_msgSender(), address(this), pAmount));
        if(p.pledges[_msgSender()].senderIndex == 0 && _msgSender() != borrower) {
            p.supporters.push(_msgSender());
            p.pledges[_msgSender()] = DebtPledge({
                senderIndex: p.supporters.length-1,
                lAmount: lAmount,
                pAmount: pAmount
            });
        }else{
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
        if(_msgSender() == borrower){
            require(pledge.lAmount - lAmount >= p.lAmount/2, "FundsModule: Borrower's pledge should cover at least half of debt amount");
        }
        pledge.pAmount -= pAmount;
        pledge.lAmount -= lAmount;
        require(pToken.transfer(_msgSender(), pAmount));
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
            lAmount: p.lAmount
        }));
        // We do not initialize pledges map here to save gas!
        // Instead we check PledgeAmount.initialized field and do lazy initialization
        p.executed = true;
        uint256 debtIdx = debts[_msgSender()].length-1; //It's important to save index before calling external contract
        totalDebts += p.lAmount;
        require(lToken.transfer(_msgSender(), p.lAmount));
        emit DebtProposalExecuted(_msgSender(), proposal, debtIdx, p.lAmount);
    }

    /**
     * @notice Repay amount of lToken and unlock pTokens
     * @param debt Index of Debt
     * @param amount Amount of liquid tokens to repay
     */
    function repay(uint256 debt, uint256 amount) public {
        Debt storage d = debts[_msgSender()][debt];
        require(d.lAmount > 0, "FundsModule: Debt is already fully repaid"); //Or wrong debt index
        require(amount <= d.lAmount, "FundsModule: can not repay more then debt.lAmount");
        DebtProposal storage p = debtProposals[_msgSender()][d.proposal];
        require(p.lAmount > 0, "FundsModule: DebtProposal not found");
        require(lToken.transferFrom(_msgSender(), address(this), amount)); //TODO Think of reentrancy here. Which operation should be first?
        totalDebts -= p.lAmount;
        d.lAmount -= amount;
        emit Repay(_msgSender(), debt, amount);
    }
    /**
     * @notice Withdraw part of the pledge which is already unlocked (borrower repaid part of the debt)
     * @param borrower Address of borrower
     * @param debt Index of borrowers's debt
     */
    function withdrawUnlockedPledge(address borrower, uint256 debt) public {
        Debt storage dbt = debts[_msgSender()][debt];
        DebtProposal storage proposal = debtProposals[_msgSender()][dbt.proposal];
        require(proposal.lAmount > 0 && proposal.executed, "FundsModule: Debt not founs DebtProposal not found");
        // uint256 repaid = proposal.amount - debt.amount;
        // assert(repaid <= proposal.amount);

        DebtPledge storage dp = proposal.pledges[_msgSender()];
        PledgeAmount storage pa = dbt.pledges[_msgSender()];
        if(!pa.initialized){
            pa.pAmount = dp.pAmount;
            pa.initialized = true;
        }
        uint256 senderPartOfUnpaidLToken = dbt.lAmount * dp.lAmount / proposal.lAmount;
        uint256 senderPartOfLockedPToken = calculatePoolEnter(senderPartOfUnpaidLToken);
        require(senderPartOfLockedPToken < pa.pAmount, "FundsModule: Nothing to withdraw");
        uint256 withdrawPAmount = pa.pAmount - senderPartOfLockedPToken;
        pToken.transfer(_msgSender(), withdrawPAmount);
        emit UnlockedPledgeWithdraw(_msgSender(), borrower, debt, withdrawPAmount);


    }

    function totalLiquidAssets() public view returns(uint256) {
        return lToken.balanceOf(address(this));
    }

    function hasActiveDebts(address sender) internal view returns(bool) {
        //TODO: iterating through all debts may be too expensive if there are a lot of closed debts. Need to test this and find solution
        Debt[] storage userDebts = debts[sender];
        for (uint256 i=0; i < userDebts.length; i++){
            if (userDebts[i].lAmount == 0) return true;
        }
        return false;
    }

    function calculatePoolEnter(uint256 lAmount) internal view returns(uint256) {
        return getCurveModule().calculateEnter(totalLiquidAssets(), totalDebts, lAmount);
    }

    function calculatePoolExit(uint256 lAmount) internal view returns(uint256) {
        return getCurveModule().calculateExit(totalLiquidAssets(), lAmount);
    }

    function calculatePoolExitInverse(uint256 pAmount) internal view returns(uint256, uint256, uint256) {
        return getCurveModule().calculateExitInverse(totalLiquidAssets(), pAmount);
    }

    function getCurveModule() private view returns(ICurveModule) {
        return ICurveModule(getModuleAddress("curve"));
    }
}