import { 
    FreeDAIContract, FreeDAIInstance,
    CErc20StubContract, CErc20StubInstance,
    PoolContract, PoolInstance, 
    PTokenContract, PTokenInstance, 
    CurveModuleContract, CurveModuleInstance,
    DefiFundsModuleContract, DefiFundsModuleInstance,
    CompoundModuleContract, CompoundModuleInstance,
    LoanModuleStubContract, LoanModuleStubInstance,
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
const PToken = artifacts.require("PToken");
const CurveModule = artifacts.require("CurveModule");
const CompoundModule = artifacts.require("CompoundModule");
const DefiFundsModule = artifacts.require("DefiFundsModule");
const LoanModuleStub = artifacts.require("LoanModuleStub");

contract("DefiFundsModule", async ([_, owner, user, ...otherAccounts]) => {
    let dai: FreeDAIInstance;
    let cDai: CErc20StubInstance;
    let pool: PoolInstance;
    let pToken: PTokenInstance;
    let defim: CompoundModuleInstance;
    let curve: CurveModuleInstance; 
    let funds: DefiFundsModuleInstance;
    let loanm: LoanModuleStubInstance; 
    let loanpm: LoanModuleStubInstance; 
  
    let interesRate:BN, expScale:BN, annualSeconds:BN;

    before(async () => {
        //Setup "external" contracts
        dai = await FreeDAI.new();
        await (<any> dai).methods['initialize()']({from: owner});

        cDai = await CErc20Stub.new();
        await (<any> cDai).methods['initialize(address)'](dai.address, {from: owner});

        //Setup system contracts
        pool = await Pool.new();
        await (<any> pool).methods['initialize()']({from: owner});

        pToken = await PToken.new();
        await (<any> pToken).methods['initialize(address)'](pool.address, {from: owner});

        curve = await CurveModule.new();
        await (<any> curve).methods['initialize(address)'](pool.address, {from: owner});

        defim = await CompoundModule.new();
        await (<any> defim).methods['initialize(address)'](pool.address, {from: owner});

        funds = await DefiFundsModule.new();
        await (<any> funds).methods['initialize(address)'](pool.address, {from: owner});

        loanm = await LoanModuleStub.new();
        await (<any> loanm).methods['initialize(address)'](pool.address, {from: owner});
        loanpm = await LoanModuleStub.new();
        await (<any> loanpm).methods['initialize(address)'](pool.address, {from: owner});

        await pool.set('ltoken', dai.address, false, {from: owner});
        await pool.set('cdai', cDai.address, false, {from: owner});
        await pool.set('ptoken', pToken.address, false, {from: owner});
        await pool.set('defi', defim.address, false, {from: owner});
        await pool.set('funds', funds.address, false, {from: owner});
        await pool.set("curve", curve.address, true, {from: owner});  
        await pool.set("loan", loanm.address, true, {from: owner});  
        await pool.set("loan_proposals", loanpm.address, true, {from: owner});  
        await pToken.addMinter(funds.address, {from: owner});
        await funds.addFundsOperator(defim.address, {from: owner});
        await defim.addDefiOperator(funds.address, {from: owner});

        // Load info
        interesRate = await cDai.INTEREST_RATE();
        expScale = await cDai.EXP_SCALE();
        annualSeconds = await cDai.ANNUAL_SECONDS();
    });

    it("should deposit DAI to Compound", async () => {
        let amount = w3random.interval(100, 1000, 'ether');
        await (<any> dai).methods['mint(uint256)'](amount, {from: user});
        dai.approve(funds.address, amount, {from: user});

        let before = {
            userDai: await dai.balanceOf(user),
            cDaiDai: await dai.balanceOf(cDai.address),
            defimCDai: await cDai.balanceOf(defim.address),
            cDaiUnderlying: await cDai.getBalanceOfUnderlying(defim.address),
        };

        let receipt = await funds.depositLTokens(user, amount, {from: owner});

        let after = {
            userDai: await dai.balanceOf(user),
            cDaiDai: await dai.balanceOf(cDai.address),
            defimCDai: await cDai.balanceOf(defim.address),
            cDaiUnderlying: await cDai.getBalanceOfUnderlying(defim.address),
        };

        expect(after.userDai).to.be.bignumber.eq(before.userDai.sub(amount));
        expect(after.cDaiDai).to.be.bignumber.eq(before.cDaiDai.add(amount));
        expect(after.defimCDai).to.be.bignumber.gt(before.defimCDai);
        expectEqualBN(after.cDaiUnderlying, before.cDaiUnderlying.add(amount), 18, -6); //Accuracy may be bad because of rounding and time passed
    });

    it("should withdraw DAI from Compound", async () => {
        let before = {
            userDai: await dai.balanceOf(user),
            cDaiDai: await dai.balanceOf(cDai.address),
            defimCDai: await cDai.balanceOf(defim.address),
            cDaiUnderlying: await cDai.getBalanceOfUnderlying(defim.address),
        };
        let amount = w3random.intervalBN(before.cDaiDai.divn(3), before.cDaiDai.divn(2));

        let receipt = await funds.withdrawLTokens(user, amount, new BN(0), {from: owner});

        let after = {
            userDai: await dai.balanceOf(user),
            cDaiDai: await dai.balanceOf(cDai.address),
            defimCDai: await cDai.balanceOf(defim.address),
            cDaiUnderlying: await cDai.getBalanceOfUnderlying(defim.address),
        };

        expect(after.userDai).to.be.bignumber.eq(before.userDai.add(amount));
        expect(after.cDaiDai).to.be.bignumber.eq(before.cDaiDai.sub(amount));
        expect(after.defimCDai).to.be.bignumber.lt(before.defimCDai);
        expectEqualBN(after.cDaiUnderlying, before.cDaiUnderlying.sub(amount), 18, -5); //Accuracy may be bad because of rounding and time passed
    });

    it("should withdraw all DAI from Compound", async () => {
        let beforeTimeShift = {
            fundsDai: await dai.balanceOf(funds.address),
            cDaiDai: await dai.balanceOf(cDai.address),
            defimCDai: await cDai.balanceOf(defim.address),
            cDaiUnderlying: await cDai.getBalanceOfUnderlying(defim.address),
        };
        expect(beforeTimeShift.fundsDai).to.be.bignumber.eq(new BN(0));

        let timeShift = w3random.interval(30*24*60*60, 89*24*60*60)
        await time.increase(timeShift);

        let afterTimeShift = {
            fundsDai: await dai.balanceOf(funds.address),
            cDaiDai: await dai.balanceOf(cDai.address),
            defimCDai: await cDai.balanceOf(defim.address),
            cDaiUnderlying: await cDai.getBalanceOfUnderlying(defim.address),
        };
        expect(afterTimeShift.cDaiUnderlying).to.be.bignumber.gt(beforeTimeShift.cDaiUnderlying);

        let receipt = await funds.withdrawAllFromDefi({from: owner});

        let afterWithdraw = {
            fundsDai: await dai.balanceOf(funds.address),
            cDaiDai: await dai.balanceOf(cDai.address),
            defimCDai: await cDai.balanceOf(defim.address),
            cDaiUnderlying: await cDai.getBalanceOfUnderlying(defim.address),
        };
        expectEqualBN(afterWithdraw.fundsDai, afterTimeShift.cDaiUnderlying, 18, -5);
        expectEqualBN(afterWithdraw.cDaiDai, new BN(0));
        expectEqualBN(afterWithdraw.defimCDai, new BN(0));
    });

    it("should deposit all DAI to Compound", async () => {
        let before = {
            fundsDai: await dai.balanceOf(funds.address),
            cDaiDai: await dai.balanceOf(cDai.address),
            defimCDai: await cDai.balanceOf(defim.address),
            cDaiUnderlying: await cDai.getBalanceOfUnderlying(defim.address),
        };
        expect(before.fundsDai).to.be.bignumber.gt(new BN(0));

        let receipt = await funds.depositAllToDefi({from: owner});

        let after = {
            fundsDai: await dai.balanceOf(funds.address),
            cDaiDai: await dai.balanceOf(cDai.address),
            defimCDai: await cDai.balanceOf(defim.address),
            cDaiUnderlying: await cDai.getBalanceOfUnderlying(defim.address),
        };

        expect(after.fundsDai).to.be.bignumber.eq(new BN(0));
        expect(after.cDaiDai).to.be.bignumber.eq(before.cDaiDai.add(before.fundsDai));
        expect(after.defimCDai).to.be.bignumber.gt(before.defimCDai);
    });

    it("should respect minInstantAmount & maxInstantAmount", async () => {
        let userMintAmount = web3.utils.toWei('10000', 'ether')
        await (<any> dai).methods['mint(uint256)'](userMintAmount, {from: user});
        dai.approve(funds.address, userMintAmount, {from: user});

        let minInstantAmount = new BN(web3.utils.toWei('2000', 'ether'));
        let maxInstantAmount = minInstantAmount.add(minInstantAmount.muln(5).divn(100));
        let before = {
            fundsDai: await dai.balanceOf(funds.address),
            cDaiDai: await dai.balanceOf(cDai.address),
            defimCDai: await cDai.balanceOf(defim.address),
            cDaiUnderlying: await cDai.getBalanceOfUnderlying(defim.address),
        };

        // Check initial state
        expect(before.fundsDai).to.be.bignumber.eq(new BN(0));
        expect(before.cDaiDai).to.be.bignumber.lt(minInstantAmount); 

        await funds.setDefiSettings(minInstantAmount, maxInstantAmount, {from:owner});

        let afterRebalance = {
            fundsDai: await dai.balanceOf(funds.address),
            cDaiDai: await dai.balanceOf(cDai.address),
            defimCDai: await cDai.balanceOf(defim.address),
            cDaiUnderlying: await cDai.getBalanceOfUnderlying(defim.address),
        };

        //test after rebalance
        expect(afterRebalance.fundsDai).to.be.bignumber.eq(before.cDaiDai);
        expect(afterRebalance.cDaiDai).to.be.bignumber.eq(new BN(0));

        let verySmallDeposit = new BN(web3.utils.toWei('1', 'ether'));
        expect(afterRebalance.fundsDai.add(verySmallDeposit)).to.be.bignumber.lt(minInstantAmount); 
        
        await funds.depositLTokens(user, verySmallDeposit, {from: owner});

        let afterVerySmallDeposit = {
            fundsDai: await dai.balanceOf(funds.address),
            cDaiDai: await dai.balanceOf(cDai.address),
            defimCDai: await cDai.balanceOf(defim.address),
            cDaiUnderlying: await cDai.getBalanceOfUnderlying(defim.address),
        };
        expect(afterVerySmallDeposit.fundsDai).to.be.bignumber.eq(afterRebalance.fundsDai.add(verySmallDeposit));
        expect(afterVerySmallDeposit.cDaiDai).to.be.bignumber.eq(new BN(0));
       
        let smallDeposit = minInstantAmount.sub(afterVerySmallDeposit.fundsDai).add( maxInstantAmount.sub(minInstantAmount).divn(2) );
        await funds.depositLTokens(user, smallDeposit, {from: owner});

        let afterSmallDeposit = {
            fundsDai: await dai.balanceOf(funds.address),
            cDaiDai: await dai.balanceOf(cDai.address),
            defimCDai: await cDai.balanceOf(defim.address),
            cDaiUnderlying: await cDai.getBalanceOfUnderlying(defim.address),
        };
        expect(afterSmallDeposit.fundsDai).to.be.bignumber.gte(minInstantAmount);
        expect(afterSmallDeposit.fundsDai).to.be.bignumber.lte(maxInstantAmount);
        expect(afterSmallDeposit.cDaiDai).to.be.bignumber.eq(new BN(0));

        let bigDeposit = maxInstantAmount;
        await funds.depositLTokens(user, bigDeposit, {from: owner});

        let afterBigDeposit = {
            fundsDai: await dai.balanceOf(funds.address),
            cDaiDai: await dai.balanceOf(cDai.address),
            defimCDai: await cDai.balanceOf(defim.address),
            cDaiUnderlying: await cDai.getBalanceOfUnderlying(defim.address),
            userDai: await dai.balanceOf(user),
        };
        expect(afterBigDeposit.fundsDai).to.be.bignumber.eq(minInstantAmount);
        expect(afterBigDeposit.cDaiDai).to.be.bignumber.gt(new BN(0));

        let smallWithdraw = minInstantAmount.divn(2);
        await (<any>funds).methods['withdrawLTokens(address,uint256)'](user, smallWithdraw, {from: owner});

        let afterSmallWithdraw = {
            fundsDai: await dai.balanceOf(funds.address),
            cDaiDai: await dai.balanceOf(cDai.address),
            defimCDai: await cDai.balanceOf(defim.address),
            cDaiUnderlying: await cDai.getBalanceOfUnderlying(defim.address),
            userDai: await dai.balanceOf(user),
        };
        expect(afterSmallWithdraw.cDaiDai).to.be.bignumber.eq(afterBigDeposit.cDaiDai);
        expect(afterSmallWithdraw.userDai).to.be.bignumber.eq(afterBigDeposit.userDai.add(smallWithdraw))

        let bigWithdraw = maxInstantAmount;
        await (<any>funds).methods['withdrawLTokens(address,uint256)'](user, bigWithdraw, {from: owner});

        let afterBigWithdraw = {
            fundsDai: await dai.balanceOf(funds.address),
            cDaiDai: await dai.balanceOf(cDai.address),
            defimCDai: await cDai.balanceOf(defim.address),
            cDaiUnderlying: await cDai.getBalanceOfUnderlying(defim.address),
            userDai: await dai.balanceOf(user),
        };
        expect(afterBigWithdraw.userDai).to.be.bignumber.eq(afterSmallWithdraw.userDai.add(bigWithdraw));
    });
});
