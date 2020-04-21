import {
    PoolContract, PoolInstance, 
    FundsModuleContract, FundsModuleInstance, 
    AccessModuleContract, AccessModuleInstance,
    LiquidityModuleContract, LiquidityModuleInstance,
    LoanModuleContract, LoanModuleInstance,
    LoanProposalsModuleContract, LoanProposalsModuleInstance,
    LoanLimitsModuleContract, LoanLimitsModuleInstance,
    CurveModuleContract, CurveModuleInstance,
    PTokenContract, PTokenInstance, 
    FreeDAIContract, FreeDAIInstance
} from "../types/truffle-contracts/index";
import Snapshot from "./utils/snapshot";
import repeat from "./utils/repeat";
// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, shouldFail, time } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const expectRevert= require("./utils/expectRevert");
const should = require("chai").should();
var expect = require("chai").expect;
const w3random = require("./utils/w3random");
const findEventArgs = require("./utils/findEventArgs");
const expectEqualBN = require("./utils/expectEqualBN");

const Pool = artifacts.require("Pool");
const FundsModule = artifacts.require("FundsModule");
const AccessModule = artifacts.require("AccessModule");
const LiquidityModule = artifacts.require("LiquidityModule");
const LoanModule = artifacts.require("LoanModule");
const LoanProposalsModule = artifacts.require("LoanProposalsModule");
const LoanLimitsModule = artifacts.require("LoanLimitsModule");
const CurveModule = artifacts.require("CurveModule");

const PToken = artifacts.require("PToken");
const FreeDAI = artifacts.require("FreeDAI");

