import { FreeDAIContract, FreeDAIInstance } from "../types/truffle-contracts/index";

// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, expectRevert, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();
const w3random = require("./utils/w3random");

const FreeDAI = artifacts.require("FreeDAI");

contract("FreeDAI", async ([_, owner, ...otherAccounts]) => {
    let token: FreeDAIInstance;
  
    beforeEach(async () => {
        token = await FreeDAI.new();
        await (<any> token).methods['initialize()']({from: owner});
    });

    it("should be mintable by anyone", async () => {
        let amount = w3random.interval(1, 1000, 'ether');
        let receipt = await (<any> token).methods['mint(uint256)'](amount, {from: otherAccounts[0]});
        expectEvent(receipt, 'Transfer', {'from':constants.ZERO_ADDRESS, 'to':otherAccounts[0], 'value':amount});
    });
    it("should be mintable by anyone for anyone", async () => {
        let amount = w3random.interval(1, 1000, 'ether');
        let receipt = await (<any> token).methods['mint(address,uint256)'](otherAccounts[1], amount, {from: otherAccounts[0]});
        expectEvent(receipt, 'Transfer', {'from':constants.ZERO_ADDRESS, 'to':otherAccounts[1], 'value':amount});
    });
    it("should be transferable", async () => {
        let amount = w3random.interval(1, 1000, 'ether');
        await token.mint(otherAccounts[0], amount, {from: owner});
        let receipt = await token.transfer(otherAccounts[1], amount, {from: otherAccounts[0]});
        expectEvent(receipt, 'Transfer', {'from':otherAccounts[0], 'to':otherAccounts[1], 'value':amount});
    });
    it("should be burnable", async () => {
        let amount = w3random.interval(1, 1000, 'ether');
        await token.mint(otherAccounts[0], amount, {from: owner});
        let receipt = await token.burn(amount, {from: otherAccounts[0]});
        expectEvent(receipt, 'Transfer', {'from':otherAccounts[0], 'to':constants.ZERO_ADDRESS, 'value':amount});
    });

});
