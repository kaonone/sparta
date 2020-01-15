import { PTokenContract, PTokenInstance } from "../types/truffle-contracts/index";

// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, expectRevert, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();
const w3random = require("./utils/w3random");

const PToken = artifacts.require("PToken");

contract("PToken", async ([_, owner, ...otherAccounts]) => {
    let pToken: PTokenInstance;
  
    beforeEach(async () => {
        pToken = await PToken.new();
        await (<any> pToken).methods['initialize()']({from: owner});
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
    it("should be transferable", async () => {
        let amount = w3random.interval(1, 1000, 'ether');
        await pToken.mint(otherAccounts[0], amount, {from: owner});
        let receipt = await pToken.transfer(otherAccounts[1], amount, {from: otherAccounts[0]});
        expectEvent(receipt, 'Transfer', {'from':otherAccounts[0], 'to':otherAccounts[1], 'value':amount});
    });
    it("should be burnable", async () => {
        let amount = w3random.interval(1, 1000, 'ether');
        await pToken.mint(otherAccounts[0], amount, {from: owner});
        let receipt = await pToken.burn(amount, {from: otherAccounts[0]});
        expectEvent(receipt, 'Transfer', {'from':otherAccounts[0], 'to':constants.ZERO_ADDRESS, 'value':amount});
    });

});