contract("LoanProposalsModule", async ([_, owner, liquidityProvider, borrower, ...otherAccounts]) => {
    let snap: Snapshot;

    let pool: PoolInstance;
    let funds: FundsModuleInstance; 
    let access: AccessModuleInstance;
    let liqm: LiquidityModuleInstance; 
    let loanm: LoanModuleInstance; 
    let loanpm: LoanProposalsModuleInstance; 
    let loanLimits: LoanLimitsModuleInstance; 
    let curve: CurveModuleInstance; 
    let pToken: PTokenInstance;
    let lToken: FreeDAIInstance;

    let withdrawFeePercent:BN, percentDivider:BN;
    let collateralToDebtRatio:BN, collateralToDebtMultiplier:BN;
    let borrowerCollateralToFullCollateralRatio:BN, borrowerCollateralToFullCollateralMultiplier:BN;

    enum LoanLimitType {
        L_DEBT_AMOUNT_MIN,
        DEBT_INTEREST_MIN,
        PLEDGE_PERCENT_MIN,
        L_MIN_PLEDGE_MAX,    
        DEBT_LOAD_MAX,       
        MAX_OPEN_PROPOSALS_PER_USER,
        MIN_CANCEL_PROPOSAL_TIMEOUT
    }

    before(async () => {
        //Setup system contracts
        pool = await Pool.new();
        await (<any> pool).methods['initialize()']({from: owner});

        lToken = await FreeDAI.new();
        await (<any> lToken).methods['initialize()']({from: owner});
        await pool.set("ltoken", lToken.address, true, {from: owner});  

        pToken = await PToken.new();
        await (<any> pToken).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("ptoken", pToken.address, true, {from: owner});  

        curve = await CurveModule.new();
        await (<any> curve).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("curve", curve.address, true, {from: owner});  

        access = await AccessModule.new();
        await (<any> access).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("access", access.address, true, {from: owner});  
        access.disableWhitelist({from: owner});

        liqm = await LiquidityModule.new();
        await (<any> liqm).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("liquidity", liqm.address, true, {from: owner});  

        loanLimits = await LoanLimitsModule.new();
        await (<any> loanLimits).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("loan_limits", loanLimits.address, true, {from: owner});  

        loanpm = await LoanProposalsModule.new();
        await (<any> loanpm).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("loan_proposals", loanpm.address, true, {from: owner});  

        loanm = await LoanModule.new();
        await (<any> loanm).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("loan", loanm.address, true, {from: owner});  

        funds = await FundsModule.new();
        await (<any> funds).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("funds", funds.address, true, {from: owner});  
        await pToken.addMinter(funds.address, {from: owner});
        await funds.addFundsOperator(liqm.address, {from: owner});
        await funds.addFundsOperator(loanm.address, {from: owner});
        await funds.addFundsOperator(loanpm.address, {from: owner});

        //Do common tasks
        lToken.mint(liquidityProvider, web3.utils.toWei('1000000'), {from: owner});
        await lToken.approve(funds.address, web3.utils.toWei('1000000'), {from: liquidityProvider})

        curve.setWithdrawFee(new BN(5), {from: owner});
        withdrawFeePercent = await curve.withdrawFeePercent();
        percentDivider = await curve.PERCENT_DIVIDER();

        collateralToDebtRatio = await loanpm.COLLATERAL_TO_DEBT_RATIO();
        collateralToDebtMultiplier = await loanpm.COLLATERAL_TO_DEBT_RATIO_MULTIPLIER();
        borrowerCollateralToFullCollateralRatio = await loanpm.BORROWER_COLLATERAL_TO_FULL_COLLATERAL_RATIO();
        borrowerCollateralToFullCollateralMultiplier = await loanpm.BORROWER_COLLATERAL_TO_FULL_COLLATERAL_MULTIPLIER();

        //Save snapshot
        snap = await Snapshot.create(web3.currentProvider);
    })
    beforeEach(async () => {
        await snap.revert();
    });
    
    it('should create several debt proposals and take user pTokens', async () => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));
        await loanLimits.set(LoanLimitType.MAX_OPEN_PROPOSALS_PER_USER, 3, {from: owner});

        for(let i=0; i < 3; i++){
            //Prepare Borrower account
            let lDebtWei = w3random.interval(100, 200, 'ether');
            let lfullCollateral = lDebtWei.mul(collateralToDebtRatio).div(collateralToDebtMultiplier);
            let lBorrowerCollateral = lfullCollateral.mul(borrowerCollateralToFullCollateralRatio).div(borrowerCollateralToFullCollateralMultiplier);
            let pAmountMaxWei = (await funds.calculatePoolExit(lBorrowerCollateral))
            await prepareBorrower(pAmountMaxWei);

            //Create Debt Proposal
            let receipt = await loanpm.createDebtProposal(lDebtWei, '100', pAmountMaxWei, web3.utils.sha3('test'), {from: borrower});
            expectEvent(receipt, 'DebtProposalCreated', {'sender':borrower, 'proposal':String(i), 'lAmount':lDebtWei});

            let proposal = await loanpm.debtProposals(borrower, i);
            //console.log(proposal);
            expect((<any>proposal).lAmount).to.be.bignumber.equal(lDebtWei);    //amount
            expect((<any>proposal).executed).to.be.false;                       //executed 
        }            
    });
    it('should respect a limit of open debt proposals per user', async () => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));
        await loanLimits.set(LoanLimitType.MAX_OPEN_PROPOSALS_PER_USER, 1, {from: owner});

        let lDebtWei = w3random.interval(100, 200, 'ether');
        let lfullCollateral = lDebtWei.mul(collateralToDebtRatio).div(collateralToDebtMultiplier);
        let lBorrowerCollateral = lfullCollateral.mul(borrowerCollateralToFullCollateralRatio).div(borrowerCollateralToFullCollateralMultiplier);

        let maxOpenProposalsPerUser = (await loanLimits.maxOpenProposalsPerUser()).toNumber();

        //Allowed proposals
        for(let i=0; i < maxOpenProposalsPerUser; i++){
            let pAmountMaxWei = (await funds.calculatePoolExit(lBorrowerCollateral))
            await prepareBorrower(pAmountMaxWei);
            await loanpm.createDebtProposal(lDebtWei, '100', pAmountMaxWei, web3.utils.sha3('test 1'), {from: borrower});
        }

        let pAmountMaxWei = (await funds.calculatePoolExit(lBorrowerCollateral))
        await prepareBorrower(pAmountMaxWei);
        //Too many proposals
        await expectRevert(
            loanpm.createDebtProposal(lDebtWei, '100', pAmountMaxWei, web3.utils.sha3('test 2'), {from: borrower}),
            "LoanProposalsModule: borrower has too many open proposals"
        );
    });
    it('should respect a timeout before cancel debt proposal', async () => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));

        let minCancelProposalTimeout = await loanLimits.minCancelProposalTimeout();

        //Create proposal
        let lDebtWei = w3random.interval(100, 200, 'ether');
        let lfullCollateral = lDebtWei.mul(collateralToDebtRatio).div(collateralToDebtMultiplier);
        let lBorrowerCollateral = lfullCollateral.mul(borrowerCollateralToFullCollateralRatio).div(borrowerCollateralToFullCollateralMultiplier);
        let pAmountMaxWei = (await funds.calculatePoolExit(lBorrowerCollateral))
        await prepareBorrower(pAmountMaxWei);
        await loanpm.createDebtProposal(lDebtWei, '100', pAmountMaxWei, web3.utils.sha3('test 1'), {from: borrower});

        //Try cancel proposal
        await expectRevert(
            loanpm.cancelDebtProposal(0, {from: borrower}),
            "LoanProposalsModule: proposal can not be canceled now"
        );

        await time.increase(minCancelProposalTimeout.addn(1));
        let receipt = await loanpm.cancelDebtProposal(0, {from: borrower})
        expectEvent(receipt, 'DebtProposalCanceled', {'sender':borrower, 'proposal':'0'});
    });



    it('should create pledge in debt proposal', async () => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));

        //Prepare Borrower account
        let lDebtWei = w3random.interval(100, 200, 'ether');
        let lfullCollateral = lDebtWei.mul(collateralToDebtRatio).div(collateralToDebtMultiplier);
        let lBorrowerCollateral = lfullCollateral.mul(borrowerCollateralToFullCollateralRatio).div(borrowerCollateralToFullCollateralMultiplier);
        let pAmountMaxWei = (await funds.calculatePoolExit(lBorrowerCollateral))
        await prepareBorrower(pAmountMaxWei);

        //Create Debt Proposal
        let receipt = await loanpm.createDebtProposal(lDebtWei, '100', pAmountMaxWei, web3.utils.sha3('test'), {from: borrower});
        let proposalIdx = findEventArgs(receipt, 'DebtProposalCreated')['proposal'].toString();
        //console.log(proposalIdx);

        //Add Pleddge
        let pledgeRequirements = await loanpm.getPledgeRequirements(borrower, proposalIdx);
        // console.log('pledgeRequirements', pledgeRequirements[0].toString(), pledgeRequirements[1].toString());
        let lPledgeWei = w3random.intervalBN(pledgeRequirements[0], pledgeRequirements[1]);
        let pPledgeWei = await funds.calculatePoolExit(lPledgeWei);
        let elPledgeWei = await funds.calculatePoolExitInverse(pPledgeWei);
        expectEqualBN(elPledgeWei[0],lPledgeWei);
        await prepareSupporter(pPledgeWei, otherAccounts[0]);
        receipt = await loanpm.addPledge(borrower, proposalIdx, pPledgeWei, '0',{from: otherAccounts[0]});
        // console.log('lAmount', elPledgeWei[0], elPledgeWei[0].toString());
        // console.log('pAmount', pPledgeWei, pPledgeWei.toString());
        expectEvent(receipt, 'PledgeAdded', {'sender':otherAccounts[0], 'borrower':borrower, 'proposal':String(proposalIdx), 'lAmount':elPledgeWei[0], 'pAmount':pPledgeWei});
    });
    it('should withdraw pledge in debt proposal', async () => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));

        //Prepare Borrower account
        let lDebtWei = w3random.interval(100, 200, 'ether');
        let lfullCollateral = lDebtWei.mul(collateralToDebtRatio).div(collateralToDebtMultiplier);
        let lBorrowerCollateral = lfullCollateral.mul(borrowerCollateralToFullCollateralRatio).div(borrowerCollateralToFullCollateralMultiplier);
        let pAmountMaxWei = (await funds.calculatePoolExit(lBorrowerCollateral))
        await prepareBorrower(pAmountMaxWei);

        //Create Debt Proposal
        let receipt = await loanpm.createDebtProposal(lDebtWei, '100', pAmountMaxWei, web3.utils.sha3('test'), {from: borrower});
        let proposalIdx = findEventArgs(receipt, 'DebtProposalCreated')['proposal'].toString();
        //console.log(proposalIdx);

        //Add Pleddge
        let pledgeRequirements = await loanpm.getPledgeRequirements(borrower, proposalIdx);
        //console.log('pledgeRequirements', pledgeRequirements[0].toString(), pledgeRequirements[1].toString());
        let lPledgeWei = w3random.intervalBN(pledgeRequirements[0], pledgeRequirements[1]);
        // let lPledgeWei = w3random.intervalBN(lDebtWei.div(new BN(10)), lDebtWei.div(new BN(2)), 'ether');
        // console.log('lPledgeWei', lPledgeWei.toString(), lDebtWei.div(new BN(2)).toString());
        let pPledgeWei = await funds.calculatePoolExit(lPledgeWei);
        let elPledgeWei = await funds.calculatePoolExitInverse(pPledgeWei);
        expectEqualBN(elPledgeWei[0],lPledgeWei);
        await prepareSupporter(pPledgeWei, otherAccounts[0]);
        receipt = await loanpm.addPledge(borrower, proposalIdx, pPledgeWei, '0', {from: otherAccounts[0]});

        //Withdraw pledge
        //TODO - find out problem with full pledge withraw
        let pBalanceBefore = await pToken.balanceOf(otherAccounts[0]);
        receipt = await loanpm.withdrawPledge(borrower, proposalIdx, pPledgeWei, {from: otherAccounts[0]});  
        expectEvent(receipt, 'PledgeWithdrawn', {'sender':otherAccounts[0], 'borrower':borrower, 'proposal':String(proposalIdx), 'lAmount':elPledgeWei[0], 'pAmount':pPledgeWei});
        let pBalanceAfter = await pToken.balanceOf(otherAccounts[0]);
        expectEqualBN(pBalanceAfter, pBalanceBefore.add(pPledgeWei));
    });
    it('should not allow borrower withdraw too much of his pledge', async () => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));

        //Prepare Borrower account
        let lDebtWei = w3random.interval(100, 200, 'ether');
        let lfullCollateral = lDebtWei.mul(collateralToDebtRatio).div(collateralToDebtMultiplier);
        let lBorrowerCollateral = lfullCollateral.mul(borrowerCollateralToFullCollateralRatio).div(borrowerCollateralToFullCollateralMultiplier);
        let pAmountMaxWei = (await funds.calculatePoolExit(lBorrowerCollateral))
        await prepareBorrower(pAmountMaxWei);

        //Create Debt Proposal
        let receipt = await loanpm.createDebtProposal(lDebtWei, '100', pAmountMaxWei, web3.utils.sha3('test'), {from: borrower});
        let proposalIdx = findEventArgs(receipt, 'DebtProposalCreated')['proposal'].toString();
        //console.log(proposalIdx);

        //Add Pleddge
        let pledgeRequirements = await loanpm.getPledgeRequirements(borrower, proposalIdx);
        //console.log('pledgeRequirements', pledgeRequirements[0].toString(), pledgeRequirements[1].toString());
        let lPledgeWei = w3random.intervalBN(pledgeRequirements[0], pledgeRequirements[1]);
        let pPledgeWei = await funds.calculatePoolExit(lPledgeWei);
        // console.log('lPledgeWei', lPledgeWei.toString());
        // console.log('pPledgeWei', pPledgeWei.toString());
        await prepareSupporter(pPledgeWei, otherAccounts[0]);
        receipt = await loanpm.addPledge(borrower, proposalIdx, pPledgeWei, '0', {from: otherAccounts[0]});

        //Withdraw pledge
        await expectRevert(
            loanpm.withdrawPledge(borrower, proposalIdx, pPledgeWei.add(new BN(1)), {from: otherAccounts[0]}),
            'LoanProposalsModule: Can not withdraw more than locked'
        );  
    });
    it('should cancel proposal and return all locked ptk', async () => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));
        let minCancelProposalTimeout = await loanLimits.minCancelProposalTimeout();

        let initialBalances = new Map<string,BN>();
        let lDebtAmount = w3random.interval(100, 200, 'ether');
        let lfullCollateral = lDebtAmount.mul(collateralToDebtRatio).div(collateralToDebtMultiplier);
        let lBorrowerCollateral = lfullCollateral.mul(borrowerCollateralToFullCollateralRatio).div(borrowerCollateralToFullCollateralMultiplier);
        let pAmountMaxWei = (await funds.calculatePoolExit(lBorrowerCollateral))
        await prepareBorrower(pAmountMaxWei);
        initialBalances.set(borrower, await pToken.balanceOf(borrower));
        let lProposalsBefore = await loanpm.totalLProposals();

        // Create Proposal
        let pLockedTotal = new BN('0');
        let receipt = await loanpm.createDebtProposal(lDebtAmount, '100', pAmountMaxWei, web3.utils.sha3('test'), {from: borrower});
        let proposalIdx = findEventArgs(receipt, 'DebtProposalCreated')['proposal'].toString();
        let pPledge = findEventArgs(receipt, 'PledgeAdded')['pAmount'];
        pLockedTotal = pLockedTotal.add(pPledge);
        // Prepare supporters
        for (let i=0; i<5; i++){
            await pToken.mint(otherAccounts[i], w3random.interval(100, 200, 'ether'), {from: owner});
            let pAmount = await pToken.balanceOf(otherAccounts[i]);
            initialBalances.set(otherAccounts[i], pAmount);
            //console.log(`${otherAccounts[i]} \t balance: ${pAmount.toString()} PTK`);
        }
        // Add random pledges
        for (let i=0; i<3; i++){
            let pledgeRequirements = await loanpm.getPledgeRequirements(borrower, proposalIdx);
            let lPledge = w3random.intervalBN(pledgeRequirements[0],pledgeRequirements[1]);
            let pPledge = await funds.calculatePoolExit(lPledge);
            pLockedTotal = pLockedTotal.add(pPledge);
            //console.log(`${otherAccounts[i]} \t pledge: ${lPledge.toString()} DAI = ${pPledge.toString()} PTK`);
            if(pPledge.gt(new BN(0))){
                await loanpm.addPledge(borrower, proposalIdx, pPledge, '0', {from: otherAccounts[i]});
            }
        }
        // Add last pledge to cover proposal
        let pledgeRequirements = await loanpm.getPledgeRequirements(borrower, proposalIdx);
        pPledge = await funds.calculatePoolExit(pledgeRequirements[1]);
        //console.log(`${otherAccounts[3]} \t pledge: ${pledgeRequirements[1].toString()} DAI = ${pPledge.toString()} PTK`);
        if(pPledge.gt(new BN(0))){
            receipt = await loanpm.addPledge(borrower, proposalIdx, pPledge, '0', {from: otherAccounts[3]});
            pPledge = findEventArgs(receipt, 'PledgeAdded')['pAmount'];
            pLockedTotal = pLockedTotal.add(pPledge);
        }

        // Cancel proposal
        await time.increase(minCancelProposalTimeout.addn(1));
        //console.log('pLockedTotal', pLockedTotal.toString());
        let pFundsBalance = await pToken.balanceOf(funds.address);
        //console.log('funds balance before cancel', pFundsBalance.toString());
        expect(pFundsBalance).to.be.bignumber.equal(pLockedTotal);
        receipt = await loanpm.cancelDebtProposal(proposalIdx, {from: borrower});
        expectEvent(receipt, 'DebtProposalCanceled');

        for(let [addr, pInitial] of initialBalances) {
            let pBalance = await pToken.balanceOf(addr);
            expect(pBalance).to.be.bignumber.eq(pInitial);
        }
        pFundsBalance = await pToken.balanceOf(funds.address);
        //console.log('funds balance after cancel', pFundsBalance.toString());
        expect(pFundsBalance).to.be.bignumber.equal(new BN(0));

        let lProposalsAfter = await loanpm.totalLProposals();
        expect(lProposalsAfter).to.be.bignumber.equal(lProposalsBefore);            
    });
    it('should execute successful debt proposal', async () => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));

        //Prepare Borrower account
        let lDebtWei = w3random.interval(100, 200, 'ether');
        let lfullCollateral = lDebtWei.mul(collateralToDebtRatio).div(collateralToDebtMultiplier);
        let lBorrowerCollateral = lfullCollateral.mul(borrowerCollateralToFullCollateralRatio).div(borrowerCollateralToFullCollateralMultiplier);
        let pAmountMaxWei = (await funds.calculatePoolExit(lBorrowerCollateral))
        await prepareBorrower(pAmountMaxWei);

        //Create Debt Proposal
        let receipt = await loanpm.createDebtProposal(lDebtWei, '100', pAmountMaxWei, web3.utils.sha3('test'), {from: borrower});
        let proposalIdx = findEventArgs(receipt, 'DebtProposalCreated')['proposal'].toString();

        //Add supporter
        let expectlPledge = lDebtWei.mul(collateralToDebtRatio).div(collateralToDebtMultiplier).sub(lBorrowerCollateral);
        let lPledge = await loanpm.getRequiredPledge(borrower, proposalIdx);
        expectEqualBN(lPledge, expectlPledge);
        let pPledge = await funds.calculatePoolExit(lPledge);
        await prepareSupporter(pPledge, otherAccounts[0]);
        await loanpm.addPledge(borrower, proposalIdx, pPledge, '0',{from: otherAccounts[0]});

        receipt = await loanpm.executeDebtProposal(proposalIdx, {from: borrower});
        expectEvent(receipt, 'DebtProposalExecuted', {'sender':borrower, 'proposal':String(proposalIdx), 'lAmount':lDebtWei});
    });
    it('should not execute unsuccessful debt proposal', async () => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));

        //Prepare Borrower account
        let lDebtWei = w3random.interval(100, 200, 'ether');
        let lfullCollateral = lDebtWei.mul(collateralToDebtRatio).div(collateralToDebtMultiplier);
        let lBorrowerCollateral = lfullCollateral.mul(borrowerCollateralToFullCollateralRatio).div(borrowerCollateralToFullCollateralMultiplier);
        let pAmountMaxWei = (await funds.calculatePoolExit(lBorrowerCollateral))
        await prepareBorrower(pAmountMaxWei);
        let borrowerPAmountBefore = await pToken.balanceOf(borrower);

        //Create Debt Proposal
        let receipt = await loanpm.createDebtProposal(lDebtWei, '100', pAmountMaxWei, web3.utils.sha3('test'), {from: borrower});
        let proposalIdx = findEventArgs(receipt, 'DebtProposalCreated')['proposal'].toString();
        let borrowerPAmountAfter = await pToken.balanceOf(borrower);        
        expectEqualBN(borrowerPAmountAfter, borrowerPAmountBefore.sub(pAmountMaxWei));

        //Add supporter
        let expectlPledge = lDebtWei.mul(collateralToDebtRatio).div(collateralToDebtMultiplier).sub(lBorrowerCollateral);
        let lPledge = await loanpm.getRequiredPledge(borrower, proposalIdx);
        expectEqualBN(lPledge, expectlPledge);
        let pPledge = await funds.calculatePoolExit(lPledge.divn(2));
        await prepareSupporter(pPledge, otherAccounts[0]);
        await loanpm.addPledge(borrower, proposalIdx, pPledge, '0',{from: otherAccounts[0]});

        await expectRevert(
            loanpm.executeDebtProposal(proposalIdx, {from: borrower}),
            'LoanProposalsModule: DebtProposal is not fully funded'
        );
    });

    it('should not execute successful debt proposal if debt load is too high', async () => {
        let liquidity = w3random.interval(200, 400, 'ether')
        await prepareLiquidity(liquidity);

        //Prepare Borrower account
        let lDebtWei = liquidity.div(new BN(2)).add(new BN(1));
        let lfullCollateral = lDebtWei.mul(collateralToDebtRatio).div(collateralToDebtMultiplier);
        let lBorrowerCollateral = lfullCollateral.mul(borrowerCollateralToFullCollateralRatio).div(borrowerCollateralToFullCollateralMultiplier);
        let pAmountMaxWei = (await funds.calculatePoolExit(lBorrowerCollateral))
        await prepareBorrower(pAmountMaxWei);

        //Create Debt Proposal
        let receipt = await loanpm.createDebtProposal(lDebtWei, '100', pAmountMaxWei, web3.utils.sha3('test'), {from: borrower});
        let proposalIdx = findEventArgs(receipt, 'DebtProposalCreated')['proposal'].toString();

        //Add supporter
        let lPledge = await loanpm.getRequiredPledge(borrower, proposalIdx);
        let pPledge = await funds.calculatePoolExit(lPledge);
        await prepareSupporter(pPledge, otherAccounts[0]);
        await loanpm.addPledge(borrower, proposalIdx, pPledge, '0',{from: otherAccounts[0]});
        // console.log('lBalance', (await funds.lBalance()).toString());
        // console.log('lDebts', (await loanpm.totalLDebts()).toString());

        await expectRevert(
            loanpm.executeDebtProposal(proposalIdx, {from: borrower}),
            "LoanModule: Debt can not be created now because of debt loan limit"
        );
    });


    async function prepareLiquidity(amountWei:BN){
        await liqm.deposit(amountWei, '0', {from: liquidityProvider});
    }
    async function prepareBorrower(pAmount:BN){
        await pToken.mint(borrower, pAmount, {from: owner});
        //await pToken.approve(funds.address, pAmount, {from: borrower});
        //console.log('Borrower pBalance', (await pToken.balanceOf(borrower)).toString());
    }
    async function prepareSupporter(pAmount:BN, supporter:string){
        await pToken.mint(supporter, pAmount, {from: owner});
        //await pToken.approve(funds.address, pAmount, {from: supporter});
    }
});
