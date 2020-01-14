import {
    PoolContract, PoolInstance, 
    FundsModuleContract, FundsModuleInstance, 
    LiquidityModuleContract, LiquidityModuleInstance,
    LoanModuleContract, LoanModuleInstance,
    CurveModuleContract, CurveModuleInstance,
    PTokenContract, PTokenInstance, 
    FreeDAIContract, FreeDAIInstance
} from "../types/truffle-contracts/index";
import Snapshot from "./utils/snapshot";

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

contract("TestSnapshot", async ([_, owner, liquidityProvider, borrower, ...otherAccounts]) => {
    let snap: Snapshot;

    let pool: PoolInstance;
    let funds: FundsModuleInstance; 
    let liqm: LiquidityModuleInstance; 
    let loanm: LoanModuleInstance; 
    let curve: CurveModuleInstance; 
    let pToken: PTokenInstance;
    let lToken: FreeDAIInstance;

    before(async () => {
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
        
        //Save snapshot
        snap = new Snapshot(web3.currentProvider);
        console.log('lastSnapshot', snap.id);
    });

    beforeEach(async () => {
        await snap.revert();
        console.log('be lastSnapshot', snap.id);

        let lb = await lToken.balanceOf(liquidityProvider);
        console.log('be lb', web3.utils.fromWei(lb));
    });

    it('should do smth', async () => {
        lToken.mint(liquidityProvider, web3.utils.toWei('11'), {from: owner});
        let lb = await lToken.balanceOf(liquidityProvider);
        console.log('ds1 lb', web3.utils.fromWei(lb));

    });
    it('should do smth 2', async () => {
        lToken.mint(liquidityProvider, web3.utils.toWei('12'), {from: owner});
        let lb = await lToken.balanceOf(liquidityProvider);
        console.log('ds2 lb', web3.utils.fromWei(lb));
    });

    it('should do smth 3', async () => {
        lToken.mint(liquidityProvider, web3.utils.toWei('13'), {from: owner});
        let lb = await lToken.balanceOf(liquidityProvider);
        console.log('ds3 lb', web3.utils.fromWei(lb));
    });
});