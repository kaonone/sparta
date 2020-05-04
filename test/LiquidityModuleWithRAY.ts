import {
    FreeDAIContract, FreeDAIInstance,
    RAYStubContract, RAYStubInstance,
    PoolContract, PoolInstance, 
    DefiFundsModuleContract, DefiFundsModuleInstance,
    AccessModuleContract, AccessModuleInstance,
    LiquidityModuleContract, LiquidityModuleInstance,
    LoanModuleStubContract, LoanModuleStubInstance,
    CurveModuleContract, CurveModuleInstance,
    RAYModuleContract, RAYModuleInstance,
    PTokenContract, PTokenInstance
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

const FreeDAI = artifacts.require("FreeDAI");
const RAYStub = artifacts.require("RAYStub");

const Pool = artifacts.require("Pool");
const PToken = artifacts.require("PToken");
const DefiFundsModule = artifacts.require("DefiFundsModule");
const AccessModule = artifacts.require("AccessModule");
const LiquidityModule = artifacts.require("LiquidityModule");
const LoanModuleStub = artifacts.require("LoanModuleStub");
const CurveModule = artifacts.require("CurveModule");
const RAYModule = artifacts.require("RAYModule");

contract("LiquidityModule with RAYModule", async ([_, owner, liquidityProvider, borrower, ...otherAccounts]) => {
    let lToken: FreeDAIInstance;
    let ray: RAYStubInstance;
    let pool: PoolInstance;
    let funds: DefiFundsModuleInstance; 
    let access: AccessModuleInstance;
    let liqm: LiquidityModuleInstance; 
    let loanms: LoanModuleStubInstance; 
    let loanmps: LoanModuleStubInstance; 
    let curve: CurveModuleInstance; 
    let pToken: PTokenInstance;
    let defi: RAYModuleInstance; 

    before(async () => {
        //Setup "external" contracts
        lToken = await FreeDAI.new();
        await (<any> lToken).methods['initialize()']({from: owner});

        ray = await RAYStub.new();
        await (<any> ray).methods['initialize(address)'](lToken.address, {from: owner});

        //Setup system contracts
        pool = await Pool.new();
        await (<any> pool).methods['initialize()']({from: owner});

        pToken = await PToken.new();
        await (<any> pToken).methods['initialize(address)'](pool.address, {from: owner});

        defi = await RAYModule.new();
        await (<any> defi).methods['initialize(address)'](pool.address, {from: owner});

        access = await AccessModule.new();
        await (<any> access).methods['initialize(address)'](pool.address, {from: owner});

        curve = await CurveModule.new();
        await (<any> curve).methods['initialize(address)'](pool.address, {from: owner});

        liqm = await LiquidityModule.new();
        await (<any> liqm).methods['initialize(address)'](pool.address, {from: owner});

        loanms = await LoanModuleStub.new();
        await (<any> loanms).methods['initialize(address)'](pool.address, {from: owner});
        loanmps = await LoanModuleStub.new();
        await (<any> loanmps).methods['initialize(address)'](pool.address, {from: owner});

        funds = await DefiFundsModule.new();
        await (<any> funds).methods['initialize(address)'](pool.address, {from: owner});

        await pool.set("ltoken", lToken.address, true, {from: owner});  
        await pool.set('ray', ray.address, false, {from: owner});
        await pool.set("ptoken", pToken.address, true, {from: owner});  
        await pool.set("defi", defi.address, true, {from: owner});  
        await pool.set("funds", funds.address, true, {from: owner});  
        await pool.set("access", access.address, true, {from: owner});  
        await pool.set("curve", curve.address, true, {from: owner});  
        await pool.set("liquidity", liqm.address, true, {from: owner});  
        await pool.set("loan", loanms.address, true, {from: owner});  
        await pool.set("loan_proposals", loanmps.address, true, {from: owner});  

        await pToken.addMinter(funds.address, {from: owner});
        await funds.addFundsOperator(liqm.address, {from: owner});
        await defi.addDefiOperator(funds.address, {from: owner});

        await defi.setup({from: owner});

        //Do common tasks
        // access.disableWhitelist({from: owner});
        await lToken.mint(liquidityProvider, web3.utils.toWei('1000000'), {from: owner});
        await lToken.approve(funds.address, web3.utils.toWei('1000000'), {from: liquidityProvider});

        //Fix cDAI rounding problem on first deposit
        // let fixAmount = web3.utils.toWei('1', 'ether');
        // await lToken.transfer(defi.address, fixAmount, {from: liquidityProvider});
        // await defi.handleDeposit(liquidityProvider, fixAmount, {from: owner});
        // await time.increase(1*60*60);
    })

    it('should allow deposit if no debts', async () => {
        let fundsLWei = await lToken.balanceOf(ray.address);
        let amountWeiLToken = w3random.interval(10, 100000, 'ether');
        let receipt = await liqm.deposit(amountWeiLToken, '0', {from: liquidityProvider});
        let expectedfundsLWei = fundsLWei.add(amountWeiLToken);
        expectEvent(receipt, 'Deposit', {'sender':liquidityProvider, 'lAmount':amountWeiLToken});
        fundsLWei = await lToken.balanceOf(ray.address);
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

});
