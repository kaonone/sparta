pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../../interfaces/access/IAccessModule.sol";
import "../../interfaces/curve/ICurveModule.sol";
import "../../interfaces/curve/IFundsModule.sol";
import "../../interfaces/curve/ILiquidityModule.sol";
import "../../interfaces/curve/ILoanModule.sol";
import "../../interfaces/curve/ILoanProposalsModule.sol";
import "../../interfaces/curve/ILoanLimitsModule.sol";
import "../../interfaces/token/IPToken.sol";
import "../../common/Module.sol";

contract LoanProposalsModule is Module, ILoanProposalsModule {
    using SafeMath for uint256;

    uint256 public constant COLLATERAL_TO_DEBT_RATIO_MULTIPLIER = 10**3;
    uint256 public constant COLLATERAL_TO_DEBT_RATIO = COLLATERAL_TO_DEBT_RATIO_MULTIPLIER * 3 / 2; // Regulates how many collateral is required 
    uint256 public constant PLEDGE_PERCENT_MULTIPLIER = 10**3;

    uint256 public constant BORROWER_COLLATERAL_TO_FULL_COLLATERAL_MULTIPLIER = 10**3;
    uint256 public constant BORROWER_COLLATERAL_TO_FULL_COLLATERAL_RATIO = BORROWER_COLLATERAL_TO_FULL_COLLATERAL_MULTIPLIER/3;

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
        uint256 created;            //Timestamp when proposal was created 
        bool executed;              //If Debt is created for this proposal
    }

    mapping(address=>DebtProposal[]) public debtProposals;

    uint256 private lProposals;

    mapping(address=>uint256) public openProposals;         // Counts how many open proposals the address has 

    modifier operationAllowed(IAccessModule.Operation operation) {
        IAccessModule am = IAccessModule(getModuleAddress(MODULE_ACCESS));
        require(am.isOperationAllowed(operation, _msgSender()), "LoanProposalsModule: operation not allowed");
        _;
    }

    function initialize(address _pool) public initializer {
        Module.initialize(_pool);
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
        require(debtLAmount >= limits().lDebtAmountMin(), "LoanProposalsModule: debtLAmount should be >= lDebtAmountMin");
        require(interest >= limits().debtInterestMin(), "LoanProposalsModule: interest should be >= debtInterestMin");
        require(openProposals[_msgSender()] < limits().maxOpenProposalsPerUser(), "LoanProposalsModule: borrower has too many open proposals");
        uint256 fullCollateralLAmount = debtLAmount.mul(COLLATERAL_TO_DEBT_RATIO).div(COLLATERAL_TO_DEBT_RATIO_MULTIPLIER);
        uint256 clAmount = fullCollateralLAmount.mul(BORROWER_COLLATERAL_TO_FULL_COLLATERAL_RATIO).div(BORROWER_COLLATERAL_TO_FULL_COLLATERAL_MULTIPLIER);
        uint256 cpAmount = calculatePoolExit(clAmount);
        require(cpAmount <= pAmountMax, "LoanProposalsModule: pAmountMax is too low");

        debtProposals[_msgSender()].push(DebtProposal({
            lAmount: debtLAmount,
            interest: interest,
            descriptionHash: descriptionHash,
            supporters: new address[](0),
            lCovered: 0,
            pCollected: 0,
            created: now,
            executed: false
        }));
        uint256 proposalIndex = debtProposals[_msgSender()].length-1;
        increaseOpenProposals(_msgSender());
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
        require(_msgSender() != borrower, "LoanProposalsModule: Borrower can not add pledge");
        DebtProposal storage p = debtProposals[borrower][proposal];
        require(p.lAmount > 0, "LoanProposalsModule: DebtProposal not found");
        require(!p.executed, "LoanProposalsModule: DebtProposal is already executed");
        // p.lCovered/p.pCollected should be the same as original liquidity token to pToken exchange rate
        (uint256 lAmount, , ) = calculatePoolExitInverse(pAmount); 
        require(lAmount >= lAmountMin, "LoanProposalsModule: Minimal amount is too high");
        (uint256 minLPledgeAmount, uint256 maxLPledgeAmount)= getPledgeRequirements(borrower, proposal);
        require(maxLPledgeAmount > 0, "LoanProposalsModule: DebtProposal is already funded");
        require(lAmount >= minLPledgeAmount, "LoanProposalsModule: pledge is too low");
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
        require(_msgSender() != borrower, "LoanProposalsModule: Borrower can not withdraw pledge");
        DebtProposal storage p = debtProposals[borrower][proposal];
        require(p.lAmount > 0, "LoanProposalsModule: DebtProposal not found");
        require(!p.executed, "LoanProposalsModule: DebtProposal is already executed");
        DebtPledge storage pledge = p.pledges[_msgSender()];
        require(pAmount <= pledge.pAmount, "LoanProposalsModule: Can not withdraw more than locked");
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
        require(pledge.lAmount >= minLPledgeAmount || pledge.pAmount == 0, "LoanProposalsModule: pledge left is too small");

        fundsModule().withdrawPTokens(_msgSender(), pAmount);
        emit PledgeWithdrawn(_msgSender(), borrower, proposal, lAmount, pAmount);
    }

    function cancelDebtProposal(uint256 proposal) public operationAllowed(IAccessModule.Operation.CancelDebtProposal) {
        DebtProposal storage p = debtProposals[_msgSender()][proposal];
        require(p.lAmount > 0, "LoanProposalsModule: DebtProposal not found");
        require(now.sub(p.created) > limits().minCancelProposalTimeout(), "LoanProposalsModule: proposal can not be canceled now");
        require(!p.executed, "LoanProposalsModule: DebtProposal is already executed");
        for (uint256 i=0; i < p.supporters.length; i++){
            address supporter = p.supporters[i];                //first supporter is borrower himself
            DebtPledge storage pledge = p.pledges[supporter];
            lProposals = lProposals.sub(pledge.lAmount);
            fundsModule().withdrawPTokens(supporter, pledge.pAmount);
            emit PledgeWithdrawn(supporter, _msgSender(), proposal, pledge.lAmount, pledge.pAmount);
            delete p.pledges[supporter];
        }
        delete p.supporters;
        p.lAmount = 0;      //Mark proposal as deleted
        p.interest = 0;
        p.descriptionHash = 0;
        p.pCollected = 0;   
        p.lCovered = 0;
        decreaseOpenProposals(_msgSender());
        emit DebtProposalCanceled(_msgSender(), proposal);
    }

    /**
     * @notice Execute DebtProposal
     * @dev Creates Debt using data of DebtProposal
     * @param proposal Index of DebtProposal
     * @return Index of created Debt
     */
    function executeDebtProposal(uint256 proposal) public operationAllowed(IAccessModule.Operation.ExecuteDebtProposal) returns(uint256) {
        address borrower = _msgSender();
        DebtProposal storage p = debtProposals[borrower][proposal];
        require(p.lAmount > 0, "LoanProposalsModule: DebtProposal not found");
        require(getRequiredPledge(borrower, proposal) == 0, "LoanProposalsModule: DebtProposal is not fully funded");
        require(!p.executed, "LoanProposalsModule: DebtProposal is already executed");

        p.executed = true;

        lProposals = lProposals.sub(p.lCovered);

        //Move locked pTokens to Funds
        uint256[] memory amounts = new uint256[](p.supporters.length);
        for (uint256 i=0; i < p.supporters.length; i++) {
            address supporter = p.supporters[i];
            amounts[i] = p.pledges[supporter].pAmount;
        }

        fundsModule().lockPTokens(p.supporters, amounts);

        uint256 debtIdx = loanModule().createDebt(borrower, proposal, p.lAmount);
        decreaseOpenProposals(borrower);
        emit DebtProposalExecuted(borrower, proposal, debtIdx, p.lAmount);
        return debtIdx;
    }

    function getProposalAndPledgeInfo(address borrower, uint256 proposal, address supporter) public view returns(
        uint256 lAmount, 
        uint256 lCovered, 
        uint256 pCollected, 
        uint256 interest,
        uint256 lPledge,
        uint256 pPledge
        ){
        DebtProposal storage p = debtProposals[borrower][proposal];
        require(p.lAmount > 0, "LoanProposalModule: DebtProposal not found");
        lAmount = p.lAmount;
        lCovered = p.lCovered;
        pCollected = p.pCollected;
        interest = p.interest;
        lPledge = p.pledges[supporter].lAmount;
        pPledge = p.pledges[supporter].pAmount;
    }

    function getProposalInterestRate(address borrower, uint256 proposal) public view returns(uint256){
        DebtProposal storage p = debtProposals[borrower][proposal];
        require(p.lAmount > 0, "LoanProposalModule: DebtProposal not found");
        return p.interest;
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

        minLPledge = limits().pledgePercentMin().mul(fullCollateralLAmount).div(PLEDGE_PERCENT_MULTIPLIER);
        uint256 lMinPledgeMax = limits().lMinPledgeMax();
        if (minLPledge > lMinPledgeMax) minLPledge = lMinPledgeMax;
        if (minLPledge > maxLPledge) minLPledge = maxLPledge;
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

    function loanModule() internal view returns(ILoanModule) {
        return ILoanModule(getModuleAddress(MODULE_LOAN));
    }
    
    function limits() internal view returns(ILoanLimitsModule) {
        return ILoanLimitsModule(getModuleAddress(MODULE_LOAN_LIMTS));
    }

    function increaseOpenProposals(address borrower) private {
        openProposals[borrower] = openProposals[borrower].add(1);
    }

    function decreaseOpenProposals(address borrower) private {
        openProposals[borrower] = openProposals[borrower].sub(1);
    }

}