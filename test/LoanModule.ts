import {
    PoolContract, PoolInstance, 
    FundsModuleContract, FundsModuleInstance, 
    LiquidityModuleContract, LiquidityModuleInstance,
    LoanModuleContract, LoanModuleInstance,
    CurveModuleContract, CurveModuleInstance,
    PTokenContract, PTokenInstance, 
    FreeDAIContract, FreeDAIInstance
} from "../types/truffle-contracts/index";
// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, expectRevert, shouldFail, time } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();
var expect = require("chai").expect;
const w3random = require("./utils/w3random");
const findEventArgs = require("./utils/findEventArgs");
const expectEqualBN = require("./utils/expectEqualBN");

const Pool = artifacts.require("Pool");
const FundsModule = artifacts.require("FundsModule");
const LiquidityModule = artifacts.require("LiquidityModule");
const LoanModule = artifacts.require("LoanModule");
const CurveModule = artifacts.require("CurveModule");

const PToken = artifacts.require("PToken");
const FreeDAI = artifacts.require("FreeDAI");

contract("LoanModule", async ([_, owner, liquidityProvider, borrower, ...otherAccounts]) => {
    let pool: PoolInstance;
    let funds: FundsModuleInstance; 
    let liqm: LiquidityModuleInstance; 
    let loanm: LoanModuleInstance; 
    let curve: CurveModuleInstance; 
    let pToken: PTokenInstance;
    let lToken: FreeDAIInstance;

    beforeEach(async () => {
        //Setup system contracts
        pool = await Pool.new();
        await pool.initialize({from: owner});

        lToken = await FreeDAI.new();
        await (<any> lToken).methods['initialize()']({from: owner});

        pToken = await PToken.new();
        await (<any> pToken).methods['initialize()']({from: owner});

        curve = await CurveModule.new();
        await (<any> curve).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("curve", curve.address, true, {from: owner});  

        liqm = await LiquidityModule.new();
        await (<any> liqm).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("liquidity", liqm.address, true, {from: owner});  

        loanm = await LoanModule.new();
        await (<any> loanm).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("loan", loanm.address, true, {from: owner});  

        funds = await FundsModule.new();
        await (<any> funds).methods['initialize(address,address,address)'](pool.address, lToken.address, pToken.address, {from: owner});
        await pool.set("funds", funds.address, true, {from: owner});  
        await pToken.addMinter(funds.address, {from: owner});
        await funds.addFundsOperator(liqm.address, {from: owner});
        await funds.addFundsOperator(loanm.address, {from: owner});

        //Do common tasks
        lToken.mint(liquidityProvider, web3.utils.toWei('1000000'), {from: owner});
        await lToken.approve(funds.address, web3.utils.toWei('1000000'), {from: liquidityProvider})

    })

    it('should create several debt proposals and take user pTokens', async () => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));

        for(let i=0; i < 3; i++){
            //Prepare Borrower account
            let lDebtWei = w3random.interval(100, 200, 'ether');
            let lcWei = lDebtWei.div(new BN(2)).add(new BN(1));
            let pAmountMinWei = await funds.calculatePoolExit(lcWei);
            await prepareBorrower(pAmountMinWei);

            //Create Debt Proposal
            let receipt = await loanm.createDebtProposal(lDebtWei, '0', pAmountMinWei, '0', {from: borrower});
            expectEvent(receipt, 'DebtProposalCreated', {'sender':borrower, 'proposal':String(i), 'lAmount':lDebtWei});

            let proposal = await loanm.debtProposals(borrower, i);
            //console.log(proposal);
            expect((<any>proposal).lAmount).to.be.bignumber.equal(lDebtWei);    //amount
            expect((<any>proposal).executed).to.be.false;                       //executed 
        }            
    });

    it('should create pledge in debt proposal', async () => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));

        //Prepare Borrower account
        let lDebtWei = w3random.interval(100, 200, 'ether');
        let lcWei = lDebtWei.div(new BN(2)).add(new BN(1));
        let pAmountMinWei = await funds.calculatePoolExit(lcWei);
        // console.log('lcWei', lcWei.toString());
        // console.log('pAmountMinWei', pAmountMinWei.toString());
        await prepareBorrower(pAmountMinWei);

        //Create Debt Proposal
        let receipt = await loanm.createDebtProposal(lDebtWei, '0', pAmountMinWei, '0', {from: borrower});
        let proposalIdx = findEventArgs(receipt, 'DebtProposalCreated')['proposal'].toString();
        //console.log(proposalIdx);

        //Add Pleddge
        let lPledgeWei = w3random.interval(10, 50, 'ether');
        let pPledgeWei = await funds.calculatePoolExit(lPledgeWei);
        let elPledgeWei = await funds.calculatePoolExitInverse(pPledgeWei);
        expectEqualBN(elPledgeWei[0],lPledgeWei);
        await prepareSupporter(pPledgeWei, otherAccounts[0]);
        receipt = await loanm.addPledge(borrower, proposalIdx, pPledgeWei, '0',{from: otherAccounts[0]});
        expectEvent(receipt, 'PledgeAdded', {'sender':otherAccounts[0], 'borrower':borrower, 'proposal':String(proposalIdx), 'lAmount':elPledgeWei[0], 'pAmount':pPledgeWei});
    });
    it('should withdraw pledge in debt proposal', async () => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));

        //Prepare Borrower account
        let lDebtWei = w3random.interval(100, 200, 'ether');
        let lcWei = lDebtWei.div(new BN(2)).add(new BN(1));
        let pAmountMinWei = await funds.calculatePoolExit(lcWei);
        await prepareBorrower(pAmountMinWei);

        //Create Debt Proposal
        let receipt = await loanm.createDebtProposal(lDebtWei, '0', pAmountMinWei, '0', {from: borrower});
        let proposalIdx = findEventArgs(receipt, 'DebtProposalCreated')['proposal'].toString();
        //console.log(proposalIdx);

        //Add Pleddge
        let lPledgeWei = w3random.interval(10, 50, 'ether');
        let pPledgeWei = await funds.calculatePoolExit(lPledgeWei);
        let elPledgeWei = await funds.calculatePoolExitInverse(pPledgeWei);
        expectEqualBN(elPledgeWei[0],lPledgeWei);
        await prepareSupporter(pPledgeWei, otherAccounts[0]);
        receipt = await loanm.addPledge(borrower, proposalIdx, pPledgeWei, '0', {from: otherAccounts[0]});

        //Withdraw pledge
        //TODO - find out problem with full pledge withraw
        receipt = await loanm.withdrawPledge(borrower, proposalIdx, pPledgeWei, {from: otherAccounts[0]});  
        expectEvent(receipt, 'PledgeWithdrawn', {'sender':otherAccounts[0], 'borrower':borrower, 'proposal':String(proposalIdx), 'lAmount':elPledgeWei[0], 'pAmount':pPledgeWei});
    });
    it('should not allow borrower withdraw too much of his pledge', async () => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));

        //Prepare Borrower account
        let lDebtWei = w3random.interval(100, 200, 'ether');
        let lcWei = lDebtWei.div(new BN(2)).add(new BN(1));
        let pAmountMinWei = await funds.calculatePoolExit(lcWei);
        await prepareBorrower(pAmountMinWei);

        //Create Debt Proposal
        let receipt = await loanm.createDebtProposal(lDebtWei, '0', pAmountMinWei, '0', {from: borrower});
        let proposalIdx = findEventArgs(receipt, 'DebtProposalCreated')['proposal'].toString();
        //console.log(proposalIdx);

        //Add Pleddge
        let lPledgeWei = w3random.interval(10, 50, 'ether');
        let pPledgeWei = await funds.calculatePoolExit(lPledgeWei);
        // console.log('lPledgeWei', lPledgeWei.toString());
        // console.log('pPledgeWei', pPledgeWei.toString());
        await prepareSupporter(pPledgeWei, otherAccounts[0]);
        receipt = await loanm.addPledge(borrower, proposalIdx, pPledgeWei, '0', {from: otherAccounts[0]});

        //Withdraw pledge
        await expectRevert(
            loanm.withdrawPledge(borrower, proposalIdx, pPledgeWei.add(new BN(1)), {from: otherAccounts[0]}),
            'FundsModule: Can not withdraw more then locked'
        );  
    });
    it('should execute for successful debt proposal', async () => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));

        //Prepare Borrower account
        let lDebtWei = w3random.interval(100, 200, 'ether');
        let lcWei = lDebtWei.div(new BN(2)).add(new BN(1));
        let pAmountMinWei = await funds.calculatePoolExit(lcWei);
        await prepareBorrower(pAmountMinWei);

        //Create Debt Proposal
        let receipt = await loanm.createDebtProposal(lDebtWei, '0', pAmountMinWei, '0', {from: borrower});
        let proposalIdx = findEventArgs(receipt, 'DebtProposalCreated')['proposal'].toString();

        //Add supporter
        let lPledge = await loanm.getRequiredPledge(borrower, proposalIdx);
        let pPledge = await funds.calculatePoolExit(lPledge);
        await prepareSupporter(pPledge, otherAccounts[0]);
        await loanm.addPledge(borrower, proposalIdx, pPledge, '0',{from: otherAccounts[0]});

        receipt = await loanm.executeDebtProposal(proposalIdx, {from: borrower});
        expectEvent(receipt, 'DebtProposalExecuted', {'sender':borrower, 'proposal':String(proposalIdx), 'lAmount':lDebtWei});
    });
    it('should repay debt and interest', async () => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));

        let debtLAmount = w3random.interval(100, 200, 'ether');
        let debtIdx = await createDebt(debtLAmount, otherAccounts[0]);
        let borrowerLBalance = await lToken.balanceOf(borrower);
        expect(borrowerLBalance).to.be.bignumber.gte(debtLAmount);

        // Partial repayment
        await time.increase(w3random.interval(30*24*60*60, 300*24*60*60));
        let repayLAmount = debtLAmount.div(new BN(3));
        await lToken.approve(funds.address, repayLAmount, {from: borrower});
        let receipt = await loanm.repay(debtIdx, repayLAmount, {from: borrower});
        expectEvent(receipt, 'Repay', {'sender':borrower, 'debt':debtIdx});
        let debtLRequiredPayments = await loanm.getDebtRequiredPayments(borrower, debtIdx);
        expect(debtLRequiredPayments[0]).to.be.bignumber.gt(new BN(0));
        expect(debtLRequiredPayments[1]).to.be.bignumber.eq(new BN(0));        

        // Repay rest
        await time.increase(w3random.interval(30*24*60*60, 300*24*60*60));
        debtLRequiredPayments = await loanm.getDebtRequiredPayments(borrower, debtIdx);
        //console.log('debtLRequiredPayments', debtLRequiredPayments[0].toString(), debtLRequiredPayments[1].toString());
        expect(debtLRequiredPayments[1]).to.be.bignumber.gt(new BN(0));

        let fullRepayLAmount = debtLRequiredPayments[0].add(debtLRequiredPayments[1]);
        await lToken.transfer(borrower, fullRepayLAmount, {from: liquidityProvider});
        await lToken.approve(funds.address, fullRepayLAmount, {from: borrower});
        receipt = await loanm.repay(debtIdx, fullRepayLAmount, {from: borrower});
        expectEvent(receipt, 'Repay', {'sender':borrower, 'debt':debtIdx});

        debtLRequiredPayments = await loanm.getDebtRequiredPayments(borrower, debtIdx);
        expect(debtLRequiredPayments[0]).to.be.bignumber.eq(new BN(0));
        expect(debtLRequiredPayments[1]).to.be.bignumber.eq(new BN(0));
    });
    it('should partially redeem pledge from debt', async () => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));

        let debtLAmount = w3random.interval(100, 200, 'ether');
        //console.log('Debt lAmount', web3.utils.fromWei(debtLAmount));
        let debtIdx = await createDebt(debtLAmount, otherAccounts[0]);
        let borrowerLBalance = await lToken.balanceOf(borrower);
        expect(borrowerLBalance).to.be.bignumber.gte(debtLAmount);

        //Check pledge Info
        let pledgeInfo = await loanm.calculatePledgeInfo(borrower, debtIdx, otherAccounts[0]);
        //console.log('Before repay', pledgeInfo);
        let pPledge = pledgeInfo[0];
        //console.log('Pledge pAmount', web3.utils.fromWei(pPledge));
        expect(pledgeInfo[1]).to.be.bignumber.eq('0');
        expect(pledgeInfo[2]).to.be.bignumber.eq('0');
        expect(pledgeInfo[3]).to.be.bignumber.eq('0');

        // Partial repayment
        let randTime = w3random.interval(30*24*60*60, 300*24*60*60);
        //console.log('Days passed', randTime/(24*60*60));
        await time.increase(randTime);
        let repayLAmount = w3random.intervalBN(debtLAmount.div(new BN(10)), debtLAmount.div(new BN(2)));
        //console.log('Repay lAmount', web3.utils.fromWei(repayLAmount));
        await lToken.approve(funds.address, repayLAmount, {from: borrower});
        await loanm.repay(debtIdx, repayLAmount, {from: borrower});

        //Redeem unlocked pledge
        pledgeInfo = await loanm.calculatePledgeInfo(borrower, debtIdx, otherAccounts[0]);
        // console.log('After repay', pledgeInfo);
        // console.log('Pledge locked', web3.utils.fromWei(pledgeInfo[0]));
        // console.log('Pledge unlocked', web3.utils.fromWei(pledgeInfo[1]));
        // console.log('Pledge interest', web3.utils.fromWei(pledgeInfo[2]));
        expectEqualBN(pledgeInfo[0].add(pledgeInfo[1]), pPledge); // Locked + unlocked = full pledge
        expect(pledgeInfo[1]).to.be.bignumber.gt('0');    // Something is unlocked
        expect(pledgeInfo[2]).to.be.bignumber.gt('0');    // Some interest receieved
        expect(pledgeInfo[3]).to.be.bignumber.eq('0');    // Nothing withdrawn yet

        let receipt = await loanm.withdrawUnlockedPledge(borrower, debtIdx, {from: otherAccounts[0]});
        let expectedPWithdraw = pledgeInfo[1].add(pledgeInfo[2]).sub(pledgeInfo[3]);
        expectEvent(receipt, 'UnlockedPledgeWithdraw', {'sender':otherAccounts[0], 'borrower':borrower, 'debt':String(debtIdx), });
    });
    it('should fully redeem pledge from fully paid debt (without partial redeem)', async () => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));

        let debtLAmount = w3random.interval(100, 200, 'ether');
        let debtIdx = await createDebt(debtLAmount, otherAccounts[0]);
        let borrowerLBalance = await lToken.balanceOf(borrower);
        expect(borrowerLBalance).to.be.bignumber.gte(debtLAmount);
        await lToken.transfer(borrower, debtLAmount.div(new BN(20)), {from: liquidityProvider});    //Transfer 5% of debtLAmount for paying interest

        // Full repayment
        await time.increase(w3random.interval(30*24*60*60, 300*24*60*60));
        let requiredPayments = await loanm.getDebtRequiredPayments(borrower, debtIdx);
        expect(requiredPayments[0]).to.be.bignumber.eq(debtLAmount); // Debt equal to loaned amount   
        expect(requiredPayments[1]).to.be.bignumber.gt('0');         // Some interest payment required
        let repayLAmount = requiredPayments[0].add(requiredPayments[1]);
        await lToken.approve(funds.address, repayLAmount, {from: borrower});
        await loanm.repay(debtIdx, repayLAmount, {from: borrower});

        //Withdraw pledge
        let pledgeInfo = await loanm.calculatePledgeInfo(borrower, debtIdx, otherAccounts[0]);
        let expectedPWithdraw = pledgeInfo[1].add(pledgeInfo[2]).sub(pledgeInfo[3]);
        let receipt = await loanm.withdrawUnlockedPledge(borrower, debtIdx, {from: otherAccounts[0]});
        expectEvent(receipt, 'UnlockedPledgeWithdraw', {'sender':otherAccounts[0], 'borrower':borrower, 'debt':String(debtIdx), 'pAmount':expectedPWithdraw});
    });
    it('should fully redeem pledge from fully paid debt (after partial redeem)', async () => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));

        let debtLAmount = w3random.interval(100, 200, 'ether');
        let debtIdx = await createDebt(debtLAmount, otherAccounts[0]);
        let borrowerLBalance = await lToken.balanceOf(borrower);
        expect(borrowerLBalance).to.be.bignumber.gte(debtLAmount);
        await lToken.transfer(borrower, debtLAmount.div(new BN(20)), {from: liquidityProvider});    //Transfer 5% of debtLAmount for paying interest

        // Partial repayment
        await time.increase(w3random.interval(30*24*60*60, 300*24*60*60));
        let repayLAmount = w3random.intervalBN(debtLAmount.div(new BN(10)), debtLAmount.div(new BN(2)));
        await lToken.approve(funds.address, repayLAmount, {from: borrower});
        await loanm.repay(debtIdx, repayLAmount, {from: borrower});


        //Withdraw pledge
        let pledgeInfo = await loanm.calculatePledgeInfo(borrower, debtIdx, otherAccounts[0]);
        let expectedPWithdraw = pledgeInfo[1].add(pledgeInfo[2]).sub(pledgeInfo[3]);
        let receipt = await loanm.withdrawUnlockedPledge(borrower, debtIdx, {from: otherAccounts[0]});
        expectEvent(receipt, 'UnlockedPledgeWithdraw', {'sender':otherAccounts[0], 'borrower':borrower, 'debt':String(debtIdx), 'pAmount':expectedPWithdraw});

        // Full repayment
        await time.increase(w3random.interval(30*24*60*60, 300*24*60*60));
        let requiredPayments = await loanm.getDebtRequiredPayments(borrower, debtIdx);
        repayLAmount = requiredPayments[0].add(requiredPayments[1]);
        await lToken.approve(funds.address, repayLAmount, {from: borrower});
        await loanm.repay(debtIdx, repayLAmount, {from: borrower});

        //Withdraw pledge
        pledgeInfo = await loanm.calculatePledgeInfo(borrower, debtIdx, otherAccounts[0]);
        expectedPWithdraw = pledgeInfo[1].add(pledgeInfo[2]).sub(pledgeInfo[3]);
        receipt = await loanm.withdrawUnlockedPledge(borrower, debtIdx, {from: otherAccounts[0]});
        expectEvent(receipt, 'UnlockedPledgeWithdraw', {'sender':otherAccounts[0], 'borrower':borrower, 'debt':String(debtIdx), 'pAmount':expectedPWithdraw});
    });
    // it('should correctly calculate totalLDebts()', async () => {
    // });

    async function prepareLiquidity(amountWei:BN){
        await liqm.deposit(amountWei, '0', {from: liquidityProvider});
    }
    async function prepareBorrower(pAmount:BN){
        await pToken.transfer(borrower, pAmount, {from: liquidityProvider});
        await pToken.approve(funds.address, pAmount, {from: borrower});
        //console.log('Borrower pBalance', (await pToken.balanceOf(borrower)).toString());
    }
    async function prepareSupporter(pAmount:BN, supporter:string){
        await pToken.transfer(supporter, pAmount, {from: liquidityProvider});
        await pToken.approve(funds.address, pAmount, {from: supporter});
    }

    async function createDebt(debtLAmount:BN, supporter:string){
        //Prepare Borrower account
        let lcWei = debtLAmount.div(new BN(2)).add(new BN(1));
        let pAmountMinWei = await funds.calculatePoolExit(lcWei);
        await prepareBorrower(pAmountMinWei);

        //Create Debt Proposal
        let receipt = await loanm.createDebtProposal(debtLAmount, '50', pAmountMinWei, '0', {from: borrower}); //50 means 5 percent
        let proposalIdx = findEventArgs(receipt, 'DebtProposalCreated')['proposal'].toString();

        //Add supporter
        let lPledge = await loanm.getRequiredPledge(borrower, proposalIdx);
        let pPledge = await funds.calculatePoolExit(lPledge);
        await prepareSupporter(pPledge, supporter);
        await loanm.addPledge(borrower, proposalIdx, pPledge, '0',{from: supporter});

        receipt = await loanm.executeDebtProposal(proposalIdx, {from: borrower});
        let debtIdx = findEventArgs(receipt, 'DebtProposalExecuted')['debt'];
        return debtIdx;
    }
});
