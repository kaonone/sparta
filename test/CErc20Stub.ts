import { 
    FreeDAIContract, FreeDAIInstance,
    CErc20StubContract, CErc20StubInstance 
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

contract("CErc20Stub", async ([_, owner, user, ...otherAccounts]) => {
    let dai: FreeDAIInstance;
    let cDai: CErc20StubInstance;
  
    before(async () => {
        dai = await FreeDAI.new();
        await (<any> dai).methods['initialize()']({from: owner});

        cDai = await CErc20Stub.new();
        await (<any> cDai).methods['initialize(address)'](dai.address, {from: owner});

    });

    it("should mint cDai in exchange for FreeDAI", async () => {
        let amount = w3random.interval(100, 1000, 'ether');
        await (<any> dai).methods['mint(uint256)'](amount, {from: user});
        dai.approve(cDai.address, amount, {from: user});

        let daiBalanceBefore = await dai.balanceOf(user);
        let cDaiBalanceBefore = await cDai.balanceOf(user);
        // console.log('before', amount.toString(), daiBalanceBefore.toString(), cDaiBalanceBefore.toString());    

        let receipt = await cDai.mint(amount, {from: user});

        let daiBalanceAfter = await dai.balanceOf(user);
        let cDaiBalanceAfter = await cDai.balanceOf(user);
        // console.log('after', daiBalanceAfter.toString(), cDaiBalanceAfter.toString());    
        expect(daiBalanceAfter).to.be.bignumber.eq(daiBalanceBefore.sub(amount));
        expect(cDaiBalanceAfter).to.be.bignumber.gt(cDaiBalanceBefore);
        let underlyingBalance = await cDai.getBalanceOfUnderlying(user);
        expectEqualBN(underlyingBalance, amount, 18, -6); //Inaccuracy may be caused by rounding because cDAI only has 8 digits
    });

    it("should redeem FreeDAI in exchange for cDai by cDAI balance", async () => {
        let cDaiBalance = await cDai.balanceOf(user);
        let daiBalanceBefore = await dai.balanceOf(user);
        let underlyingBalance = await cDai.getBalanceOfUnderlying(user);

        let amount = w3random.intervalBN(cDaiBalance.divn(3), cDaiBalance.divn(2));
        let expectedDai = underlyingBalance.mul(amount).div(cDaiBalance);
        
        cDai.approve(cDai.address, amount, {from: user});
        let receipt = await cDai.redeem(amount, {from: user});

        let daiBalanceAfter = await dai.balanceOf(user);
        expectEqualBN(daiBalanceAfter, daiBalanceBefore.add(expectedDai), 18, -5); //Inaccuracy may be caused by time shift
    });

    it("should redeem FreeDAI in exchange for cDai by underlyingBalance", async () => {
        let cDaiBalance = await cDai.balanceOf(user);
        let underlyingBalance = await cDai.getBalanceOfUnderlying(user);
        let amount = w3random.intervalBN(underlyingBalance.divn(3), underlyingBalance.divn(2));

        let daiBalanceBefore = await dai.balanceOf(user);
        
        cDai.approve(cDai.address, cDaiBalance, {from: user});
        let receipt = await cDai.redeemUnderlying(amount, {from: user});

        let daiBalanceAfter = await dai.balanceOf(user);
        expect(daiBalanceAfter).to.be.bignumber.eq(daiBalanceBefore.add(amount));
    });

});
