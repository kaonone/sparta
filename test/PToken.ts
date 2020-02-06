import { 
    PoolContract, PoolInstance, 
    PTokenContract, PTokenInstance 
} from "../types/truffle-contracts/index";

// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();
const expectRevert= require("./utils/expectRevert");
const w3random = require("./utils/w3random");

const Pool = artifacts.require("Pool");
const PToken = artifacts.require("PToken");

contract("PToken", async ([_, owner, funds, ...otherAccounts]) => {
    let pool: PoolInstance;
    let pToken: PTokenInstance;
  
    beforeEach(async () => {
        //Setup system contracts
        pool = await Pool.new();
        await pool.initialize({from: owner});

        pToken = await PToken.new();
        await (<any> pToken).methods['initialize(address)'](pool.address, {from: owner});

        await pool.set('ptoken', pToken.address, false, {from: owner});
        await pool.set('funds', funds, false, {from: owner});
        await pToken.addMinter(funds, {from: owner});
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
    it("should be transferable from FundsModule", async () => {
        let amount = w3random.interval(1, 1000, 'ether');
        await pToken.mint(funds, amount, {from: owner});
        let receipt = await pToken.transfer(otherAccounts[0], amount, {from: funds});
        expectEvent(receipt, 'Transfer', {'from':funds, 'to':otherAccounts[0], 'value':amount});
    });
    it("should be transferable from others without aproval by FundsModule", async () => {
        let amount = w3random.interval(1, 1000, 'ether');
        await pToken.mint(otherAccounts[0], amount, {from: owner});
        let receipt = await pToken.transferFrom(otherAccounts[0], otherAccounts[1], amount, {from: funds});
        expectEvent(receipt, 'Transfer', {'from':otherAccounts[0], 'to':otherAccounts[1], 'value':amount});
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
    it("should be burnable without approval by FundsModule", async () => {
        let amount = w3random.interval(1, 1000, 'ether');
        await pToken.mint(otherAccounts[0], amount, {from: owner});
        let receipt = await pToken.burnFrom(otherAccounts[0], amount, {from: funds});
        expectEvent(receipt, 'Transfer', {'from':otherAccounts[0], 'to':constants.ZERO_ADDRESS, 'value':amount});
    });

});
