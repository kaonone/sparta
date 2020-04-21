import {
    PoolContract, PoolInstance, 
    FundsModuleContract, FundsModuleInstance, 
    AccessModuleContract, AccessModuleInstance,
    LiquidityModuleContract, LiquidityModuleInstance,
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
const AccessModule = artifacts.require("AccessModule");
const LiquidityModule = artifacts.require("LiquidityModule");
const LoanModuleStub = artifacts.require("LoanModuleStub");
const CurveModule = artifacts.require("CurveModule");

const PToken = artifacts.require("PToken");
const FreeDAI = artifacts.require("FreeDAI");

contract("LiquidityModule", async ([_, owner, liquidityProvider, borrower, ...otherAccounts]) => {
    let pool: PoolInstance;
    let funds: FundsModuleInstance; 
    let access: AccessModuleInstance;
    let liqm: LiquidityModuleInstance; 
    let loanms: LoanModuleStubInstance; 
    let loanmps: LoanModuleStubInstance; 
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

        access = await AccessModule.new();
        await (<any> access).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("access", access.address, true, {from: owner});  
        access.disableWhitelist({from: owner});

        curve = await CurveModule.new();
        await (<any> curve).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("curve", curve.address, true, {from: owner});  

        liqm = await LiquidityModule.new();
        await (<any> liqm).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("liquidity", liqm.address, true, {from: owner});  

        loanms = await LoanModuleStub.new();
        await (<any> loanms).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("loan", loanms.address, true, {from: owner});  
        loanmps = await LoanModuleStub.new();
        await (<any> loanmps).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("loan_proposals", loanmps.address, true, {from: owner});  

        funds = await FundsModule.new();
        await (<any> funds).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("funds", funds.address, true, {from: owner});  
        await pToken.addMinter(funds.address, {from: owner});
        await funds.addFundsOperator(liqm.address, {from: owner});

        //Do common tasks
        lToken.mint(liquidityProvider, web3.utils.toWei('1000000'), {from: owner});
        await lToken.approve(funds.address, web3.utils.toWei('1000000'), {from: liquidityProvider});

    })

    it('should allow deposit if no debts', async () => {
        let fundsLWei = await lToken.balanceOf(funds.address);
        let amountWeiLToken = w3random.interval(10, 100000, 'ether');
        let receipt = await liqm.deposit(amountWeiLToken, '0', {from: liquidityProvider});
        let expectedfundsLWei = fundsLWei.add(amountWeiLToken);
        expectEvent(receipt, 'Deposit', {'sender':liquidityProvider, 'lAmount':amountWeiLToken});
        fundsLWei = await lToken.balanceOf(funds.address);
        expectEqualBN(fundsLWei, expectedfundsLWei);
        let lpBalance = await pToken.balanceOf(liquidityProvider);
        expect(lpBalance).to.be.bignumber.gt('0');
    });
    it('should allow withdraw if no debts', async () => {
        let lDepositWei = w3random.interval(2000, 100000, 'ether');
        await liqm.deposit(lDepositWei, '0', {from: liquidityProvider});
        let lBalance = await lToken.balanceOf(liquidityProvider);
        let pBalance = await pToken.balanceOf(liquidityProvider);
        let lBalanceO = await lToken.balanceOf(owner);

        let lWithdrawWei = w3random.intervalBN(web3.utils.toWei('1', 'ether'), web3.utils.toWei('999', 'ether'));
        let pWithdrawWei = await funds.calculatePoolExit(lWithdrawWei);
        await pToken.approve(funds.address, pWithdrawWei, {from: liquidityProvider});
        // console.log('lToken balance', lBalance.toString());
        // console.log('pToken balance', pBalance.toString());
        // console.log('lWithdrawWei', withdrawWei.toString());
        let receipt = await liqm.withdraw(pWithdrawWei, '0', {from: liquidityProvider});
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

    it('should correctly work with rounding', async() => {
        let lAmountWei = web3.utils.toWei('1000');
        //console.log('lAmountWei', lAmountWei.toString());
        let receipt = await liqm.deposit(lAmountWei, '0', {from: liquidityProvider});
        //console.log(receipt);
        lAmountWei = web3.utils.toWei('105.263157894736842106');
        let pAmountWei = await funds.calculatePoolExit(lAmountWei);
        //console.log('pAmountWei', pAmountWei.toString(), pAmountWei);
        receipt = await liqm.withdraw(pAmountWei, '0', {from: liquidityProvider});
        //console.log(receipt);
        let lBalanceWei = await funds.lBalance();
        //console.log('lBalanceWei', lBalanceWei.toString());
        pAmountWei = await pToken.balanceOf(liquidityProvider);
        //console.log('pAmountWei', pAmountWei.toString());
        let result = await curve.calculateExitInverse(lBalanceWei, pAmountWei);
        //console.log('result', result.toString());
    });

    it('should allow withdraw all minted PTK', async () => {
        let amountWeiLToken = w3random.interval(10, 100000, 'ether');
        await liqm.deposit(amountWeiLToken, '0', {from: liquidityProvider});

        let allPTokens = await pToken.totalSupply();
        let allLPPtokens = await pToken.balanceOf(liquidityProvider);
        expect(allLPPtokens).to.be.bignumber.eq(allPTokens);
        //console.log('allPTokens', allPTokens.toString(), web3.utils.fromWei(allPTokens));
        let poolLTokens = await lToken.balanceOf(funds.address);
        //console.log('poolLTokens', poolLTokens.toString(), web3.utils.fromWei(poolLTokens));
        let ptkForFullExit = await funds.calculatePoolExit(poolLTokens);
        //console.log('ptkForFullExit', ptkForFullExit.toString(), web3.utils.fromWei(ptkForFullExit));
        expectEqualBN(ptkForFullExit, allPTokens); // Check calculatePoolExit() calculates correct value

        let expectedLTokens = await funds.calculatePoolExitInverse(allPTokens);
        //console.log('expectedLTokens_Total', expectedLTokens[0].toString(), web3.utils.fromWei(expectedLTokens[0]));
        expectEqualBN(expectedLTokens[0], poolLTokens); // It will never be 100% equal because of PTK rounding down on enter
        //console.log('expectedLTokens_User', expectedLTokens[1].toString(), web3.utils.fromWei(expectedLTokens[1]));
        //console.log('expectedLTokens_Pool', expectedLTokens[2].toString(), web3.utils.fromWei(expectedLTokens[2]));
        expect(expectedLTokens[1].add(expectedLTokens[2])).to.be.bignumber.eq(expectedLTokens[0]);
    
        await pToken.approve(funds.address, allPTokens, {from: liquidityProvider});
        let receipt = await liqm.withdraw(allPTokens, expectedLTokens[1], {from: liquidityProvider});
        expectEvent(receipt, 'Withdraw', {'sender':liquidityProvider, 'lAmountTotal':expectedLTokens[0]});
    });

    it('should allow deposit if there are debts', async () => {
        let amountWeiLToken = w3random.interval(10, 100000, 'ether');
        await loanms.executeDebtProposal(0, {from: liquidityProvider}); //Set hasDebts for msg.sender
        // await expectRevert(
        //     liqm.deposit(amountWeiLToken, '0', {from: liquidityProvider}),
        //     'LiquidityModule: Deposits forbidden if address has active debts'
        // );
        let receipt = await liqm.deposit(amountWeiLToken, '0', {from: liquidityProvider});
        expectEvent(receipt, 'Deposit', {'sender':liquidityProvider});
    });
    it('should allow withdraw if there are debts', async () => {
        await loanms.repay(0, 0, {from: liquidityProvider}); //Unset hasDebts for msg.sender, it may be set by previous tests
        let lDepositWei = w3random.interval(2000, 100000, 'ether');
        await liqm.deposit(lDepositWei, '0', {from: liquidityProvider});
        let pBalance = await pToken.balanceOf(liquidityProvider);
        await loanms.executeDebtProposal(0, {from: liquidityProvider}); //Set hasDebts for msg.sender

        let lWithdrawWei = w3random.intervalBN(web3.utils.toWei('1', 'ether'), web3.utils.toWei('999', 'ether'));
        let pWithdrawWei = await funds.calculatePoolExit(lWithdrawWei);
        await pToken.approve(funds.address, pWithdrawWei, {from: liquidityProvider});
        // await expectRevert(
        //     liqm.withdraw(pWithdrawWei, '0', {from: liquidityProvider}),
        //     'LiquidityModule: Withdraws forbidden if address has active debts'
        // );
        let receipt = await liqm.withdraw(pWithdrawWei, '0', {from: liquidityProvider});
        expectEvent(receipt, 'Withdraw', {'sender':liquidityProvider});
    });
});
