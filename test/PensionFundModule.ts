import { 
    FreeDAIContract, FreeDAIInstance,
    PoolContract, PoolInstance, 
    AccessModuleContract, AccessModuleInstance,
    PTokenContract, PTokenInstance, 
    CurveModuleContract, CurveModuleInstance,
    BaseFundsModuleContract, BaseFundsModuleInstance,
    DefiModuleStubContract, DefiModuleStubInstance,
    PensionFundModuleContract, PensionFundModuleInstance,
} from "../types/truffle-contracts/index";

// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, expectRevert, shouldFail, time } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();
var expect = require("chai").expect;
const w3random = require("./utils/w3random");
const expectEqualBN = require("./utils/expectEqualBN");
import Snapshot from "./utils/snapshot";

const FreeDAI = artifacts.require("FreeDAI");
const CErc20Stub = artifacts.require("CErc20Stub");
const Pool = artifacts.require("Pool");
const AccessModule = artifacts.require("AccessModule");
const PToken = artifacts.require("PToken");
const CurveModule = artifacts.require("CurveModule");
const BaseFundsModule = artifacts.require("BaseFundsModule");
const DefiModuleStub = artifacts.require("DefiModuleStub");
const PensionFundModule = artifacts.require("PensionFundModule");

type PensionPlanSettings = {
    depositPeriodDuration:BN,
    minPenalty:BN,
    maxPenalty:BN,
    withdrawPeriodDuration:BN,
    initalWithdrawAllowance:BN
}

type PensionPlan = {
    created:BN,
    pWithdrawn:BN
}
const BN0 = new BN(0);

