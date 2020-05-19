import { 
    FreeDAIContract, FreeDAIInstance,
    PoolContract, PoolInstance, 
    AccessModuleContract, AccessModuleInstance,
    PTokenContract, PTokenInstance, 
    CurveModuleContract, CurveModuleInstance,
    BaseFundsModuleContract, BaseFundsModuleInstance,
    LiquidityModuleContract, LiquidityModuleInstance,
    DefiModuleStubContract, DefiModuleStubInstance,
    FlashLoansModuleContract, FlashLoansModuleInstance,
    ArbitrageModuleContract, ArbitrageModuleInstance,
    ArbitrageExecutorContract, ArbitrageExecutorInstance,
    ExchangeStubContract, ExchangeStubInstance
} from "../types/truffle-contracts/index";

// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, expectRevert, shouldFail, time } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();
var expect = require("chai").expect;
const w3random = require("./utils/w3random");
const expectEqualBN = require("./utils/expectEqualBN");

const FreeDAI = artifacts.require("FreeDAI");
const CErc20Stub = artifacts.require("CErc20Stub");
const Pool = artifacts.require("Pool");
const AccessModule = artifacts.require("AccessModule");
const PToken = artifacts.require("PToken");
const CurveModule = artifacts.require("CurveModule");
const BaseFundsModule = artifacts.require("BaseFundsModule");
const DefiModuleStub = artifacts.require("DefiModuleStub");
const LiquidityModule = artifacts.require("LiquidityModule");
const FlashLoansModule = artifacts.require("FlashLoansModule");
const ArbitrageModule = artifacts.require("ArbitrageModule");
const ArbitrageExecutor = artifacts.require("ArbitrageExecutor");
const ExchangeStub = artifacts.require("ExchangeStub");

contract("ArbitrageModule", async ([_, owner, user, ...otherAccounts]) => {
    let dai: FreeDAIInstance;
    let pool: PoolInstance;
    let access: AccessModuleInstance;
    let pToken: PTokenInstance;
    let curve: CurveModuleInstance; 
    let funds: BaseFundsModuleInstance;
    let liqm: LiquidityModuleInstance; 
    let defi: DefiModuleStubInstance; 
    let flashm: FlashLoansModuleInstance;
    let arbm: ArbitrageModuleInstance;
 
    let loanFee:BN, loanFeeMultiplier:BN;

    before(async () => {
        //Setup "external" contracts
        dai = await FreeDAI.new();
        await (<any> dai).methods['initialize()']({from: owner});

        //Setup system contracts
        pool = await Pool.new();
        await (<any> pool).methods['initialize()']({from: owner});

        access = await AccessModule.new();
        await (<any> access).methods['initialize(address)'](pool.address, {from: owner});
        access.disableWhitelist({from: owner});

        pToken = await PToken.new();
        await (<any> pToken).methods['initialize(address)'](pool.address, {from: owner});

        curve = await CurveModule.new();
        await (<any> curve).methods['initialize(address)'](pool.address, {from: owner});

        funds = await BaseFundsModule.new();
        await (<any> funds).methods['initialize(address)'](pool.address, {from: owner});

        liqm = await LiquidityModule.new();
        await (<any> liqm).methods['initialize(address)'](pool.address, {from: owner});

        defi = await DefiModuleStub.new();
        await (<any> defi).methods['initialize(address)'](pool.address, {from: owner});

        flashm = await FlashLoansModule.new();
        await (<any> flashm).methods['initialize(address)'](pool.address, {from: owner});

        arbm = await ArbitrageModule.new();
        await (<any> arbm).methods['initialize(address)'](pool.address, {from: owner});

        await pool.set('ltoken', dai.address, false, {from: owner});
        await pool.set("access", access.address, true, {from: owner});  
        await pool.set('ptoken', pToken.address, true, {from: owner});
        await pool.set('funds', funds.address, true, {from: owner});
        await pool.set("curve", curve.address, true, {from: owner});  
        await pool.set("liquidity", liqm.address, true, {from: owner});  
        await pool.set("defi", defi.address, true, {from: owner});  
        await pool.set("flashloans", flashm.address, true, {from: owner});  
        await pool.set("arbitrage", arbm.address, true, {from: owner});  
        await pToken.addMinter(funds.address, {from: owner});
        await funds.addFundsOperator(liqm.address, {from: owner});
        await funds.addFundsOperator(flashm.address, {from: owner});

        //Load info
        loanFee  = await (<any> flashm).methods['getLoanFee()']();
        loanFeeMultiplier = await flashm.LOAN_FEE_MULTIPLIER();

        //Add liquidity
        let amount = w3random.interval(100000, 1000000, 'ether');
        await (<any> dai).methods['mint(uint256)'](amount, {from: owner});
        await dai.approve(funds.address, amount, {from: owner});
        await liqm.deposit(amount, 0, {from: owner});
    });

    it("should not create executor if user has no PTK", async () => {
        let beforeAll = {
            userPTK: await pToken.balanceOf(user),
        };
        expect(beforeAll.userPTK).to.be.bignumber.eq(new BN(0));

        // Test it can not be created witout having PTK
        await expectRevert(
            arbm.createExecutor({from:user}),
            "ArbitrageModule: beneficiary required to own PTK"
        );
    });
    it("should create executor if user has PTK", async () => {
        let amount = w3random.interval(10, 20, 'ether');
        await (<any>dai).methods['mint(uint256)'](amount, {from:user});
        await dai.approve(funds.address, amount, {from:user});
        await liqm.deposit(amount, new BN(0), {from:user});

        let before = {
            userPTK: await pToken.balanceOf(user),
            executor: await arbm.executors(user),
        };

        expect(before.userPTK).to.be.bignumber.gt(new BN(0));
        expect(before.executor).to.be.eq("0x0000000000000000000000000000000000000000");

        await arbm.createExecutor({from:user});

        let after = {
            executor: await arbm.executors(user),
        };
        expect(after.executor).to.be.not.eq("0x0000000000000000000000000000000000000000");
    });
    it("should not create executor if user already has one", async () => {
        await expectRevert(
            arbm.createExecutor({from:user}),
            "ArbitrageModule: executor already created"
        );
    });

});
