import { 
    PoolContract, PoolInstance, 
    PTokenContract, PTokenInstance, 
    FundsModuleStubContract, FundsModuleStubInstance
} from "../types/truffle-contracts/index";

// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, shouldFail, time } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
import Snapshot from "./utils/snapshot";
const should = require("chai").should();
var expect = require("chai").expect;
const expectRevert= require("./utils/expectRevert");
const expectEqualBN = require("./utils/expectEqualBN");
const w3random = require("./utils/w3random");

const Pool = artifacts.require("Pool");
const PToken = artifacts.require("PToken");
const FundsModuleStub = artifacts.require("FundsModuleStub");

contract("PToken", async ([_, owner, ...otherAccounts]) => {
    let snap: Snapshot;
    let pool: PoolInstance;
    let pToken: PTokenInstance;
    let funds: FundsModuleStubInstance;
  
    before(async () => {
        //Setup system contracts
        pool = await Pool.new();
        await (<any> pool).methods['initialize()']({from: owner});

        pToken = await PToken.new();
        await (<any> pToken).methods['initialize(address)'](pool.address, {from: owner});

        funds = await FundsModuleStub.new();
        await (<any> funds).methods['initialize(address)'](pool.address, {from: owner});

        await pool.set('ptoken', pToken.address, false, {from: owner});
        await pool.set('funds', funds.address, false, {from: owner});
        await pToken.addMinter(funds.address, {from: owner});

        //Save snapshot
        snap = await Snapshot.create(web3.currentProvider);
    });

    beforeEach(async () => {
        await snap.revert();
    });

    it("should be mintable by owner", async () => {
        let amount = w3random.interval(1, 1000, 'ether');
        let receipt = await pToken.mint(owner, amount, {from: owner});
        expectEvent(receipt, 'Transfer', {'from':constants.ZERO_ADDRESS, 'to':owner, 'value':amount});
    });
    it("should not be mintable by others", async () => {
        let amount = w3random.interval(1, 1000, 'ether');
        await expectRevert(
            pToken.mint(otherAccounts[0], amount, {from: otherAccounts[0]}), 
            'MinterRole: caller does not have the Minter role'
        );
    });
    it("should be transferable to FundsModule without aproval", async () => {
        let amount = w3random.interval(1, 1000, 'ether');
        await pToken.mint(otherAccounts[0], amount, {from: owner});
        let balanceBefore = await pToken.balanceOf(otherAccounts[0]);
        let receipt = await funds.depositPTokens(otherAccounts[0], amount, {from: owner});
        let balanceAfter = await pToken.balanceOf(otherAccounts[0]);
        expectEqualBN(balanceBefore.sub(balanceAfter), amount);
    });
    it("should be transferable from FundsModule", async () => {
        let amount = w3random.interval(1, 1000, 'ether');
        await pToken.mint(funds.address, amount, {from: owner});
        let balanceBefore = await pToken.balanceOf(otherAccounts[0]);
        let receipt = await funds.withdrawPTokens(otherAccounts[0], amount, {from: owner});
        let balanceAfter = await pToken.balanceOf(otherAccounts[0]);
        expectEqualBN(balanceAfter.add(balanceBefore), amount);
    });
    it("should not be transferable for others", async () => {
        let amount = w3random.interval(1, 1000, 'ether');
        await pToken.mint(otherAccounts[0], amount, {from: owner});
        expectRevert(
            pToken.transfer(otherAccounts[1], amount, {from: otherAccounts[0]}),
            'PToken: only transfers to/from FundsModule allowed'
        );
    });
    it("should be burnable", async () => {
        let amount = w3random.interval(1, 1000, 'ether');
        await pToken.mint(otherAccounts[0], amount, {from: owner});
        let receipt = await pToken.burn(amount, {from: otherAccounts[0]});
        expectEvent(receipt, 'Transfer', {'from':otherAccounts[0], 'to':constants.ZERO_ADDRESS, 'value':amount});
    });
    it("should not distribute to a new user", async () => {
        await pToken.mint(otherAccounts[0], w3random.interval(1000, 5000, 'ether'), {from: owner});
        await pToken.distribute(w3random.interval(1000, 5000, 'ether'), {from: owner});
        time.increase(24*60*60);

        let pAmount = w3random.interval(10, 20, 'ether');
        await pToken.mint(otherAccounts[1], pAmount, {from: owner});
        time.increase(24*60*60);
        await (<any>pToken).methods['claimDistributions(address)'](otherAccounts[1]);
        let pBalance = await pToken.balanceOf(otherAccounts[1]);
        expect(pBalance).to.be.bignumber.eq(pAmount);
    });
    it("should distribute tokens", async () => {
        let amountU1 = w3random.interval(1, 1000, 'ether');
        // console.log('amountU1', amountU1.toString());
        let amountU2 = w3random.interval(1, 1000, 'ether');
        // console.log('amountU2', amountU2.toString());
        let amountD = w3random.interval(1, 1000, 'ether');
        // console.log('amountD', amountD.toString());
        await pToken.mint(otherAccounts[0], amountU1, {from: owner});
        await pToken.mint(otherAccounts[1], amountU2, {from: owner});
        let totalSupplyBeforeDistrExpected = amountU1.add(amountU2);
        let totalSupplyBeforeDistr = await pToken.totalSupply();

        let fullBalanceU1b = await pToken.fullBalanceOf(otherAccounts[0]);
        // console.log('fullBalanceU1b', fullBalanceU1b.toString());
        let fullBalanceU2b = await pToken.fullBalanceOf(otherAccounts[1]);
        // console.log('fullBalanceU2b', fullBalanceU1b.toString());

        expectEqualBN(totalSupplyBeforeDistr, totalSupplyBeforeDistrExpected);
        let receipt = await pToken.distribute(amountD, {from: owner});
        expectEvent(receipt, 'DistributionCreated', {'amount':amountD, 'totalSupply':totalSupplyBeforeDistr});
        let amountDU1 = amountU1.mul(amountD).div(totalSupplyBeforeDistr);
        // console.log('amountDU1', amountDU1.toString());
        let amountDU2 = amountU2.mul(amountD).div(totalSupplyBeforeDistr);
        // console.log('amountDU2', amountDU2.toString());
        expectEqualBN(amountDU1.add(amountDU2), amountD);
        let fullBalanceU1 = await pToken.fullBalanceOf(otherAccounts[0]);
        let fullBalanceU2 = await pToken.fullBalanceOf(otherAccounts[1]);
        expectEqualBN(fullBalanceU1, amountU1.add(amountDU1));
        expectEqualBN(fullBalanceU2, amountU2.add(amountDU2));
        receipt = await (<any>pToken).methods['claimDistributions(address)'](otherAccounts[0], {from: owner});
        expectEvent(receipt, 'DistributionsClaimed', {'account':otherAccounts[0], 'amount':amountDU1});
        receipt = await (<any>pToken).methods['claimDistributions(address)'](otherAccounts[1], {from: owner});
        expectEvent(receipt, 'DistributionsClaimed', {'account':otherAccounts[1], 'amount':amountDU2});

    });

    it("should accumulate distributions", async () => {
        let receipt, totalSupply, accumulated;
        let amountD1 = w3random.interval(1, 10, 'ether');
        let amountD2 = w3random.interval(1, 10, 'ether');
        let amountD3 = w3random.interval(1, 10, 'ether');

        let amountU:Array<BN> = [];
        for(let i=0; i<5; i++) {
            amountU[i] = w3random.interval(1, 1000, 'ether');
            await pToken.mint(otherAccounts[i], amountU[i], {from: owner});
        }
        const totalSupplyBeforeDistr = await pToken.totalSupply();

        // Set time to start of the day
        let now = await time.latest();
        let tommorow =  now - (now % (24*60*60)) + (24*60*60);
        time.increaseTo(tommorow + 2*60*60);

        // First distribution (executed because initial nextDistributionTimestmap == 0)
        receipt = await pToken.distribute(amountD1, {from: owner});
        expectEvent(receipt, 'DistributionAccumulatorIncreased', {'amount': amountD1});
        expectEvent(receipt, 'DistributionCreated', {'amount': amountD1, 'totalSupply':totalSupplyBeforeDistr});
        totalSupply = await pToken.totalSupply();
        expectEqualBN(totalSupply, totalSupplyBeforeDistr.add(amountD1));
        accumulated = await pToken.distributionAccumulator();
        expectEqualBN(accumulated, new BN(0));
        await (<any>pToken).methods['claimDistributions(address[])'](otherAccounts.slice(0, 5));
        for(let i=0; i<5; i++) {
            let prevAmountU = amountU[i];
            let distrU = amountD1.mul(amountU[i]).div(totalSupplyBeforeDistr);
            amountU[i] = await pToken.balanceOf(otherAccounts[i]);
            expectEqualBN(amountU[i], prevAmountU.add(distrU));
        }

        // Second distribution (accumulated)
        time.increase(2*60*60);
        receipt = await pToken.distribute(amountD2, {from: owner});
        expectEvent(receipt, 'DistributionAccumulatorIncreased', {'amount': amountD2});
        totalSupply = await pToken.totalSupply();
        expectEqualBN(totalSupply, totalSupplyBeforeDistr.add(amountD1)); //Total Supply not increased
        accumulated = await pToken.distributionAccumulator();
        expectEqualBN(accumulated, amountD2);
        await (<any>pToken).methods['claimDistributions(address[])'](otherAccounts.slice(0, 5));
        for(let i=0; i<5; i++) {
            let prevAmountU = amountU[i];
            amountU[i] = await pToken.balanceOf(otherAccounts[i]);
            expectEqualBN(amountU[i], prevAmountU);
        }

        // Third distribution (triggers accumulated distribuitions)
        time.increase(24*60*60);
        receipt = await pToken.distribute(amountD3, {from: owner});
        expectEvent(receipt, 'DistributionAccumulatorIncreased', {'amount': amountD3});
        expectEvent(receipt, 'DistributionCreated', {'amount': amountD2.add(amountD3), 'totalSupply':totalSupplyBeforeDistr.add(amountD1)});
        totalSupply = await pToken.totalSupply();
        expectEqualBN(totalSupply, totalSupplyBeforeDistr.add(amountD1).add(amountD2).add(amountD3));
        accumulated = await pToken.distributionAccumulator();
        expectEqualBN(accumulated, new BN(0));
        await (<any>pToken).methods['claimDistributions(address[])'](otherAccounts.slice(0, 5));
        for(let i=0; i<5; i++) {
            let prevAmountU = amountU[i];
            let distrU = amountD2.add(amountD3).mul(amountU[i]).div(totalSupplyBeforeDistr.add(amountD1));
            amountU[i] = await pToken.balanceOf(otherAccounts[i]);
            expectEqualBN(amountU[i], prevAmountU.add(distrU));
        }
    });
    it("should trigger accumulated distributions on transfer", async () => {
        let receipt, totalSupply, accumulated;
        for(let i=0; i<5; i++) {
            await pToken.mint(otherAccounts[i], w3random.interval(100, 1000, 'ether'), {from: owner});
        }


        // Set time to start of the day
        let now = await time.latest();
        let tommorow =  now - (now % (24*60*60)) + (24*60*60);
        time.increaseTo(tommorow + 2*60*60);

        // First distribution is always triggered
        await pToken.distribute(w3random.interval(1, 10, 'ether'), {from: owner});

        // Second distribution (accumulated)
        time.increase(2*60*60);
        totalSupply = await pToken.totalSupply();
        receipt = await pToken.distribute(w3random.interval(1, 10, 'ether'), {from: owner});
        expectEvent(receipt, 'DistributionAccumulatorIncreased');
        //Make sure distribution was not triggered
        expectEqualBN(await pToken.totalSupply(), totalSupply); 
        accumulated = await pToken.distributionAccumulator();
        expect(accumulated).to.be.bignumber.gt(new BN(0));

        // Action that triggers distribution
        time.increase(24*60*60);
        //await pToken.transfer(funds.address, w3random.interval(1, 10, 'ether'), {from: otherAccounts[0]});
        await funds.depositPTokens(otherAccounts[0], w3random.interval(1, 10, 'ether'), {from: owner});
        //Make sure distribution was triggered
        expectEqualBN(await pToken.distributionAccumulator(), new BN(0));
        expectEqualBN(await pToken.totalSupply(), totalSupply.add(accumulated));
    });

});
