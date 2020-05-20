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
    ExchangeStubContract, ExchangeStubInstance,
    CompoundDAIStubContract, CompoundDAIStubInstance
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
const CompoundDAIStub = artifacts.require("CompoundDAIStub");

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

    let cmpDai: CompoundDAIStubInstance;
    let exFreeToCmpd:ExchangeStubInstance, exCmpdToFree:ExchangeStubInstance; 

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

        //Create exchanges
        cmpDai = await CompoundDAIStub.new();
        exFreeToCmpd = await ExchangeStub.new(dai.address, cmpDai.address, 'allocateTo(address,uint256)');
        exCmpdToFree = await ExchangeStub.new(cmpDai.address, dai.address, 'mint(address,uint256)');
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
        let before = {
            executor: await arbm.executors(user),
        };
        expect(before.executor).to.be.not.eq("0x0000000000000000000000000000000000000000");
        await expectRevert(
            arbm.createExecutor({from:user}),
            "ArbitrageModule: executor already created"
        );
    });

    it("should approve tokens to exchanges", async () => {
        let executor = await ArbitrageExecutor.at(await arbm.executors(user));

        let tokens = [dai.address, cmpDai.address];
        let exchanges = [exFreeToCmpd.address, exCmpdToFree.address];
        await executor.approve(tokens, exchanges, {from:user});

        for(let i=0; i < tokens.length; i++) {
            for(let j=0; j < tokens.length; j++) {
                let allowance = await (await FreeDAI.at(tokens[i])).allowance(executor.address, exchanges[j]);
                expect(allowance).to.be.bignumber.gt(new BN(0));
            }
        }
    });
    it("should execute arbitrage order", async () => {
        let fdaiAmount = w3random.interval(100, 200, 'ether');
        let cdaiAmountMin = fdaiAmount.add(fdaiAmount.muln(3).divn(100)); // +3%
        let cdaiAmountActual = cdaiAmountMin.add(w3random.intervalBN(new BN(1), new BN(1000000))); //min = 1 to have leftover
        let fdaiAmountFinal = cdaiAmountMin.sub(cdaiAmountMin.muln(2).divn(100)); // -2%

        let exFreeToCmpdMessage = web3.eth.abi.encodeFunctionCall(
            {name:"exchange", inputs:[{type:"uint256", name:"amount1"}, {type:"uint256", name:"amount2"}]},
            [fdaiAmount.toString(), cdaiAmountActual.toString()]
        );
        let exCmpdToFreeMessage = web3.eth.abi.encodeFunctionCall(
            {name:"exchange", inputs:[{type:"uint256", name:"amount1"}, {type:"uint256", name:"amount2"}]},
            [cdaiAmountMin.toString(), fdaiAmountFinal.toString()]
        );
        let flashLoanMessage = web3.eth.abi.encodeParameters(
            ["address", "bytes", "address", "bytes"],
            [exFreeToCmpd.address, exFreeToCmpdMessage, exCmpdToFree.address, exCmpdToFreeMessage]
        );

        let executorAddress = await arbm.executors(user);
        expect(executorAddress).to.be.not.eq("0x0000000000000000000000000000000000000000");

        let before = {
            userFDAI: await dai.balanceOf(user),
            executorFDAI: await dai.balanceOf(executorAddress),
            executorCDAI: await cmpDai.balanceOf(executorAddress),
        };
        expect(before.executorFDAI).to.be.bignumber.eq(new BN(0));
        expect(before.executorCDAI).to.be.bignumber.eq(new BN(0));

        await flashm.executeLoan(executorAddress, fdaiAmount, flashLoanMessage);

        let after = {
            userFDAI: await dai.balanceOf(user),
            executorFDAI: await dai.balanceOf(executorAddress),
            executorCDAI: await cmpDai.balanceOf(executorAddress),
        };
        let expectedFee = fdaiAmount.mul(loanFee).div(loanFeeMultiplier);
        let expectedUserProfit = fdaiAmountFinal.sub(fdaiAmount).sub(expectedFee);

        expectEqualBN(after.userFDAI, before.userFDAI.add(expectedUserProfit));
        expect(after.executorFDAI).to.be.bignumber.eq(new BN(0));
        expect(after.executorCDAI).to.be.bignumber.gt(new BN(0)); //leftover


    });
    it("should withdraw leftovers", async () => {
        let executor = await ArbitrageExecutor.at(await arbm.executors(user));

        let before = {
            executorCDAI: await cmpDai.balanceOf(executor.address),
        };
        expect(before.executorCDAI).to.be.bignumber.gt(new BN(0));

        let tokens = [dai.address, cmpDai.address];
        await executor.withdrawLeftovers(tokens, {from:user});

        let after = {
            executorCDAI: await cmpDai.balanceOf(executor.address),
        };
        expect(after.executorCDAI).to.be.bignumber.eq(new BN(0));
    });
});
