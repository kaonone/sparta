import {
    PoolContract, PoolInstance, 
    FundsModuleContract, FundsModuleInstance, 
    CurveModuleContract, CurveModuleInstance,
    PTokenContract, PTokenInstance, 
    TestLiquidTokenInstance, TestLiquidTokenContract
} from "../types/truffle-contracts/index";
// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();
var expect = require("chai").expect;
const w3random = require("./utils/w3random");

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
        lToken.mint(liquidityProvider, web3.utils.toWei('100000'), {from: owner});
        await lToken.approve(funds.address, web3.utils.toWei('100000'), {from: liquidityProvider})

    });
  
    it('should allow deposit if no debts', async () => {
        let amountWeiLToken = w3random.interval(1, 100000, 'ether');
        let receipt = await funds.deposit(amountWeiLToken, {from: liquidityProvider});
        let totalLiquidAssets = await lToken.balanceOf(funds.address);
        expectEvent(receipt, 'Deposit', {'sender':liquidityProvider, 'liquidTokenAmount':totalLiquidAssets});
        let lpBalance = await pToken.balanceOf(liquidityProvider);
        expect(lpBalance).to.be.bignumber.gt('0');
    });
    it('should allow withdraw if no debts', async () => {
        let depositWei = w3random.interval(1000, 100000, 'ether');
        await funds.deposit(depositWei, {from: liquidityProvider});
        let lBalance = await lToken.balanceOf(liquidityProvider);
        let pBalance = await pToken.balanceOf(liquidityProvider);

        let withdrawWei = w3random.intervalBN(web3.utils.toWei('1', 'ether'), web3.utils.toWei('999', 'ether'));
        pToken.approve(funds.address, pBalance, {from: liquidityProvider});
        // console.log('lToken balance', lBalance.toString());
        // console.log('pToken balance', pBalance.toString());
        // console.log('withdrawWei', withdrawWei.toString());
        let receipt = await funds.withdraw(withdrawWei, {from: liquidityProvider});
        expectEvent(receipt, 'Withdraw', {'sender':liquidityProvider, 'liquidTokenAmount':withdrawWei});
        let lBalance2 = await lToken.balanceOf(liquidityProvider);
        let pBalance2 = await pToken.balanceOf(liquidityProvider);
        // console.log('lToken balanc2', lBalance2.toString());
        // console.log('pToken balanc2', pBalance2.toString());
        expect(lBalance2.sub(withdrawWei)).to.be.bignumber.equal(lBalance);
        expect(pBalance2).to.be.bignumber.lt(pBalance);
    });

    // it('should not allow deposit if there are debts', async () => {
    // });
    // it('should not allow withdraw if there are debts', async () => {
    // });

    it('should create several debt proposals and take user pTokens', async () => {
        //Prepare Fund
        let depositWei = w3random.interval(1000, 100000, 'ether');
        await funds.deposit(depositWei, {from: liquidityProvider});

        //Prepare Borrower account
        let debtWei = w3random.interval(100, 200, 'ether');
        let debtPWei = await curve.calculateExit((await funds.totalLiquidAssets()), debtWei);
        pToken.transfer(borrower, debtPWei.div(new BN(2)).add(new BN(1)), {from: liquidityProvider}); //TODO find out why +1 required
        pToken.approve(funds.address, debtPWei, {from: borrower});

        // console.log('Funds', funds.address);
        // console.log('Borrower', borrower);
        // console.log('debtWei', debtWei.toString());
        // console.log('debtPWei', debtPWei.toString());
        // console.log('Borrower pBalance', (await pToken.balanceOf(borrower)).toString());

        //Create Debt Proposal
        let receipt = await funds.createDebtProposal(debtWei, {from: borrower});
        expectEvent(receipt, 'DebtProposalCreated', {'sender':borrower, 'proposal':'0', 'liquidTokenAmount':debtWei});
        //let proposals = await funds.debtProposals(borrower, 0);
        //console.log(proposals);

        //TODO Add more proposals

    });
    // it('should create pledge in debt proposal', async () => {
    // });
    // it('should withdraw pledge in debt proposal', async () => {
    // });
    // it('should borrow for successful debt proposal', async () => {
    // });
    // it('should repay debt', async () => {
    // });
    // it('should partially redeem pledge from debt', async () => {
    // });
    // it('should fully redeem pledge from fully paid debt (without partial redeem)', async () => {
    // });
    // it('should fully redeem pledge from fully paid debt (after partial redeem)', async () => {
    // });

});
