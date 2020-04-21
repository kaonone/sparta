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
    let loanpm: LoanModuleStubInstance; 
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
        loanpm = await LoanModuleStub.new();
        await (<any> loanpm).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("loan_proposals", loanpm.address, true, {from: owner});  

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
        await snap.revert();
    });
    
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
        await funds.lockPTokens([liquidityProvider], [amountWei], {from:tester});
        let preTestPBalanceWei = await pToken.balanceOf(funds.address);
        let receipt = await funds.burnLockedPTokens(amountWei, {from: tester});
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
        let pFundsBalanceBefore = await funds.pBalanceOf(funds.address);
        let receipt = await funds.lockPTokens(otherAccounts.slice(0,5), pDeposits.slice(0,5), {from: tester});
        let pFundsBalanceAfter = await funds.pBalanceOf(funds.address);
        let lockedAmount = pFundsBalanceAfter.sub(pFundsBalanceBefore);
        expectEqualBN(lockedAmount, pDepositTotal);
        for(let i=0; i < 5; i++){
            await funds.unlockAndWithdrawPTokens(otherAccounts[i], pDeposits[i], {from: tester});
            let pBalance = await pToken.balanceOf(otherAccounts[i]);
            expectEqualBN(pBalance, pInitial[i].add(pDeposits[i]));
        }        
        pFundsBalanceAfter = await funds.pBalanceOf(funds.address);
        expectEqualBN(pFundsBalanceAfter, pFundsBalanceBefore);
    });
    
    it('should handle several distributions and mint', async () => {
        let pInitial:Array<BN> = [];
        for(let i=0; i < 5; i++){
            await pToken.mint(otherAccounts[i], w3random.interval(50, 100, 'ether'), {from: owner});
            pInitial[i] = await pToken.balanceOf(otherAccounts[i]);
        }
        let pTotalSupply = await pToken.totalSupply();
        let pFundsBalanceInitial = await funds.pBalanceOf(funds.address);

        // Deposit tokens in proposal
        let pDeposits:Array<BN> = [];
        let pDepositTotal = new BN(0);
        for(let i=0; i < 3; i++){
            pDeposits[i] = w3random.interval(10, 20, 'ether');
            await funds.depositPTokens(otherAccounts[i], pDeposits[i], {from: tester});
            pDepositTotal = pDepositTotal.add(pDeposits[i]);            

            let ptkBalance = await pToken.balanceOf(otherAccounts[i]);
            let fullBalance = await pToken.fullBalanceOf(otherAccounts[i]);
            expectEqualBN(fullBalance, ptkBalance.add(pDeposits[i]));
        }
        for(let i=3; i < 5; i++){
            pDeposits[i] = new BN(0);
        }

        // Execute proposal
        await funds.lockPTokens(otherAccounts.slice(0,3), pDeposits.slice(0,3), {from: tester});
        for(let i=0; i < 3; i++){
            let ptkBalance = await pToken.balanceOf(otherAccounts[i]);
            let fullBalance = await pToken.fullBalanceOf(otherAccounts[i]);
            expectEqualBN(fullBalance, ptkBalance);
        }
        let pFundsBalance = await funds.pBalanceOf(funds.address);
        expectEqualBN(pFundsBalance, pFundsBalanceInitial.add(pDepositTotal));

        // Distribution 1
        let pDistribution1 = w3random.interval(1, 5, 'ether');
        await pToken.distribute(pDistribution1, {from: owner});
        for(let i=0; i < 5; i++){
            let ptkBalance = await pToken.balanceOf(otherAccounts[i]);
            let fullBalance = await pToken.fullBalanceOf(otherAccounts[i]);
            let pMyDistributed1 = pInitial[i].sub(pDeposits[i]).mul(pDistribution1).div(pTotalSupply.sub(pDepositTotal));
            expectEqualBN(fullBalance, ptkBalance.add(pMyDistributed1));
        }

        // Unlock half of the supporters pledges
        let pUnlockedTotal = new BN(0);
        for(let i=1; i < 3; i++){
            let pUnlock = pDeposits[i].div(new BN(2));
            pUnlockedTotal = pUnlockedTotal.add(pUnlock);
            await funds.unlockAndWithdrawPTokens(otherAccounts[i], pUnlock, {from: tester});
            let ptkBalance = await pToken.balanceOf(otherAccounts[i]);
            let fullBalance = await pToken.fullBalanceOf(otherAccounts[i]);
            let pMyDistributed1 = pInitial[i].sub(pDeposits[i]).mul(pDistribution1).div(pTotalSupply.sub(pDepositTotal));
            expectEqualBN(ptkBalance, pInitial[i].sub(pDeposits[i]).add(pUnlock).add(pMyDistributed1));
            expectEqualBN(fullBalance, ptkBalance);
        }
        pFundsBalance = await funds.pBalanceOf(funds.address);
        expectEqualBN(pFundsBalance, pFundsBalanceInitial.add(pDepositTotal).sub(pUnlockedTotal));

        // Mint
        let pMint = w3random.interval(1, 5, 'ether');
        await funds.mintAndLockPTokens(pMint, {from: tester});
        let pExpectedTotalSupply1 = pTotalSupply.add(pDistribution1).add(pMint);
        expectEqualBN(await pToken.totalSupply(), pExpectedTotalSupply1);
        pFundsBalance = await funds.pBalanceOf(funds.address);
        expectEqualBN(pFundsBalance, pFundsBalanceInitial.add(pDepositTotal).sub(pUnlockedTotal).add(pMint));

        // Distribuition 2
        let pDistribution2 = new BN(0); //w3random.interval(1, 5, 'ether');
        //await pToken.distribute(pDistribution2, {from: owner});
        let pExpectedTotalSupply2 = pExpectedTotalSupply1.add(pDistribution2);
        expectEqualBN(await pToken.totalSupply(), pExpectedTotalSupply2);
        await (<any>pToken).methods['claimDistributions(address[])'](otherAccounts.slice(0, 5));

        for(let i=0; i < 3; i++){
            let pWithdraw:BN;
            switch (i) {
                case 0:
                    pWithdraw = pDeposits[i];
                    break;
                case 1:
                case 2:
                    let pMyMint = pMint.mul(pDeposits[i]).div(pDepositTotal.sub(pDeposits[0])); 
                    pWithdraw = pDeposits[i].div(new BN(2)).add(pMyMint);
                    break;
                default:
                    pWithdraw = new BN(0);
            }

            let balanceBefore = await pToken.balanceOf(otherAccounts[i]);           
            await funds.unlockAndWithdrawPTokens(otherAccounts[i], pWithdraw, {from: tester});

            let balanceAfter= await pToken.balanceOf(otherAccounts[i]);
            let pDistributedAndMinted = balanceAfter.sub(balanceBefore).sub(pWithdraw);
            let expectedDistributed = new BN(0); //pWithdraw.mul(pDistribution1).div(pTotalSupply.add(pDistribution1));
            //expectedDistributed = expectedDistributed.add(pWithdraw.add(expectedDistributed).mul(pDistribution2).div(pExpectedTotalSupply1));
            expectEqualBN(pDistributedAndMinted, expectedDistributed);
        }
        let pExpectedTotalSupply = pTotalSupply.add(pDistribution1).add(pMint).add(pDistribution2);
        expectEqualBN(await pToken.totalSupply(), pExpectedTotalSupply);
        await (<any>pToken).methods['claimDistributions(address[])'](otherAccounts.slice(3, 5));
        for(let i=0; i < 5; i++){
            let pMyDistributed1:BN, pMyMinted:BN, pBalanceBeforeDistr2:BN, pMyDistributed2:BN, pExpectedBalance:BN;
            switch (i) {
                case 0:
                    pMyDistributed1 = pInitial[i].sub(pDeposits[i]).mul(pDistribution1).div(pTotalSupply.sub(pDepositTotal));
                    pMyMinted = new BN(0);
                    break;
                case 1:
                case 2:
                    pMyDistributed1 = pInitial[i].sub(pDeposits[i]).mul(pDistribution1).div(pTotalSupply.sub(pDepositTotal));
                    pMyMinted = pMint.mul(pDeposits[i]).div(pDepositTotal.sub(pDeposits[0]));
                    break;
                default:
                    pMyDistributed1 = pInitial[i].mul(pDistribution1).div(pTotalSupply.sub(pDepositTotal));
                    pMyMinted = new BN(0);
            }                
            pBalanceBeforeDistr2 = pInitial[i].add(pMyMinted).add(pMyDistributed1);
            pMyDistributed2 = new BN(0); //pBalanceBeforeDistr2.mul(pDistribution2).div(pTotalSupply.add(pDistribution1).add(pMint));
            pExpectedBalance = pInitial[i].add(pMyMinted).add(pMyDistributed1).add(pMyDistributed2);

            let pBalance = await pToken.balanceOf(otherAccounts[i]);
            // console.log(
            //     `User ${i} - ${otherAccounts[i]}:\n`,
            //     `pInitial = ${pInitial[i].toString()}`,
            //     `pMyDistributed1 = ${pMyDistributed1.toString()}`,
            //     `pMyMinted = ${pMyMinted.toString()}`,
            //     `pBalanceBeforeDistr2 = ${pBalanceBeforeDistr2.toString()}`,
            //     `pMyDistributed2 = ${pMyDistributed2.toString()}\n`,
            //     `pExpectedBalance = ${pExpectedBalance.toString()}`,
            //     `pBalance = ${pBalance.toString()}`,
            // );
            expectEqualBN(pBalance, pExpectedBalance);
        }
    });
    
});