contract("PensionFundModule", async ([_, owner, user, ...otherAccounts]) => {
    let dai: FreeDAIInstance;
    let pool: PoolInstance;
    let access: AccessModuleInstance;
    let pToken: PTokenInstance;
    let curve: CurveModuleInstance; 
    let funds: BaseFundsModuleInstance;
    let liqm: PensionFundModuleInstance; 
    let defi: DefiModuleStubInstance; 
 
    let MULTIPLIER:BN;
    let planSettings:PensionPlanSettings;

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

        liqm = await PensionFundModule.new();
        await (<any> liqm).methods['initialize(address)'](pool.address, {from: owner});

        defi = await DefiModuleStub.new();
        await (<any> defi).methods['initialize(address)'](pool.address, {from: owner});


        await pool.set('ltoken', dai.address, false, {from: owner});
        await pool.set("access", access.address, true, {from: owner});  
        await pool.set('ptoken', pToken.address, true, {from: owner});
        await pool.set('funds', funds.address, true, {from: owner});
        await pool.set("curve", curve.address, true, {from: owner});  
        await pool.set("liquidity", liqm.address, true, {from: owner});  
        await pool.set("defi", defi.address, true, {from: owner});  
        await pToken.addMinter(funds.address, {from: owner});
        await funds.addFundsOperator(liqm.address, {from: owner});

        // Settings
        MULTIPLIER = await liqm.MULTIPLIER();
        await liqm.setPlanSettings('7200', MULTIPLIER.muln(10).divn(100), MULTIPLIER.muln(90).divn(100), '3600', '0', {from:owner});

        planSettings = <PensionPlanSettings>await (<any>liqm).planSettings();
        //console.log(planSettings);


        //Prepare user
        await prepareDAI(user, w3random.interval(2000, 5000, 'ether'), funds.address);
    });

    it("should create plan with first deposit", async () => {
        let before = {
            userDAI: await dai.balanceOf(user),
            userPTK: await pToken.balanceOf(user),
            plan: <PensionPlan>await <any>liqm.plans(user),
        };
        expect(before.userPTK).to.be.bignumber.eq(BN0);
        expect(before.plan.created).to.be.bignumber.eq(BN0);

        let lAmount = w3random.interval(100, 200, 'ether');
        await liqm.deposit(lAmount, BN0, {from:user});

        let after = {
            userDAI: await dai.balanceOf(user),
            userPTK: await pToken.balanceOf(user),
            plan: <PensionPlan>await <any>liqm.plans(user),
        };
        expect(after.userDAI).to.be.bignumber.eq(before.userDAI.sub(lAmount));
        expect(after.userPTK).to.be.bignumber.gt(before.userPTK);
        expect(after.plan.created).to.be.bignumber.gt(BN0);
        expect(after.plan.pWithdrawn).to.be.bignumber.eq(BN0);
    });

    it("should deposit into existing plan", async () => {
        let before = {
            userDAI: await dai.balanceOf(user),
            userPTK: await pToken.balanceOf(user),
            plan: <PensionPlan>await <any>liqm.plans(user),
        };
        expect(before.plan.created).to.be.bignumber.gt(BN0);

        let lAmount = w3random.interval(100, 200, 'ether');
        await liqm.deposit(lAmount, BN0, {from:user});

        let after = {
            userDAI: await dai.balanceOf(user),
            userPTK: await pToken.balanceOf(user),
            plan: <PensionPlan>await <any>liqm.plans(user),
        };
        expect(after.userDAI).to.be.bignumber.eq(before.userDAI.sub(lAmount));
        expect(after.userPTK).to.be.bignumber.gt(before.userPTK);
        expect(before.plan.created).to.be.bignumber.eq(before.plan.created);
    });

    it("should correctly close plan during deposit period", async () => {
        let snap = await Snapshot.create(web3.currentProvider);
        let expectedRefund: BN, timeSinceCreation:BN, expectedPenalty:BN;

        let before = {
            userDAI: await dai.balanceOf(user),
            userPTK: await pToken.balanceOf(user),
            plan: <PensionPlan>await <any>liqm.plans(user),
            withdrawLimit: await liqm.withdrawLimit(user),
            pRefund: await liqm.pRefund(user),
        };
        timeSinceCreation = (await time.latest()).sub(before.plan.created);
        expect(before.withdrawLimit).to.be.bignumber.eq(BN0); 
        expectedPenalty = planSettings.minPenalty.add(
            planSettings.maxPenalty.sub(planSettings.minPenalty)
            .mul(planSettings.depositPeriodDuration.sub(timeSinceCreation))
            .div(planSettings.depositPeriodDuration)
        );
        expectedRefund = MULTIPLIER.sub(expectedPenalty).mul(before.userPTK).div(MULTIPLIER);
        expectEqualBN(before.pRefund, expectedRefund);

        let timeShift = w3random.intervalBN(
            planSettings.depositPeriodDuration.muln(1).divn(4),
            planSettings.depositPeriodDuration.muln(3).divn(4),
        );
        await time.increase(timeShift.toString());

        let afterTimeShift = {
            userDAI: await dai.balanceOf(user),
            userPTK: await pToken.balanceOf(user),
            plan: <PensionPlan>await <any>liqm.plans(user),
            withdrawLimit: await liqm.withdrawLimit(user),
            pRefund: await liqm.pRefund(user),
        };
        timeSinceCreation = (await time.latest()).sub(before.plan.created);
        expect(afterTimeShift.withdrawLimit).to.be.bignumber.eq(BN0); 
        expect(timeSinceCreation).to.be.bignumber.gte(timeShift);
        expectedPenalty = planSettings.minPenalty.add(
            planSettings.maxPenalty.sub(planSettings.minPenalty)
            .mul(planSettings.depositPeriodDuration.sub(timeSinceCreation))
            .div(planSettings.depositPeriodDuration)
        );
        expectedRefund = MULTIPLIER.sub(expectedPenalty).mul(afterTimeShift.userPTK).div(MULTIPLIER);
        expectEqualBN(afterTimeShift.pRefund, expectedRefund);

        await liqm.closePlan(BN0, {from:user});
        let afterClose = {
            userDAI: await dai.balanceOf(user),
            userPTK: await pToken.balanceOf(user),
            plan: <PensionPlan>await <any>liqm.plans(user),
            withdrawLimit: await liqm.withdrawLimit(user),
            pRefund: await liqm.pRefund(user),
        };
        expect(afterClose.plan.created).to.be.bignumber.eq(BN0); 
        expect(afterClose.plan.pWithdrawn).to.be.bignumber.eq(BN0); 
        expect(afterClose.withdrawLimit).to.be.bignumber.eq(BN0); 
        expect(afterClose.pRefund).to.be.bignumber.eq(BN0); 
        expect(afterClose.userPTK).to.be.bignumber.eq(BN0); 
        expect(afterClose.userDAI).to.be.bignumber.gt(before.userDAI); 

        await snap.revert();
    });
    it("should deny withdraw during deposit period", async () => {
        let before = {
            userPTK: await pToken.balanceOf(user),
            plan: <PensionPlan>await <any>liqm.plans(user),
            withdrawLimit: await liqm.withdrawLimit(user),
        };
        expect(before.userPTK).to.be.bignumber.gt(BN0); 
        expect(before.withdrawLimit).to.be.bignumber.eq(BN0); 

        let timeShift = w3random.intervalBN(
            planSettings.depositPeriodDuration.muln(1).divn(4),
            planSettings.depositPeriodDuration.muln(2).divn(4),
        );
        await time.increase(timeShift.toString());

        let afterTimeShift = {
            userPTK: await pToken.balanceOf(user),
            plan: <PensionPlan>await <any>liqm.plans(user),
            withdrawLimit: await liqm.withdrawLimit(user),
        };
        expect(afterTimeShift.userPTK).to.be.bignumber.gt(BN0); 
        expect(afterTimeShift.withdrawLimit).to.be.bignumber.eq(BN0); 

        let pAmount = afterTimeShift.userPTK.muln(1).divn(10);
        await expectRevert(
            liqm.withdraw(pAmount, BN0, {from:user}),
            "PensionFundLiquidityModule: not enough withdraw allowance"
        );
    });
    it("should allow withdraw during withdraw period", async () => {
        let before = {
            userPTK: await pToken.balanceOf(user),
            plan: <PensionPlan>await <any>liqm.plans(user),
            withdrawLimit: await liqm.withdrawLimit(user),
        };
        expect(before.userPTK).to.be.bignumber.gt(BN0); 
        expect(before.withdrawLimit).to.be.bignumber.eq(BN0); 
        expect(before.plan.pWithdrawn).to.be.bignumber.eq(BN0); 
        let timeSinceCreation = (await time.latest()).sub(before.plan.created);

        // Shift time into withdraw period
        let timeShift = w3random.intervalBN(
            planSettings.withdrawPeriodDuration.muln(1).divn(10),
            planSettings.withdrawPeriodDuration.muln(2).divn(10),
        ).add(planSettings.depositPeriodDuration).sub(timeSinceCreation);
        await time.increase(timeShift.toString());

        let afterTimeShift = {
            userPTK: await pToken.balanceOf(user),
            plan: <PensionPlan>await <any>liqm.plans(user),
            withdrawLimit: await liqm.withdrawLimit(user),
        };
        expect(afterTimeShift.withdrawLimit).to.be.bignumber.gt(BN0); 

        let pAmount1 = afterTimeShift.userPTK.muln(1).divn(10);
        expect(pAmount1).to.be.bignumber.lt(afterTimeShift.withdrawLimit); 
        await liqm.withdraw(pAmount1, BN0, {from:user});

        let afterWithdraw1 = {
            userPTK: await pToken.balanceOf(user),
            plan: <PensionPlan>await <any>liqm.plans(user),
            withdrawLimit: await liqm.withdrawLimit(user),
        };
        expect(afterWithdraw1.plan.pWithdrawn).to.be.bignumber.eq(pAmount1); 
        expect(afterWithdraw1.userPTK).to.be.bignumber.eq(afterTimeShift.userPTK.sub(pAmount1)); 

        let pAmount2 = afterWithdraw1.withdrawLimit;
        await liqm.withdraw(pAmount2, BN0, {from:user});

        let afterWithdraw2 = {
            userPTK: await pToken.balanceOf(user),
            plan: <PensionPlan>await <any>liqm.plans(user),
            withdrawLimit: await liqm.withdrawLimit(user),
        };
        expectEqualBN(afterWithdraw2.withdrawLimit, BN0);
        expect(afterWithdraw2.plan.pWithdrawn).to.be.bignumber.eq(pAmount1.add(pAmount2)); 
        expect(afterWithdraw2.userPTK).to.be.bignumber.eq(afterWithdraw1.userPTK.sub(pAmount2)); 
    });

    it("should not allow withdraw too much", async () => {
        //Shift time inside withdraw period
        let timeShift = w3random.intervalBN(
            planSettings.withdrawPeriodDuration.muln(1).divn(10),
            planSettings.withdrawPeriodDuration.muln(2).divn(10),
        );
        await time.increase(timeShift.toString());

        let before = {
            userPTK: await pToken.balanceOf(user),
            plan: <PensionPlan>await <any>liqm.plans(user),
            withdrawLimit: await liqm.withdrawLimit(user),
        };
        expect(before.userPTK).to.be.bignumber.gt(BN0); 
        expect(before.withdrawLimit).to.be.bignumber.gt(BN0); 
        expect(before.plan.pWithdrawn).to.be.bignumber.gt(BN0); 

        let pAmount = before.withdrawLimit.muln(110).divn(100);

        await expectRevert(
            liqm.withdraw(pAmount, BN0, {from:user}),
            "PensionFundLiquidityModule: not enough withdraw allowance"
        );
    });

    it("should allow full withdraw after withdraw period", async () => {
        let before = {
            userPTK: await pToken.balanceOf(user),
            plan: <PensionPlan>await <any>liqm.plans(user),
            withdrawLimit: await liqm.withdrawLimit(user),
        };

        // Shift time after withdraw period end
        let timeSinceCreation = (await time.latest()).sub(before.plan.created);
        let timeShift = w3random.intervalBN(
            planSettings.withdrawPeriodDuration.muln(1).divn(10),
            planSettings.withdrawPeriodDuration.muln(2).divn(10),
        ).add(planSettings.depositPeriodDuration).add(planSettings.withdrawPeriodDuration).sub(timeSinceCreation);
        await time.increase(timeShift.toString());

        let afterTimeShift = {
            userPTK: await pToken.balanceOf(user),
            plan: <PensionPlan>await <any>liqm.plans(user),
            withdrawLimit: await liqm.withdrawLimit(user),
        };
        expect(afterTimeShift.withdrawLimit).to.be.bignumber.eq(afterTimeShift.userPTK); 

        let pAmount = afterTimeShift.withdrawLimit;
        await liqm.withdraw(pAmount, BN0, {from:user});        

        let afterWithdraw = {
            userPTK: await pToken.balanceOf(user),
            plan: <PensionPlan>await <any>liqm.plans(user),
            withdrawLimit: await liqm.withdrawLimit(user),
        };
        expect(afterWithdraw.userPTK).to.be.bignumber.eq(BN0); 
        // Check Plan deleted        
        expect(afterWithdraw.plan.created).to.be.bignumber.eq(BN0); 
        expect(afterWithdraw.plan.pWithdrawn).to.be.bignumber.eq(BN0); 
        expect(afterWithdraw.withdrawLimit).to.be.bignumber.eq(BN0); 
    });

    async function prepareDAI(beneficiary:string, amount:BN, approveTo?:string){
        await (<any> dai).methods['mint(uint256)'](amount, {from: beneficiary});
        if(approveTo){
            await dai.approve(approveTo, amount, {from: beneficiary});
        }
    }
});
