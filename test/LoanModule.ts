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

contract("LoanModule", async ([_, owner, liquidityProvider, borrower, ...otherAccounts]) => {
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

    it('should repay debt and interest', async () => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));

        let debtLAmount = w3random.interval(100, 200, 'ether');
        let debtIdx = await createDebt(debtLAmount, otherAccounts[0]);
        let borrowerLBalance = await lToken.balanceOf(borrower);
        expect(borrowerLBalance).to.be.bignumber.gte(debtLAmount);

        // Partial repayment
        await time.increase(w3random.interval(30*24*60*60, 89*24*60*60));
        let repayLAmount = debtLAmount.div(new BN(3));
        await lToken.approve(funds.address, repayLAmount, {from: borrower});
        let receipt = await loanm.repay(debtIdx, repayLAmount, {from: borrower});
        expectEvent(receipt, 'Repay', {'sender':borrower, 'debt':debtIdx});
        let debtLRequiredPayments = await loanm.getDebtRequiredPayments(borrower, debtIdx);
        expect(debtLRequiredPayments[0]).to.be.bignumber.gt(new BN(0));
        expect(debtLRequiredPayments[1]).to.be.bignumber.eq(new BN(0));        

        // Repay rest
        await time.increase(w3random.interval(30*24*60*60, 89*24*60*60));
        debtLRequiredPayments = await loanm.getDebtRequiredPayments(borrower, debtIdx);
        //console.log('debtLRequiredPayments', debtLRequiredPayments[0].toString(), debtLRequiredPayments[1].toString());
        expect(debtLRequiredPayments[1]).to.be.bignumber.gt(new BN(0));

        let fullRepayLAmount = debtLRequiredPayments[0].add(debtLRequiredPayments[1]).add(debtLRequiredPayments[0].div(new BN(1000))); //add 0.1% of full left amount to handle possible additiona interest required
        await lToken.transfer(borrower, fullRepayLAmount, {from: liquidityProvider});
        await lToken.approve(funds.address, fullRepayLAmount, {from: borrower});
        receipt = await loanm.repay(debtIdx, fullRepayLAmount, {from: borrower});
        expectEvent(receipt, 'Repay', {'sender':borrower, 'debt':debtIdx});

        debtLRequiredPayments = await loanm.getDebtRequiredPayments(borrower, debtIdx);
        expect(debtLRequiredPayments[0]).to.be.bignumber.eq(new BN(0));
        expect(debtLRequiredPayments[1]).to.be.bignumber.eq(new BN(0));
    });
    
    it('should repay debt and interest with PTK', async () => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));

        let debtLAmount = w3random.interval(100, 200, 'ether');
        let debtIdx = await createDebt(debtLAmount, otherAccounts[0]);
        let borrowerLBalance = await lToken.balanceOf(borrower);
        expect(borrowerLBalance).to.be.bignumber.gte(debtLAmount);
        let borrowerPBalance = await pToken.balanceOf(borrower);

        // Partial repayment
        await time.increase(w3random.interval(30*24*60*60, 60*24*60*60));
        let debtLRequiredPaymentsBefore = await loanm.getDebtRequiredPayments(borrower, debtIdx);
        let repayLAmount = debtLAmount.div(new BN(3)).add(debtLRequiredPaymentsBefore[1]);
        let repayLAmountWithFee = repayLAmount.mul(percentDivider).div(percentDivider.sub(withdrawFeePercent));
        let repayPAmount = await funds.calculatePoolExit(repayLAmountWithFee);
        await prepareBorrower(repayPAmount);
        let pBalanceBefore = await pToken.balanceOf(borrower);

        let loanLRepay = repayLAmount.sub(debtLRequiredPaymentsBefore[1]);
        // console.log('debtLRequiredPaymentsBefore', debtLRequiredPaymentsBefore[0].toString(), debtLRequiredPaymentsBefore[1].toString());
        // console.log('loanLRepay', loanLRepay.toString());

        let receipt = await loanm.repayPTK(debtIdx, repayPAmount, repayLAmount.sub(new BN(1000)), {from: borrower});
        expectEvent(receipt, 'Repay', {'sender':borrower, 'debt':debtIdx});
        let receiptArgs = findEventArgs(receipt, 'Repay');
        expectEqualBN(receiptArgs.lFullPaymentAmount, repayLAmount);
        //expectEqualBN(receiptArgs.lInterestPaid, debtLRequiredPaymentsBefore[1]); //This check may fail because of time passed between getDebtRequiredPayments() call and repayPTK() call

        //console.log('receiptArgs', receiptArgs);
        let pBalanceAfter = await pToken.balanceOf(borrower);
        expectEqualBN(pBalanceBefore.sub(pBalanceAfter), repayPAmount);

        let debtLRequiredPayments = await loanm.getDebtRequiredPayments(borrower, debtIdx);
        expectEqualBN(debtLRequiredPayments[0], debtLRequiredPaymentsBefore[0].sub(repayLAmount.sub(receiptArgs.lInterestPaid)));
        expect(debtLRequiredPayments[1]).to.be.bignumber.eq(new BN(0));

        // Repay rest
        await time.increase(w3random.interval(30*24*60*60, 89*24*60*60));
        debtLRequiredPayments = await loanm.getDebtRequiredPayments(borrower, debtIdx);
        repayLAmount = debtLRequiredPayments[0].add(debtLRequiredPayments[1]);
        repayLAmountWithFee = repayLAmount.mul(percentDivider).div(percentDivider.sub(withdrawFeePercent));
        repayPAmount = await funds.calculatePoolExit(repayLAmountWithFee);
        repayPAmount = repayPAmount.mul(new BN(101)).div(new BN(100)); //Add 1% rezerv
        await prepareBorrower(repayPAmount);
        receipt = await loanm.repayPTK(debtIdx, repayPAmount, repayLAmount.sub(new BN(1000)), {from: borrower});
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
        let randTime = w3random.interval(30*24*60*60, 89*24*60*60);
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
        await time.increase(w3random.interval(30*24*60*60, 89*24*60*60));
        let requiredPayments = await loanm.getDebtRequiredPayments(borrower, debtIdx);
        expect(requiredPayments[0]).to.be.bignumber.eq(debtLAmount); // Debt equal to loaned amount   
        expect(requiredPayments[1]).to.be.bignumber.gt('0');         // Some interest payment required
        let repayLAmount = requiredPayments[0].add(requiredPayments[1]).add(requiredPayments[0].div(new BN(1000)));
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
        await lToken.transfer(borrower, debtLAmount.div(new BN(10)), {from: liquidityProvider});    //Transfer 10% of debtLAmount for paying interest

        // Partial repayment
        await time.increase(w3random.interval(30*24*60*60, 89*24*60*60));
        let repayLAmount = w3random.intervalBN(debtLAmount.div(new BN(10)), debtLAmount.div(new BN(2)));
        await lToken.approve(funds.address, repayLAmount, {from: borrower});
        await loanm.repay(debtIdx, repayLAmount, {from: borrower});


        //Withdraw pledge
        let pledgeInfo = await loanm.calculatePledgeInfo(borrower, debtIdx, otherAccounts[0]);
        let expectedPWithdraw = pledgeInfo[1].add(pledgeInfo[2]).sub(pledgeInfo[3]);
        let receipt = await loanm.withdrawUnlockedPledge(borrower, debtIdx, {from: otherAccounts[0]});
        expectEvent(receipt, 'UnlockedPledgeWithdraw', {'sender':otherAccounts[0], 'borrower':borrower, 'debt':String(debtIdx), 'pAmount':expectedPWithdraw});

        // Full repayment
        await time.increase(w3random.interval(30*24*60*60, 89*24*60*60));
        let requiredPayments = await loanm.getDebtRequiredPayments(borrower, debtIdx);
        repayLAmount = requiredPayments[0].add(requiredPayments[1]).add(requiredPayments[0].div(new BN(1000)));
        await lToken.approve(funds.address, repayLAmount, {from: borrower});
        await loanm.repay(debtIdx, repayLAmount, {from: borrower});

        //Withdraw pledge
        pledgeInfo = await loanm.calculatePledgeInfo(borrower, debtIdx, otherAccounts[0]);
        expectedPWithdraw = pledgeInfo[1].add(pledgeInfo[2]).sub(pledgeInfo[3]);
        receipt = await loanm.withdrawUnlockedPledge(borrower, debtIdx, {from: otherAccounts[0]});
        expectEvent(receipt, 'UnlockedPledgeWithdraw', {'sender':otherAccounts[0], 'borrower':borrower, 'debt':String(debtIdx), 'pAmount':expectedPWithdraw});
    });
    it('should not allow repay after default date', async () => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));

        let debtLAmount = w3random.interval(100, 200, 'ether');
        let debtIdx = await createDebt(debtLAmount, otherAccounts[0]);
        let borrowerLBalance = await lToken.balanceOf(borrower);
        expect(borrowerLBalance).to.be.bignumber.gte(debtLAmount);
        await lToken.transfer(borrower, debtLAmount.div(new BN(10)), {from: liquidityProvider});    //Transfer 10% of debtLAmount for paying interest

        await time.increase(90*24*60*60+1);

        await expectRevert(
            loanm.repay(debtIdx, debtLAmount, {from:borrower}),
            'LoanModule: debt is already defaulted'
        );
    });
    it('should allow supporter to take part of the pledge after default date', async () => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));

        let debtLAmount = w3random.interval(100, 200, 'ether');
        let debtIdx = await createDebt(debtLAmount, otherAccounts[0]);
        let borrowerLBalance = await lToken.balanceOf(borrower);
        expect(borrowerLBalance).to.be.bignumber.gte(debtLAmount);
        await lToken.transfer(borrower, debtLAmount.div(new BN(10)), {from: liquidityProvider});    //Transfer 10% of debtLAmount for paying interest

        // Partial repayment
        await time.increase(w3random.interval(30*24*60*60, 89*24*60*60));
        let repayLAmount = w3random.intervalBN(debtLAmount.div(new BN(10)), debtLAmount.div(new BN(2)));
        await lToken.approve(funds.address, repayLAmount, {from: borrower});
        await loanm.repay(debtIdx, repayLAmount, {from: borrower});
        let pledgeInfoBeforeDefault = await loanm.calculatePledgeInfo(borrower, debtIdx, otherAccounts[0]);
        //console.log('before default', pledgeInfoBeforeDefault);
        let dbtBeforeDefault = await loanm.debts(borrower, debtIdx);
        // console.log('dbtBeforeDefault.pInterest', (<any>dbtBeforeDefault).pInterest.toString());

        await time.increase(90*24*60*60+1);
        // console.log('before burn', (await pToken.balanceOf(borrower)).toString());
        await (<any>pToken).methods['claimDistributions(address)'](borrower);
        await funds.burnPTokens(borrower, await pToken.balanceOf(borrower), {from:owner}); // Clear borrower balance to prevent repay during default
        // console.log('after burn', (await pToken.balanceOf(borrower)).toString());
        expect(await pToken.balanceOf(borrower)).to.be.bignumber.eq(new BN(0));

        let pPoolBalanceBefore = await pToken.balanceOf(funds.address);
        await loanm.executeDebtDefault(borrower, debtIdx);
        let pPoolBalanceAfter = await pToken.balanceOf(funds.address);
        expect(pPoolBalanceAfter).to.be.bignumber.lt(pPoolBalanceBefore);
        let dbtAfterDefault = await loanm.debts(borrower, debtIdx);
        // console.log('dbtAfterDefault.pInterest', (<any>dbtAfterDefault).pInterest.toString());
        expect((<any>dbtBeforeDefault).pInterest).to.be.bignumber.eq((<any>dbtAfterDefault).pInterest);

        let hasActiveDebts = await loanm.hasActiveDebts(borrower);
        expect(hasActiveDebts).to.be.false;

        let pledgeInfoAfterDefault = await loanm.calculatePledgeInfo(borrower, debtIdx, otherAccounts[0]);
        //console.log('after default', pledgeInfoAfterDefault);
        expect(pledgeInfoAfterDefault[0]).to.be.bignumber.eq(new BN(0));
        expect(pledgeInfoAfterDefault[1]).to.be.bignumber.gt(pledgeInfoBeforeDefault[1]); //TODO: calculate how many PTK added from borrower's pledge
        expect(pledgeInfoAfterDefault[2]).to.be.bignumber.eq(pledgeInfoBeforeDefault[2]);
        expect(pledgeInfoAfterDefault[3]).to.be.bignumber.eq(pledgeInfoBeforeDefault[3]);

        let receipt = await loanm.withdrawUnlockedPledge(borrower, debtIdx, {from: otherAccounts[0]});
        expectEvent(receipt, 'UnlockedPledgeWithdraw', {'pAmount':pledgeInfoAfterDefault[1].add(pledgeInfoAfterDefault[2].sub(pledgeInfoAfterDefault[3]))});
    });
    it('should correctly distribute tokens after default', async() => {
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));

        let debtLAmount = w3random.interval(100, 200, 'ether');
        let debtIdx = await createDebt(debtLAmount, otherAccounts.slice(0,2)); //Create debt with 2 supporters
        let borrowerLBalance = await lToken.balanceOf(borrower);
        expect(borrowerLBalance).to.be.bignumber.gte(debtLAmount);
        await lToken.transfer(borrower, debtLAmount.div(new BN(10)), {from: liquidityProvider});    //Transfer 10% of debtLAmount for paying interest

        // Define initial balances
        // console.log('liquidityProvider', liquidityProvider);
        // console.log('borrower', borrower);
        let initialBalances = new Map<string,BN>();
        initialBalances.set(liquidityProvider, await pToken.balanceOf(liquidityProvider));
        initialBalances.set(borrower, await pToken.balanceOf(borrower));
        for(let i=0; i<5; i++){
            await pToken.mint(otherAccounts[i], w3random.interval(0, 100, 'ether'), {from: owner});
            initialBalances.set(otherAccounts[i], await pToken.balanceOf(otherAccounts[i]));
            // console.log('otherAccounts', i, otherAccounts[i]);
        }
        let distributionSupplyExpected = Array.from(initialBalances.values()).reduce((accum:BN, val:BN) => accum.add(val));
        let distributionSupply = (await pToken.totalSupply()).sub(await funds.pBalanceOf(funds.address));
        expectEqualBN(distributionSupply, distributionSupplyExpected);

        // Partial repayment
        await time.increase(w3random.interval(30*24*60*60, 60*24*60*60));
        let blockNum2 = await web3.eth.getBlockNumber();
        let requiredPayment = await loanm.getDebtRequiredPayments(borrower, debtIdx);
        let repayLAmount = w3random.intervalBN(debtLAmount.mul(new BN(2)).div(new BN(3)), debtLAmount.mul(new BN(3)).div(new BN(4)));
        await lToken.approve(funds.address, repayLAmount, {from: borrower});
        let blockNum1 = await web3.eth.getBlockNumber();
        let receipt = await loanm.repay(debtIdx, repayLAmount, {from: borrower});
        let repayEventArgs = findEventArgs(receipt, 'Repay');
        let repayPInterest = repayEventArgs.pInterestPaid;
        // console.log('repay pInterest', repayEventArgs.pInterestPaid.toString());
        // console.log('pToken.distributionSupply', (await pToken.totalSupply()).sub(await funds.pBalanceOf(funds.address)).toString());
        //console.log('before default', borrowerPledgeInfoBeforeDefault);
        let borrowerPledgeInfoBeforeDefault = await loanm.calculatePledgeInfo(borrower, debtIdx, borrower);
        let distrCreatedEvents = await (<any>pToken).getPastEvents('DistributionCreated', {fromBlock:blockNum1});
        expect(distrCreatedEvents.length).to.be.equal(1);
        let distrClaimEvents = await (<any>pToken).getPastEvents('DistributionsClaimed', {fromBlock:blockNum1});
        expect(distrClaimEvents.length).to.be.equal(0);

        //Check debt info
        let lUnpaidDebt = requiredPayment[0].add(requiredPayment[1]).sub(repayLAmount);
        let debt = await loanm.debts(borrower, debtIdx);
        let proposal = await loanpm.debtProposals(borrower, (<any>debt).proposal);
        expectEqualBN((<any>debt).lAmount, lUnpaidDebt, 18, -4);    //Precision is very low here because of interest change between calls
        let lockedPTK = (<any>proposal).pCollected.mul((<any>debt).lAmount).div((<any>proposal).lAmount);
        let borrowerLockedPTK = (<any>borrowerPledgeInfoBeforeDefault).pLocked;
        expect(borrowerLockedPTK).to.be.bignumber.gt(lockedPTK);
        let extraPTK = borrowerLockedPTK.sub(lockedPTK);

        let distributedPTK = repayPInterest.mul(borrowerCollateralToFullCollateralRatio).div(borrowerCollateralToFullCollateralMultiplier);
        //console.log('distributedPTK', distributedPTK.toString(), distrCreatedEvents[0].args.amount.toString());
        expectEqualBN(distributedPTK, distrCreatedEvents[0].args.amount);
        //distributionSupplyExpected = distributionSupplyExpected.add(distributedPTK);
        distributionSupply = (await pToken.totalSupply()).sub(await funds.pBalanceOf(funds.address)).sub(distributedPTK);
        //console.log('distributionSupply', distributionSupply.toString(), distrCreatedEvents[0].args.totalSupply.toString());
        expectEqualBN(distributionSupply, distrCreatedEvents[0].args.totalSupply);
        expectEqualBN(distributionSupply, distributionSupplyExpected);
        const firstDistributedPTK = distributedPTK;
        const firstDistributionSupply = distributionSupply;


        // Withdraw
        let distributed_s0 = (await pToken.balanceOf(otherAccounts[0])).mul(distributedPTK).div(distributionSupply);
        let lockedInLoanBeforeWithdraw = await funds.pBalanceOf(funds.address);
        let ptkTotalSupply = await pToken.totalSupply();
        receipt = await loanm.withdrawUnlockedPledge(borrower, debtIdx, {from: otherAccounts[0]});
        expect(await pToken.totalSupply()).to.be.bignumber.equal(ptkTotalSupply);
        distrClaimEvents = await (<any>pToken).getPastEvents('DistributionsClaimed', {fromBlock:blockNum2});
        expect(distrClaimEvents.length).to.be.equal(1);
        let pClaimed_s0 = distrClaimEvents[0].args.amount;
        expectEqualBN(pClaimed_s0, distributed_s0);
        let lockedInLoanAfterWithdraw = await funds.pBalanceOf(funds.address);
        let pAmountSupporter_0 = await pToken.balanceOf(otherAccounts[0]);
        // after withdraw locked tokens of supporter_0
        let pUnlockedAmount = findEventArgs(receipt, 'UnlockedPledgeWithdraw')['pAmount'];
        const pUnlockedAmountExpected = lockedInLoanBeforeWithdraw.sub(lockedInLoanAfterWithdraw);
        expectEqualBN(pUnlockedAmount, pUnlockedAmountExpected);
        expectEqualBN(
            pUnlockedAmount,
            pAmountSupporter_0.sub(<BN>initialBalances.get(otherAccounts[0])).sub(distributed_s0)
        );
        distributionSupplyExpected = distributionSupplyExpected.add(distributedPTK).add(pUnlockedAmount);     
        distributionSupply = (await pToken.totalSupply()).sub(await funds.pBalanceOf(funds.address));
        expectEqualBN(distributionSupply, distributionSupplyExpected);


        // Default
        await time.increase(90*24*60*60+1);
        await (<any>pToken).methods['claimDistributions(address)'](borrower);
        let pBorrower = await pToken.balanceOf(borrower);
        await funds.burnPTokens(borrower, pBorrower, {from:owner}); // Clear borrower balance to prevent repay during default
        let blockNum = await web3.eth.getBlockNumber();
        receipt = await loanm.executeDebtDefault(borrower, debtIdx, {from: owner});
        let distrCreatedEvent = await (<any>pToken).getPastEvents('DistributionCreated', {fromBlock:blockNum});
        let distrAmount = distrCreatedEvent[0].args.amount;

        //console.log(distrCreatedEvent);
        expectEqualBN(distrAmount, extraPTK);
        expectEqualBN(distrCreatedEvent[0].args.totalSupply, distributionSupply.sub(pBorrower));


        // Check balances
        for(let [addr, pAmountInitial] of initialBalances) {
            await (<any>pToken).methods['claimDistributions(address)'](addr);
            let pAmountCurrent = await pToken.balanceOf(addr);
            let pBalanceExpected:BN;
            if(addr == otherAccounts[0]){
                pBalanceExpected = pAmountSupporter_0
                .add(pAmountSupporter_0.mul(distrAmount).div(distributionSupply));
            }else{
                let pBalance1 = pAmountInitial.add(pAmountInitial.mul(firstDistributedPTK).div(firstDistributionSupply));
                pBalanceExpected = pBalance1.add(pBalance1.mul(distrAmount).div(distributionSupply));
            }
            let pBalance = await pToken.balanceOf(addr);
            if(addr != borrower){
                expectEqualBN(pBalance, pBalanceExpected, 18, -5);
            }else{
                expect(pBalance).to.be.bignumber.eq(new BN(0));
            }
        };
       
    });

    it('should repay ptk from borrower\'s balance during debt default', async() =>{
        await prepareLiquidity(w3random.interval(1000, 100000, 'ether'));

        // Create debt
        let debtLAmount = w3random.interval(100, 200, 'ether');
        let debtIdx = await createDebt(debtLAmount, otherAccounts[0]);

        // Prepare borrower for repay
        await time.increase(90*24*60*60+1);
        await prepareBorrower(await funds.calculatePoolEnter(w3random.interval(10, 20, 'ether')));
        let pBorrowerBeforeDefault = await pToken.balanceOf(borrower);
        //console.log('pBorrowerBeforeDefault', pBorrowerBeforeDefault.toString());
        let requiredPayments = await loanm.getDebtRequiredPayments(borrower, debtIdx);
        //console.log('requiredPayments', requiredPayments[0].toString(), requiredPayments[1].toString());
        //Execute debt default
        let supporterPledgeInfoBeforeDefault = await loanm.calculatePledgeInfo(borrower, debtIdx, otherAccounts[0]);
        let blockNum = await web3.eth.getBlockNumber();
        await loanm.executeDebtDefault(borrower, debtIdx, {from: owner});
        let pBorrowerAfterDefault = await pToken.balanceOf(borrower);
        let supporterPledgeInfoAfterDefault = await loanm.calculatePledgeInfo(borrower, debtIdx, otherAccounts[0]);
        //console.log('pBorrowerAfterDefault', pBorrowerAfterDefault.toString());

        let withdrawEvents = await (<any>liqm).getPastEvents('Withdraw', {fromBlock:blockNum});
        // withdrawEvents.forEach((evt:any)=>{console.log(
        //     `${evt.event}`, 
        //     `lAmountTotal = ${evt.args.lAmountTotal.toString()}`,
        //     `lAmountUser = ${evt.args.lAmountTotal.toString()}`,
        //     `pAmount = ${evt.args.pAmount.toString()}`
        // )});
        let repayEvents = await (<any>loanm).getPastEvents('Repay', {fromBlock:blockNum});
        // repayEvents.forEach((evt:any)=>{
        //     console.log(
        //     `${evt.event}`, 
        //     `lDebtLeft = ${evt.args.lDebtLeft.toString()}`,
        //     `lFullPaymentAmount = ${evt.args.lFullPaymentAmount.toString()}`,
        //     `lInterestPaid = ${evt.args.lInterestPaid.toString()}`,
        //     `pInterestPaid = ${evt.args.pInterestPaid.toString()}`,
        //     )
        // });
        expectEqualBN(repayEvents[0].args.lInterestPaid, requiredPayments[1], 18, -6);
        expect(pBorrowerAfterDefault).to.be.bignumber.eq(new BN(0));
    });

    it('should take interest during withdraw', async () => {
        await prepareLiquidity(w3random.interval(1000, 90000, 'ether'));

        // Create debt
        let debtLAmount = w3random.interval(100, 200, 'ether');
        let debtIdx = await createDebt(debtLAmount, otherAccounts[0]);

        // Deposit
        let lDepositWei = w3random.interval(300, 1000, 'ether');
        await lToken.transfer(borrower, lDepositWei, {from: liquidityProvider});
        await lToken.approve(funds.address, lDepositWei, {from: borrower});
        await liqm.deposit(lDepositWei, '0', {from: borrower});
        let pBalanceBefore = await pToken.balanceOf(borrower);

        // Withdraw
        await time.increase(30*24*60*60);
        let blockNum = await web3.eth.getBlockNumber();
        let lInterestInfo = await loanm.getUnpaidInterest(borrower);
        let lInterest = lInterestInfo[0];
        let lInterestFee = await curve.calculateExitFee(lInterest);
        //let lWithdrawWeiTotal = w3random.interval(100, 200, 'ether')
        //let pWithdrawWeiTotal = await funds.calculatePoolExit(lWithdrawWeiTotal);
        let lWithdrawWeiUser = w3random.interval(100, 200, 'ether')
        let lWithdrawWeiTotal = lWithdrawWeiUser.add(await curve.calculateExitFee(lWithdrawWeiUser));
        let pWithdrawWeiTotal = await (<any>funds).methods['calculatePoolExitWithFee(uint256,uint256)'](lWithdrawWeiUser, lInterestFee);
        // let lWithdrawWeiCalculated = await funds.calculatePoolExitInverse(pWithdrawWeiTotal);
        // console.log('lWithdrawWeiTotal', lWithdrawWeiTotal.toString(), lWithdrawWeiCalculated[0].toString());
        // console.log('lWithdrawWeiUser', lWithdrawWeiUser.toString(), lWithdrawWeiCalculated[1].toString());
        let pInterest = await (<any>funds).methods['calculatePoolExitWithFee(uint256)'](lInterest);
        let receipt = await liqm.withdraw(pWithdrawWeiTotal, '0', {from: borrower});
        let repayEvent = await (<any>loanm).getPastEvents('Repay', {fromBlock:blockNum});
        //lInterest = lInterest.add(lInterestInfo[1].mul(new BN(receipt.receipt.blockNumber - blockNum)));
        expectEqualBN(repayEvent[0].args.lInterestPaid, lInterest, 18, -6); //Inacurracy because time passes during calculations
        //expectEvent(receipt, 'Withdraw', {'sender':borrower, 'lAmountTotal':lWithdrawWei}); //this only reads first of two events
        let withrawEvents = receipt.logs.filter(evt => evt.event == 'Withdraw');
        expectEqualBN(withrawEvents[0].args.pAmount, pInterest, 18, -6);
        expectEqualBN(withrawEvents[0].args.lAmountUser, lInterest, 18, -6);
        expectEqualBN(withrawEvents[0].args.lAmountTotal, lInterest.add(lInterestFee), 18, -6);
        expectEqualBN(withrawEvents[1].args.pAmount, pWithdrawWeiTotal);
        expectEqualBN(withrawEvents[1].args.lAmountUser, lWithdrawWeiUser, 18, -6);
        expectEqualBN(withrawEvents[1].args.lAmountTotal, lWithdrawWeiTotal, 18, -6);

        let claimEvents = await (<any>pToken).getPastEvents('DistributionsClaimed', {fromBlock:blockNum});

        let pBalanceAfter = await pToken.balanceOf(borrower);
        //expect(pBalanceAfter)).to.be.bignumber.eq(pBalanceBefore.sub(pInterest).sub(pWithdrawWeiTotal));
        expectEqualBN(pBalanceAfter, pBalanceBefore.sub(withrawEvents[0].args.pAmount).sub(withrawEvents[1].args.pAmount).add(claimEvents[0].args.amount));
    });

    // it('should correctly calculate totalLDebts()', async () => {
    // });

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

    async function createDebt(debtLAmount:BN, supporter:string|Array<string>){
        //Prepare Borrower account
        let lfullCollateral = debtLAmount.mul(collateralToDebtRatio).div(collateralToDebtMultiplier);
        let lBorrowerCollateral = lfullCollateral.mul(borrowerCollateralToFullCollateralRatio).div(borrowerCollateralToFullCollateralMultiplier);
        let pAmountMaxWei = (await funds.calculatePoolExit(lBorrowerCollateral))
        await prepareBorrower(pAmountMaxWei);

        //Create Debt Proposal
        let receipt = await loanpm.createDebtProposal(debtLAmount, '100', pAmountMaxWei, web3.utils.sha3('test'), {from: borrower}); //50 means 5 percent
        let proposalIdx = findEventArgs(receipt, 'DebtProposalCreated')['proposal'].toString();

        //Add supporters
        if(supporter instanceof Array){
            let lPledgeTotal = await loanpm.getRequiredPledge(borrower, proposalIdx);
            for(let i=0; i < supporter.length; i++){
                let lPledge = lPledgeTotal.div(new BN(supporter.length)).add(new BN(1)); // Add 1 to handle rounding
                let pPledge = await funds.calculatePoolExit(lPledge);
                await prepareSupporter(pPledge, supporter[i]);
                await loanpm.addPledge(borrower, proposalIdx, pPledge, lPledge.sub(new BN(1)), {from: supporter[i]});
            }
        }else{
            // supporter is one address
            let lPledge = await loanpm.getRequiredPledge(borrower, proposalIdx);
            let pPledge = await funds.calculatePoolExit(lPledge);
            await prepareSupporter(pPledge, supporter);
            await loanpm.addPledge(borrower, proposalIdx, pPledge, '0',{from: supporter});
        }

        receipt = await loanpm.executeDebtProposal(proposalIdx, {from: borrower});
        let debtIdx = findEventArgs(receipt, 'DebtProposalExecuted')['debt'];
        return debtIdx;
    }
});
