import {
    PoolContract, PoolInstance, 
    FundsModuleContract, FundsModuleInstance, 
    LoanModuleStubContract, LoanModuleStubInstance,
    CurveModuleContract, CurveModuleInstance,
    PTokenContract, PTokenInstance, 
    FreeDAIContract, FreeDAIInstance
} from "../types/truffle-contracts/index";
// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, shouldFail, time } = require("@openzeppelin/test-helpers");
const expectRevert= require("./utils/expectRevert");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();
var expect = require("chai").expect;
const w3random = require("./utils/w3random");
const findEventArgs = require("./utils/findEventArgs");
const expectEqualBN = require("./utils/expectEqualBN");

const Pool = artifacts.require("Pool");
const FundsModule = artifacts.require("FundsModule");
const LoanModuleStub = artifacts.require("LoanModuleStub");
const CurveModule = artifacts.require("CurveModule");

const PToken = artifacts.require("PToken");
const FreeDAI = artifacts.require("FreeDAI");

contract("FundsModule", async ([_, owner, liquidityProvider, borrower, tester, ...otherAccounts]) => {
    let pool: PoolInstance;
    let funds: FundsModuleInstance; 
    let loanm: LoanModuleStubInstance; 
    let curve: CurveModuleInstance; 
    let pToken: PTokenInstance;
    let lToken: FreeDAIInstance;

    before(async () => {
        //Setup system contracts
        pool = await Pool.new();
        await pool.initialize({from: owner});

        lToken = await FreeDAI.new();
        await (<any> lToken).methods['initialize()']({from: owner});
        await pool.set("ltoken", lToken.address, true, {from: owner});  

        pToken = await PToken.new();
        await (<any> pToken).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("ptoken", pToken.address, true, {from: owner});  

        curve = await CurveModule.new();
        await (<any> curve).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("curve", curve.address, true, {from: owner});  

        loanm = await LoanModuleStub.new();
        await (<any> loanm).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("loan", loanm.address, true, {from: owner});  

        funds = await FundsModule.new();
        await (<any> funds).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("funds", funds.address, true, {from: owner});  
        await pToken.addMinter(funds.address, {from: owner});
        await funds.addFundsOperator(loanm.address, {from: owner});
        await funds.addFundsOperator(tester, {from: owner});

        //Do common tasks
        lToken.mint(liquidityProvider, web3.utils.toWei('1000000'), {from: owner});
        await lToken.approve(funds.address, web3.utils.toWei('1000000'), {from: liquidityProvider});

        pToken.mint(liquidityProvider, web3.utils.toWei('1000000'), {from: owner});
        await pToken.approve(funds.address, web3.utils.toWei('1000000'), {from: liquidityProvider});
    })

    it('should deposit LTokens', async () => {
        let preTestLBalanceWei = await lToken.balanceOf(funds.address);
        let preTestFundsLBalanceWei = await funds.lBalance();
        expect(preTestFundsLBalanceWei).to.be.bignumber.equal(preTestFundsLBalanceWei);
        let amountWei = w3random.interval(1, 100000, 'ether');
        let receipt = await funds.depositLTokens(liquidityProvider, amountWei, {from: tester});
        let expectedPostTestLBalanceWei = preTestLBalanceWei.add(amountWei);
        expectEvent(receipt, 'Status',{'lBalance':expectedPostTestLBalanceWei});
        let postTestLBalanceWei = await lToken.balanceOf(funds.address);
        let postTestFundsLBalanceWei = await funds.lBalance();
        expect(postTestFundsLBalanceWei).to.be.bignumber.equal(postTestLBalanceWei);
        expect(postTestLBalanceWei).to.be.bignumber.equal(expectedPostTestLBalanceWei);
    });    

    it('should withdraw LTokens', async () => {
        await funds.depositLTokens(liquidityProvider, web3.utils.toWei('2000'), {from: tester});
        let preTestLBalanceWei = await lToken.balanceOf(funds.address);
        let preTestFundsLBalanceWei = await funds.lBalance();
        expect(preTestFundsLBalanceWei).to.be.bignumber.equal(preTestFundsLBalanceWei);
        let amountWei = w3random.interval(1, 1000, 'ether');
        let feeWei = w3random.interval(1, 10, 'ether');
        let receipt = await  (<any>funds).methods['withdrawLTokens(address,uint256,uint256)'](liquidityProvider, amountWei, feeWei, {from: tester});
        let expectedPostTestLBalanceWei = preTestLBalanceWei.sub(amountWei).sub(feeWei);
        expectEvent(receipt, 'Status',{'lBalance':expectedPostTestLBalanceWei});
        let postTestLBalanceWei = await lToken.balanceOf(funds.address);
        let postTestFundsLBalanceWei = await funds.lBalance();
        expect(postTestFundsLBalanceWei).to.be.bignumber.equal(postTestLBalanceWei);
        expect(postTestLBalanceWei).to.be.bignumber.equal(expectedPostTestLBalanceWei);
    });    
    it('should deposit PTokens', async () => {
        let preTestPBalanceWei = await pToken.balanceOf(funds.address);
        let amountWei = w3random.interval(1, 100000, 'ether');
        let receipt = await funds.depositPTokens(liquidityProvider, amountWei, {from: tester});
        let expectedPostTestPBalanceWei = preTestPBalanceWei.add(amountWei);
        let postTestPBalanceWei = await pToken.balanceOf(funds.address);
        expect(postTestPBalanceWei).to.be.bignumber.equal(expectedPostTestPBalanceWei);
    });    
    it('should withdraw PTokens', async () => {
        await pToken.mint(funds.address, web3.utils.toWei('1000'), {from: owner});
        let preTestPBalanceWei = await pToken.balanceOf(funds.address);
        let amountWei = w3random.interval(1, 1000, 'ether');
        let receipt = await funds.withdrawPTokens(liquidityProvider, amountWei, {from: tester});
        let expectedPostTestPBalanceWei = preTestPBalanceWei.sub(amountWei);
        let postTestPBalanceWei = await pToken.balanceOf(funds.address);
        expect(postTestPBalanceWei).to.be.bignumber.equal(expectedPostTestPBalanceWei);
    });    
    it('should mint PTokens', async () => {
        let preTestPBalanceWei = await pToken.balanceOf(funds.address);
        let amountWei = w3random.interval(1, 1000, 'ether');
        let receipt = await funds.mintPTokens(liquidityProvider, amountWei, {from: tester});
        let expectedPostTestPBalanceWei = preTestPBalanceWei.sub(amountWei);
        let postTestPBalanceWei = await pToken.balanceOf(funds.address);
    });    
    it('should burn locked PTokens', async () => {
        await pToken.mint(funds.address, web3.utils.toWei('1000'), {from: owner});
        let preTestPBalanceWei = await pToken.balanceOf(funds.address);
        let amountWei = w3random.interval(1, 1000, 'ether');
        await pToken.transfer(funds.address, amountWei, {from:liquidityProvider});
        let receipt = await (<any>funds).methods['burnPTokens(uint256)'](amountWei, {from: tester});
        let expectedPostTestPBalanceWei = preTestPBalanceWei.sub(amountWei);
        let postTestPBalanceWei = await pToken.balanceOf(funds.address);
    });    
    it('should burn PTokens from user', async () => {
        await pToken.mint(funds.address, web3.utils.toWei('1000'), {from: owner});
        let preTestPBalanceWei = await pToken.balanceOf(funds.address);
        let amountWei = w3random.interval(1, 1000, 'ether');
        let receipt = await (<any>funds).methods['burnPTokens(address,uint256)'](liquidityProvider, amountWei, {from: tester});
        let expectedPostTestPBalanceWei = preTestPBalanceWei.sub(amountWei);
        let postTestPBalanceWei = await pToken.balanceOf(funds.address);
    });    
    it('should refund LTokens', async () => {
        await funds.depositLTokens(liquidityProvider, web3.utils.toWei('2000'), {from: tester});
        let preTestLBalanceWei = await lToken.balanceOf(funds.address);
        let preTestFundsLBalanceWei = await funds.lBalance();
        expect(preTestFundsLBalanceWei).to.be.bignumber.equal(preTestFundsLBalanceWei);
        let amountWei = w3random.interval(1, 1000, 'ether');
        await lToken.mint(funds.address, amountWei, {from: owner});
        let inTestLBalanceWei = await lToken.balanceOf(funds.address);
        let inTestFundsLBalanceWei = await funds.lBalance();
        expect(inTestFundsLBalanceWei.add(amountWei)).to.be.bignumber.equal(inTestLBalanceWei);
        let receipt = await funds.refundLTokens(tester, amountWei, {from: tester});
        let postTestLBalanceWei = await lToken.balanceOf(funds.address);
        let postTestFundsLBalanceWei = await funds.lBalance();
        expect(postTestFundsLBalanceWei).to.be.bignumber.equal(preTestFundsLBalanceWei);
        expect(postTestLBalanceWei).to.be.bignumber.equal(postTestFundsLBalanceWei);
    });    
});
