import {
    PoolContract, PoolInstance, 
    FundsModuleContract, FundsModuleInstance, 
    LoanModuleStubContract, LoanModuleStubInstance,
    CurveModuleContract, CurveModuleInstance,
    PTokenContract, PTokenInstance, 
    FreeDAIContract, FreeDAIInstance
} from "../types/truffle-contracts/index";
import Snapshot from "./utils/snapshot";
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
    let snap: Snapshot;

    let pool: PoolInstance;
    let funds: FundsModuleInstance; 
    let loanm: LoanModuleStubInstance; 
    let curve: CurveModuleInstance; 
    let pToken: PTokenInstance;
    let lToken: FreeDAIInstance;

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
        //Save snapshot
        snap = await Snapshot.create(web3.currentProvider);
    });
    beforeEach(async () => {
        // await snap.revert();
    });
/*
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
        await funds.depositPTokens(liquidityProvider, web3.utils.toWei('1000'), {from: tester});
        let preTestPBalanceWei = await pToken.balanceOf(funds.address);
        let amountWei = w3random.interval(1, 1000, 'ether');
        let receipt = await funds.withdrawPTokens(liquidityProvider, amountWei, {from: tester});
        let expectedPostTestPBalanceWei = preTestPBalanceWei.sub(amountWei);
        let postTestPBalanceWei = await pToken.balanceOf(funds.address);
        expect(postTestPBalanceWei).to.be.bignumber.equal(expectedPostTestPBalanceWei);
    });    
    it('should mint PTokens', async () => {
        let preTestPBalanceWei = await pToken.balanceOf(liquidityProvider);
        let amountWei = w3random.interval(1, 1000, 'ether');
        let receipt = await (<any>funds).methods['mintPTokens(address,uint256)'](liquidityProvider, amountWei, {from: tester});
        let expectedPostTestPBalanceWei = preTestPBalanceWei.add(amountWei);
        let postTestPBalanceWei = await pToken.balanceOf(liquidityProvider);
        expect(postTestPBalanceWei).to.be.bignumber.equal(expectedPostTestPBalanceWei);
    });    
    it('should burn locked PTokens', async () => {
        await funds.depositPTokens(liquidityProvider, web3.utils.toWei('1000'), {from: tester});
        let amountWei = w3random.interval(1, 1000, 'ether');
        await (<any>funds).methods['depositPTokens(address,uint256)'](liquidityProvider, amountWei, {from:tester});
        let loanHash = web3.utils.randomHex(32);
        await funds.lockPTokens(loanHash, [liquidityProvider], [amountWei], {from:tester});
        let preTestPBalanceWei = await pToken.balanceOf(funds.address);
        let receipt = await funds.burnLockedPTokens(loanHash, amountWei, {from: tester});
        let expectedPostTestPBalanceWei = preTestPBalanceWei.sub(amountWei);
        let postTestPBalanceWei = await pToken.balanceOf(funds.address);
        expect(postTestPBalanceWei).to.be.bignumber.equal(expectedPostTestPBalanceWei);
    });    
    it('should burn PTokens from user', async () => {
        await funds.depositPTokens(liquidityProvider, web3.utils.toWei('1000'), {from: tester});
        let preTestPBalanceWei = await pToken.balanceOf(liquidityProvider);
        let amountWei = w3random.interval(1, 1000, 'ether');
        let receipt = await (<any>funds).methods['burnPTokens(address,uint256)'](liquidityProvider, amountWei, {from: tester});
        let expectedPostTestPBalanceWei = preTestPBalanceWei.sub(amountWei);
        let postTestPBalanceWei = await pToken.balanceOf(liquidityProvider);
        expect(postTestPBalanceWei).to.be.bignumber.equal(expectedPostTestPBalanceWei);
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
*/
    it('should distribute to pTokens not locked in a loan', async () => {
        for(let i=0; i < 5; i++){
            await pToken.mint(otherAccounts[i], w3random.interval(50, 100, 'ether'), {from: owner});
        }
        await funds.depositPTokens(otherAccounts[0], w3random.interval(10, 50, 'ether'), {from: tester});
        let pBalanceInFunds = await funds.pBalanceOf(otherAccounts[0]);
        let pBalanceOwn = await pToken.balanceOf(otherAccounts[0]);
        let pTotalSupply = await pToken.totalSupply();
        let pDistribution = w3random.interval(1, 5, 'ether');
        let pDistrOwn = pBalanceOwn.add(pBalanceInFunds).mul(pDistribution).div(pTotalSupply);
        await pToken.distribute(pDistribution, {from: owner});
        await (<any>pToken).methods['claimDistributions(address)'](otherAccounts[0]);
        let pBalanceOwnAfter = await pToken.balanceOf(otherAccounts[0]);
        expectEqualBN(pBalanceOwnAfter, pBalanceOwn.add(pDistrOwn));
    });
    it('should lock and unlock pTokens in a loan', async () => {
        let pInitial:Array<BN> = [];
        let pFInitial:Array<BN> = [];
        let pDeposits:Array<BN> = [];
        let pDepositTotal = new BN(0);
        for(let i=0; i < 5; i++){
            await (<any>pToken).methods['claimDistributions(address)'](otherAccounts[i]);    //previous tests may cause unclaimed distributions
            pInitial[i] = await pToken.balanceOf(otherAccounts[i]);
            pFInitial[i] = await funds.pBalanceOf(otherAccounts[i]);
            pDeposits[i] = w3random.interval(100, 300, 'ether');
            await pToken.mint(otherAccounts[i], pDeposits[i], {from: owner});            
            await funds.depositPTokens(otherAccounts[i], pDeposits[i], {from: tester});
            let pBalance = await funds.pBalanceOf(otherAccounts[i]);
            expect(pBalance).to.be.bignumber.equal(pFInitial[i].add(pDeposits[i]));
            pDepositTotal = pDepositTotal.add(pDeposits[i]);
        }
        let loanHash = web3.utils.randomHex(32);
        let receipt = await funds.lockPTokens(loanHash, otherAccounts.slice(0,5), pDeposits.slice(0,5), {from: tester});
        let lockedAmount:BN = (<any>await funds.loanLocks(loanHash)).pLockedAmount;
        expectEqualBN(lockedAmount, pDepositTotal);
        for(let i=0; i < 5; i++){
            await funds.unlockAndWithdrawPTokens(loanHash, otherAccounts[i], pDeposits[i], {from: tester});
            let pBalance = await pToken.balanceOf(otherAccounts[i]);
            expectEqualBN(pBalance, pInitial[i].add(pDeposits[i]));
        }        
        lockedAmount= (<any>await funds.loanLocks(loanHash)).pLockedAmount;
        expectEqualBN(lockedAmount, new BN(0));
    });
    it('should distribute to pTokens locked in a loan', async () => {
        for(let i=0; i < 5; i++){
            await pToken.mint(otherAccounts[i], w3random.interval(50, 100, 'ether'), {from: owner});
        }
        let pDeposits:Array<BN> = [];
        for(let i=0; i < 3; i++){
            pDeposits[i] = w3random.interval(10, 20, 'ether');
            await funds.depositPTokens(otherAccounts[i], pDeposits[i], {from: tester});
        }
        let loanHash = web3.utils.randomHex(32);
        await funds.lockPTokens(loanHash, otherAccounts.slice(0,3), pDeposits.slice(0,3), {from: tester});
        let pTotalSupply = await pToken.totalSupply();
        let pPool = await funds.pBalanceOf(funds.address);
        console.log('pPool', pPool.toString());
        let pDistribution = w3random.interval(1, 5, 'ether');
        console.log('pDistribution', pDistribution.toString());
        await pToken.distribute(pDistribution, {from: owner});
        await (<any>pToken).methods['claimDistributions(address)'](funds.address);
        let pPoolAfterDistr = await funds.pBalanceOf(funds.address);
        console.log('pPoolAfterDistr', pPoolAfterDistr.toString());
        expectEqualBN(pPoolAfterDistr, pPool.add(pPool.mul(pDistribution).div(pTotalSupply)));
        for(let i=0; i < 3; i++){
            pPool = await funds.pBalanceOf(funds.address);
            let pDistrLockedOwn = pDeposits[i].mul(pDistribution).div(pTotalSupply);
            console.log(`Withdraw for ${i}: ${otherAccounts[i]}`, pDeposits[i].toString(), pDistrLockedOwn.toString());
            await funds.unlockAndWithdrawPTokens(loanHash, otherAccounts[i], pDeposits[i], {from: tester});
            let pPoolAfterWithdr = await funds.pBalanceOf(funds.address);
            console.log(`Pool after withdraw ${i}`, pPoolAfterWithdr.toString());
            //expectEqualBN(pPoolAfterWithdr, pPool.sub(pDeposits[i]).sub(pDistrLockedOwn));
        }        

        // await pToken.claimDistributions(otherAccounts[0]);
        // let pBalanceOwnAfter = await pToken.balanceOf(otherAccounts[0]);
        // expectEqualBN(pBalanceOwnAfter, pFullBalanceOwn.add(pDistrOwn));

    });


});
