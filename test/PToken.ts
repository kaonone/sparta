import { 
    PoolContract, PoolInstance, 
    PTokenContract, PTokenInstance, 
    FundsModuleStubContract, FundsModuleStubInstance
} from "../types/truffle-contracts/index";

// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
import Snapshot from "./utils/snapshot";
const should = require("chai").should();
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
        receipt = await pToken.claimDistributions(otherAccounts[0], {from: owner});
        expectEvent(receipt, 'DistributionsClaimed', {'account':otherAccounts[0], 'amount':amountDU1});
        receipt = await pToken.claimDistributions(otherAccounts[1], {from: owner});
        expectEvent(receipt, 'DistributionsClaimed', {'account':otherAccounts[1], 'amount':amountDU2});

    });
});
