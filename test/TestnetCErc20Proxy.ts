import { 
    FreeDAIContract, FreeDAIInstance,
    CErc20StubContract, CErc20StubInstance,
    TestnetCErc20ProxyContract, TestnetCErc20ProxyInstance,
    CompoundDAIStubContract, CompoundDAIStubInstance,
    PoolContract, PoolInstance, 
    PTokenContract, PTokenInstance, 
    FundsModuleStubContract, FundsModuleStubInstance,
    CompoundModuleContract, CompoundModuleInstance,
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
const TestnetCErc20Proxy = artifacts.require("TestnetCErc20Proxy");
const CompoundDAIStub = artifacts.require("CompoundDAIStub");
const Pool = artifacts.require("Pool");
const PToken = artifacts.require("PToken");
const CompoundModule = artifacts.require("CompoundModule");
const FundsModuleStub = artifacts.require("FundsModuleStub");

contract("TestnetCErc20Proxy", async ([_, owner, user, ...otherAccounts]) => {
    let dai: CompoundDAIStubInstance;
    let fdai: FreeDAIInstance;
    let cDai: CErc20StubInstance;
    let cDaiProxy: TestnetCErc20ProxyInstance;
    let pool: PoolInstance;
    let pToken: PTokenInstance;
    let defim: CompoundModuleInstance;
    let funds: FundsModuleStubInstance;
  
    let interesRate:BN, expScale:BN, annualSeconds:BN;

    before(async () => {
        //Setup "external" contracts
        dai = await CompoundDAIStub.new();
        await (<any> dai).methods['initialize()']({from: owner});

        fdai = await FreeDAI.new();
        await (<any> fdai).methods['initialize()']({from: owner});

        cDai = await CErc20Stub.new();
        await (<any> cDai).methods['initialize(address)'](dai.address, {from: owner});

        cDaiProxy = await TestnetCErc20Proxy.new();
        await (<any> cDaiProxy).methods['initialize(address,address,address)'](fdai.address, dai.address, cDai.address, {from: owner});

        //Setup system contracts
        pool = await Pool.new();
        await (<any> pool).methods['initialize()']({from: owner});

        pToken = await PToken.new();
        await (<any> pToken).methods['initialize(address)'](pool.address, {from: owner});

        funds = await FundsModuleStub.new();
        await (<any> funds).methods['initialize(address)'](pool.address, {from: owner});

        defim = await CompoundModule.new();
        await (<any> defim).methods['initialize(address)'](pool.address, {from: owner});

        await pool.set('ltoken', fdai.address, false, {from: owner});
        await pool.set('cdai', cDaiProxy.address, false, {from: owner});
        await pool.set('ptoken', pToken.address, false, {from: owner});
        await pool.set('funds', funds.address, false, {from: owner});
        await pool.set('defi', defim.address, false, {from: owner});
        await pToken.addMinter(funds.address, {from: owner});
        await defim.addDefiOperator(funds.address, {from: owner});

        interesRate = await cDai.INTEREST_RATE();
        expScale = await cDai.EXP_SCALE();
        annualSeconds = await cDai.ANNUAL_SECONDS();
    });

    it("should deposit DAI to Compound", async () => {
        let amount = w3random.interval(100, 1000, 'ether');
        await (<any> fdai).methods['mint(uint256)'](amount, {from: user});

        let before = {
            userDai: await fdai.balanceOf(user),
            cDaiDai: await fdai.balanceOf(cDaiProxy.address),
            defimCDai: await cDaiProxy.balanceOf(defim.address),
            cDaiUnderlying: await cDaiProxy.getBalanceOfUnderlying(defim.address),
        };

        await fdai.transfer(defim.address, amount, {from: user});
        let receipt = await defim.handleDeposit(user, amount, {from: owner});
        expectEvent(receipt, 'Deposit', {'amount':amount});

        await cDaiProxy.accrueInterest();
        let after = {
            userDai: await fdai.balanceOf(user),
            cDaiDai: await fdai.balanceOf(cDaiProxy.address),
            defimCDai: await cDaiProxy.balanceOf(defim.address),
            cDaiUnderlying: await cDaiProxy.getBalanceOfUnderlying(defim.address),
        };

        expect(after.userDai).to.be.bignumber.eq(before.userDai.sub(amount));
        expect(after.cDaiDai).to.be.bignumber.eq(before.cDaiDai.add(amount));
        expect(after.defimCDai).to.be.bignumber.gt(before.defimCDai);
        expectEqualBN(after.cDaiUnderlying, before.cDaiUnderlying.add(amount), 18, -5); //Accuracy may be bad because of rounding and time passed

    });

    it("should withdraw DAI from Compound", async () => {
        let before = {
            userDai: await fdai.balanceOf(user),
            cDaiDai: await fdai.balanceOf(cDaiProxy.address),
            defimCDai: await cDaiProxy.balanceOf(defim.address),
            cDaiUnderlying: await cDaiProxy.getBalanceOfUnderlying(defim.address),
        };
        let amount = w3random.intervalBN(before.cDaiDai.divn(3), before.cDaiDai.divn(2));

        let receipt = await defim.withdraw(user, amount, {from: owner});
        expectEvent(receipt, 'Withdraw', {'amount':amount});

        await cDaiProxy.accrueInterest();
        let after = {
            userDai: await fdai.balanceOf(user),
            cDaiDai: await fdai.balanceOf(cDaiProxy.address),
            defimCDai: await cDaiProxy.balanceOf(defim.address),
            cDaiUnderlying: await cDaiProxy.getBalanceOfUnderlying(defim.address),
        };

        expect(after.userDai).to.be.bignumber.eq(before.userDai.add(amount));
        expect(after.cDaiDai).to.be.bignumber.eq(before.cDaiDai.sub(amount));
        expect(after.defimCDai).to.be.bignumber.lt(before.defimCDai);
        expectEqualBN(after.cDaiUnderlying, before.cDaiUnderlying.sub(amount), 18, -5); //Accuracy may be bad because of rounding and time passed
    });

    it("should withdraw correct interest from Compound", async () => {
        let beforeTimeShift = {
            userDai: await fdai.balanceOf(user),
            defimCDai: await cDaiProxy.balanceOf(defim.address),
            cDaiUnderlying: await cDaiProxy.getBalanceOfUnderlying(defim.address),
        };
        expect(beforeTimeShift.cDaiUnderlying).to.be.bignumber.gt(new BN(0)); // Ensure we have some DAI on pool balance

        //Mint PTK
        let ptkForOwner = w3random.interval(100, 500, 'ether');
        let ptkForUser = w3random.interval(10, 50, 'ether');
        await funds.mintPTokens(owner, ptkForOwner, {from: owner});
        await funds.mintPTokens(user, ptkForUser, {from: owner});
        //console.log(ptkForUser, ptkForOwner);

        let timeShift = w3random.interval(30*24*60*60, 89*24*60*60)
        await time.increase(timeShift);

        await cDaiProxy.accrueInterest();
        let beforeWithdrawInterest = {
            userDai: await fdai.balanceOf(user),
            defimCDai: await cDaiProxy.balanceOf(defim.address),
            cDaiUnderlying: await cDaiProxy.getBalanceOfUnderlying(defim.address),
        };
        //console.log(beforeTimeShift.cDaiUnderlying, interesRate, timeShift, expScale, annualSeconds);
        let expectedFullInterest = beforeTimeShift.cDaiUnderlying.mul(interesRate).mul(timeShift).div(expScale).div(annualSeconds);
        expectEqualBN(beforeWithdrawInterest.cDaiUnderlying, beforeTimeShift.cDaiUnderlying.add(expectedFullInterest), 18, -5);

        // await defim.claimDistributions(user, {from:user}); //This is not required, but useful to test errors

        // let receipt = await defim.withdrawInterest({from: user});
        // expectEvent(receipt, 'WithdrawInterest', {'account':user});

        // await cDaiProxy.accrueInterest();
        // let afterWithdrawInterest = {
        //     userDai: await fdai.balanceOf(user),
        //     defimCDai: await cDaiProxy.balanceOf(defim.address),
        //     cDaiUnderlying: await cDaiProxy.getBalanceOfUnderlying(defim.address),
        // };
        // let expectedUserInterest = expectedFullInterest.mul(ptkForUser).div(ptkForOwner.add(ptkForUser));
        // expectEqualBN(afterWithdrawInterest.userDai, beforeWithdrawInterest.userDai.add(expectedUserInterest), 18, -5);

    });

});
