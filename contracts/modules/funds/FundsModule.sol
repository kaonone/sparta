pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/curve/IFundsModule.sol";
import "../../interfaces/curve/ICurveModule.sol";
import "../../token/pTokens/PToken.sol";
import "../../common/Module.sol";

contract FundsModule is Module, IFundsModule {
    IERC20 public liquidToken;
    PToken public pToken;

    struct DebtPledge {
        uint256 senderIndex;  //Index of pledge sender in the array
        uint256 lAmount;      //Amount of liquid tokens, covered by this pledge
        uint256 pAmount;      //Amount of pTokens locked for this pledge
    }

    struct DebtProposal {
        uint256 amount;             //Amount of proposed credit (in liquid token)
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
        uint256 amount;     // Current amount of debt (in liquid token). If 0 - debt is fully paid
        mapping(address => PledgeAmount) pledges; //Map of all tokens (pledges) stored (some may be unlocked) in this debt by users.
    }

    mapping(address=>DebtProposal[]) public debtProposals;
    mapping(address=>Debt[]) public debts;

    uint256 public totalDebts;  //Sum of all debts amounts

    function initialize(address sender, address _pool, IERC20 _liquidToken, PToken _pToken) public initializer {
        Module.initialize(sender, _pool);
        liquidToken = _liquidToken;
        pToken = _pToken;
    }

    /*
     * @notice Deposit amount of liquidToken and mint pTokens
     * @param amount Amount of liquid tokens to invest
     */ 
    function deposit(uint256 amount) public {
        require(amount > 0, "FundsModule: amount should not be 0");
        require(!hasActiveDebts(_msgSender()), "FundsModule: Deposits forbidden if address has active debts");
        require(liquidToken.transferFrom(_msgSender(), address(this), amount), "FundsModule: Deposit of liquid token failed");
        uint pAmount = calculatePoolEnter(amount);
        require(pToken.mint(_msgSender(), pAmount), "FundsModule: Mint of pToken failed");
        emit Deposit(_msgSender(), amount, pAmount);
    }

    /**
     * @notice Withdraw amount of liquidToken and burn pTokens
     * @param amount Amount of liquid tokens to withdraw
     */
    function withdraw(uint256 amount) public {
        require(amount > 0, "FundsModule: amount should not be 0");
        uint256 pAmount = calculatePoolExit(amount);
        pToken.burnFrom(_msgSender(), pAmount);   //This call will revert if we have not enough allowance or sender has not enough pTokens
        require(liquidToken.transfer(_msgSender(), amount), "FundsModule: Withdraw of liquid token failed");
        emit Withdraw(_msgSender(), amount, pAmount);
    }

    /**
     * @notice Create DebtProposal
     * @param amount Amount of liquid tokens to borrow
     * @return Index of created DebtProposal
     */
    function createDebtProposal(uint256 amount) public returns(uint256){
        require(amount > 0, "FundsModule: DebtProposal amount should not be 0");
        uint256 lAmount = amount/2; //50% of loan should be covered by borrower's pTokens
        uint256 pAmount = calculatePoolExit(lAmount);  
        require(pToken.transferFrom(_msgSender(), address(this), pAmount));
        debtProposals[_msgSender()].push(DebtProposal({
            amount: amount,
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
        assert(covered <= p.amount);
        return  p.amount - covered;
    }

    /**
     * @notice Add pledge to DebtProposal
     * @param borrower Address of borrower
     * @param proposal Index of borroers's proposal
     * @param amount Amount of liquid tokens to  cover by this pledge
     */
    function addPledge(address borrower, uint256 proposal, uint256 amount) public {
        DebtProposal storage p = debtProposals[borrower][proposal];
        require(p.amount > 0, "FundsModule: DebtProposal not found");
        require(!p.executed, "FundsModule: DebtProposal is already executed");
        uint256 rlAmount= getRequiredPledge(borrower, proposal);
        if(amount > rlAmount) amount = rlAmount;
        uint256 pAmount = calculatePoolExit(amount);
        require(pToken.transferFrom(_msgSender(), address(this), pAmount));
        if(p.pledges[_msgSender()].senderIndex == 0 && _msgSender() != borrower) {
            p.supporters.push(_msgSender());
            p.pledges[_msgSender()] = DebtPledge({
                senderIndex: p.supporters.length-1,
                lAmount: amount,
                pAmount: pAmount
            });
        }else{
            p.pledges[_msgSender()].lAmount += amount;
            p.pledges[_msgSender()].pAmount += pAmount;
        }
        emit PledgeAdded(_msgSender(), borrower, proposal, amount, pAmount);
    }

    /**
     * @notice Withdraw pledge from DebtProposal
     * @param borrower Address of borrower
     * @param proposal Index of borrowers's proposal
     * @param pAmount Amount of pTokens to withdraw
     */
    function withdrawPledge(address borrower, uint256 proposal, uint256 pAmount) public {
        DebtProposal storage p = debtProposals[borrower][proposal];
        require(p.amount > 0, "FundsModule: DebtProposal not found");
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
            require(pledge.lAmount - lAmount >= p.amount/2, "FundsModule: Borrower's pledge should cover at least half of debt amount");
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
        require(p.amount > 0, "FundsModule: DebtProposal not found");
        require(getRequiredPledge(_msgSender(), proposal) == 0, "FundsModule: DebtProposal is not fully funded");
        require(!p.executed, "FundsModule: DebtProposal is already executed");
        debts[_msgSender()].push(Debt({
            proposal: proposal,
            amount: p.amount
        }));
        // We do not initialize pledges map here to save gas!
        // Instead we check PledgeAmount.initialized field and do lazy initialization
        p.executed = true;
        uint256 debtIdx = debts[_msgSender()].length-1; //It's important to save index before calling external contract
        totalDebts += p.amount;
        require(liquidToken.transfer(_msgSender(), p.amount));
        emit DebtProposalExecuted(_msgSender(), proposal, debtIdx, p.amount);
    }

    /**
     * @notice Repay amount of liquidToken and unlock pTokens
     * @param debt Index of Debt
     * @param amount Amount of liquid tokens to repay
     */
    function repay(uint256 debt, uint256 amount) public {
        Debt storage d = debts[_msgSender()][debt];
        require(d.amount > 0, "FundsModule: Debt is already fully repaid"); //Or wrong debt index
        require(amount <= d.amount, "FundsModule: can not repay more then debt.amount");
        DebtProposal storage p = debtProposals[_msgSender()][d.proposal];
        require(p.amount > 0, "FundsModule: DebtProposal not found");
        require(liquidToken.transferFrom(_msgSender(), address(this), amount)); //TODO Think of reentrancy here. Which operation should be first?
        totalDebts -= p.amount;
        d.amount -= amount;
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
        require(proposal.amount > 0 && proposal.executed, "FundsModule: Debt not founs DebtProposal not found");
        // uint256 repaid = proposal.amount - debt.amount;
        // assert(repaid <= proposal.amount);

        DebtPledge storage dp = proposal.pledges[_msgSender()];
        PledgeAmount storage pa = dbt.pledges[_msgSender()];
        if(!pa.initialized){
            pa.pAmount = dp.pAmount;
            pa.initialized = true;
        }
        uint256 senderPartOfUnpaidLToken = dbt.amount * dp.lAmount / proposal.amount;
        uint256 senderPartOfLockedPToken = calculatePoolEnter(senderPartOfUnpaidLToken);
        require(senderPartOfLockedPToken < pa.pAmount, "FundsModule: Nothing to withdraw");
        uint256 withdrawPAmount = pa.pAmount - senderPartOfLockedPToken;
        pToken.transfer(_msgSender(), withdrawPAmount);
        emit UnlockedPledgeWithdraw(_msgSender(), borrower, debt, withdrawPAmount);


    }

    function totalLiquidAssets() public view returns(uint256) {
        return liquidToken.balanceOf(address(this));
    }

    function hasActiveDebts(address sender) internal view returns(bool) {
        //TODO: iterating through all debts may be too expensive if there are a lot of closed debts. Need to test this and find solution
        Debt[] storage userDebts = debts[sender];
        for (uint256 i=0; i < userDebts.length; i++){
            if (userDebts[i].amount == 0) return true;
        }
        return false;
    }

    function calculatePoolEnter(uint256 amount) internal view returns(uint256) {
        return getCurveModule().calculateEnter(totalLiquidAssets(), totalDebts, amount);
    }

    function calculatePoolExit(uint256 amount) internal view returns(uint256) {
        return getCurveModule().calculateExitByLiquidToken(totalLiquidAssets(), amount);
    }

    function getCurveModule() private view returns(ICurveModule) {
        return ICurveModule(getModuleAddress("curve"));
    }
}