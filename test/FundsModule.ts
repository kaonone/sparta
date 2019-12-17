import {
    PoolContract, PoolInstance, 
    FundsModuleContract, FundsModuleInstance, 
    CurveModuleContract, CurveModuleInstance,
    PTokenContract, PTokenInstance, 
    TestLiquidTokenInstance, TestLiquidTokenContract
} from "../types/truffle-contracts/index";
// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, expectRevert, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();
var expect = require("chai").expect;
const w3random = require("./utils/w3random");
const findEventArgs = require("./utils/findEventArgs");
const expectEqualBN = require("./utils/expectEqualBN");

const Pool = artifacts.require("Pool");
const FundsModule = artifacts.require("FundsModule");
const CurveModule = artifacts.require("CurveModule");

const PToken = artifacts.require("PToken");
const TestLiquidToken = artifacts.require("TestLiquidToken");

contract("FundsModule", async ([_, owner, liquidityProvider, borrower, ...otherAccounts]) => {
    let pool: PoolInstance;
    let funds: FundsModuleInstance; 
    let curve: CurveModuleInstance; 
    let pToken: PTokenInstance;
    let lToken: TestLiquidTokenInstance;

    beforeEach(async () => {
        //Setup system contracts
        pool = await Pool.new();
        await pool.initialize(owner, {from: owner});

        lToken = await TestLiquidToken.new();
        await (<any> lToken).methods['initialize(address)'](owner, {from: owner});

        pToken = await PToken.new();
        await (<any> pToken).methods['initialize(address)'](owner, {from: owner});

        funds = await FundsModule.new();
        await (<any> funds).methods['initialize(address,address,address,address)'](owner, pool.address, lToken.address, pToken.address, {from: owner});
        await pool.set("funds", funds.address, true, {from: owner});  
        await pToken.addMinter(funds.address, {from: owner});

        curve = await CurveModule.new();
        await (<any> curve).methods['initialize(address,address)'](owner, pool.address, {from: owner});
        await pool.set("curve", curve.address, true, {from: owner});  

        //Do common tasks
        lToken.mint(liquidityProvider, web3.utils.toWei('1000000'), {from: owner});
        await lToken.approve(funds.address, web3.utils.toWei('1000000'), {from: liquidityProvider})

    });
  
    it('should allow deposit if no debts', async () => {
        let amountWeiLToken = w3random.interval(1, 100000, 'ether');
        let receipt = await funds.deposit(amountWeiLToken, '0', {from: liquidityProvider});
        let totalLiquidAssets = await lToken.balanceOf(funds.address);
        expectEvent(receipt, 'Deposit', {'sender':liquidityProvider, 'lAmount':totalLiquidAssets});
        let lpBalance = await pToken.balanceOf(liquidityProvider);
        expect(lpBalance).to.be.bignumber.gt('0');
    });
    it('should allow withdraw if no debts', async () => {
        let lDepositWei = w3random.interval(2000, 100000, 'ether');
        await funds.deposit(lDepositWei, '0', {from: liquidityProvider});
        let lBalance = await lToken.balanceOf(liquidityProvider);
        let pBalance = await pToken.balanceOf(liquidityProvider);
        let lBalanceO = await lToken.balanceOf(owner);

        let lWithdrawWei = w3random.intervalBN(web3.utils.toWei('1', 'ether'), web3.utils.toWei('999', 'ether'));
        let pWithdrawWei = await funds.calculatePoolExit(lWithdrawWei);
        pToken.approve(funds.address, pBalance, {from: liquidityProvider});
        // console.log('lToken balance', lBalance.toString());
        // console.log('pToken balance', pBalance.toString());
        // console.log('lWithdrawWei', withdrawWei.toString());
        let receipt = await funds.withdraw(pWithdrawWei, '0', {from: liquidityProvider});
        expectEvent(receipt, 'Withdraw', {'sender':liquidityProvider});
        let lBalance2 = await lToken.balanceOf(liquidityProvider);
        let pBalance2 = await pToken.balanceOf(liquidityProvider);
        let lBalanceO2 = await lToken.balanceOf(owner);
        let elBalance = lBalance2.sub(lWithdrawWei).add(lBalanceO2.sub(lBalanceO));
        // console.log('lToken balanc2', lBalance2.toString());
        // console.log('pToken balanc2', pBalance2.toString());
        expectEqualBN(elBalance,lBalance);
        expect(pBalance2).to.be.bignumber.lt(pBalance);
    });

    // it('should not allow deposit if there are debts', async () => {
    // });
    // it('should not allow withdraw if there are debts', async () => {
    // });

    it('should create several debt proposals and take user pTokens', async () => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));

        for(let i=0; i < 3; i++){
            //Prepare Borrower account
            let lDebtWei = w3random.interval(100, 200, 'ether');
            let lcWei = lDebtWei.div(new BN(2)).add(new BN(1));
            let pAmountMinWei = await funds.calculatePoolExit(lcWei);
            await prepareBorrower(pAmountMinWei);

            //Create Debt Proposal
            let receipt = await funds.createDebtProposal(lDebtWei, '0', pAmountMinWei, '0', {from: borrower});
            expectEvent(receipt, 'DebtProposalCreated', {'sender':borrower, 'proposal':String(i), 'lAmount':lDebtWei});

            let proposal = await funds.debtProposals(borrower, i);
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
        let receipt = await funds.createDebtProposal(lDebtWei, '0', pAmountMinWei, '0', {from: borrower});
        let proposalIdx = findEventArgs(receipt, 'DebtProposalCreated')['proposal'].toString();
        //console.log(proposalIdx);

        //Add Pleddge
        let lPledgeWei = w3random.interval(10, 50, 'ether');
        let pPledgeWei = await funds.calculatePoolExit(lPledgeWei);
        let elPledgeWei = await funds.calculatePoolExitInverse(pPledgeWei);
        expectEqualBN(elPledgeWei[0],lPledgeWei);
        await prepareSupporter(pPledgeWei, otherAccounts[0]);
        receipt = await funds.addPledge(borrower, proposalIdx, pPledgeWei, '0',{from: otherAccounts[0]});
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
        let receipt = await funds.createDebtProposal(lDebtWei, '0', pAmountMinWei, '0', {from: borrower});
        let proposalIdx = findEventArgs(receipt, 'DebtProposalCreated')['proposal'].toString();
        //console.log(proposalIdx);

        //Add Pleddge
        let lPledgeWei = w3random.interval(10, 50, 'ether');
        let pPledgeWei = await funds.calculatePoolExit(lPledgeWei);
        let elPledgeWei = await funds.calculatePoolExitInverse(pPledgeWei);
        expectEqualBN(elPledgeWei[0],lPledgeWei);
        await prepareSupporter(pPledgeWei, otherAccounts[0]);
        receipt = await funds.addPledge(borrower, proposalIdx, pPledgeWei, '0', {from: otherAccounts[0]});

        //Withdraw pledge
        //TODO - find out problem with full pledge withraw
        receipt = await funds.withdrawPledge(borrower, proposalIdx, pPledgeWei, {from: otherAccounts[0]});  
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
        let receipt = await funds.createDebtProposal(lDebtWei, '0', pAmountMinWei, '0', {from: borrower});
        let proposalIdx = findEventArgs(receipt, 'DebtProposalCreated')['proposal'].toString();
        //console.log(proposalIdx);

        //Add Pleddge
        let lPledgeWei = w3random.interval(10, 50, 'ether');
        let pPledgeWei = await funds.calculatePoolExit(lPledgeWei);
        // console.log('lPledgeWei', lPledgeWei.toString());
        // console.log('pPledgeWei', pPledgeWei.toString());
        await prepareSupporter(pPledgeWei, otherAccounts[0]);
        receipt = await funds.addPledge(borrower, proposalIdx, pPledgeWei, '0', {from: otherAccounts[0]});

        //Withdraw pledge
        await expectRevert(
            funds.withdrawPledge(borrower, proposalIdx, pPledgeWei.add(new BN(1)), {from: otherAccounts[0]}),
            'FundsModule: Can not withdraw more then locked'
        );  
    });
    // it('should execute for successful debt proposal', async () => {
    // });
    // it('should repay debt', async () => {
    // });
    // it('should partially redeem pledge from debt', async () => {
    // });
    // it('should fully redeem pledge from fully paid debt (without partial redeem)', async () => {
    // });
    // it('should fully redeem pledge from fully paid debt (after partial redeem)', async () => {
    // });


    async function prepareLiquidity(amountWei:BN){
        await funds.deposit(amountWei, '0', {from: liquidityProvider});
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
});
