import { TestAddressListContract, TestAddressListInstance } from "../types/truffle-contracts/index";
const {BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
var should = require("chai").should;
var expect = require("chai").expect;
const w3random = require("./utils/w3random");
const expectRevert= require("./utils/expectRevert");

const TestAddressList = artifacts.require("TestAddressList");

contract("AddressList", async ([_, owner, ...otherAccounts]) => {
    let instance: TestAddressListInstance;
  
    before(async () => {
        instance = await TestAddressList.new();
        //console.log(otherAccounts);
    });

    it("should append address to empty list", async () => {
        await (<any>instance).methods['append(address)'](otherAccounts[0]);
        //Expected array state: [A0]

        let after = {
            first: await instance.first(),
            last: await instance.last(),
            containsA0: await instance.contains(otherAccounts[0]),
        };
        expect(after.first).to.be.eq(otherAccounts[0]);
        expect(after.last).to.be.eq(otherAccounts[0]);
        expect(after.containsA0).to.be.true;

        let state = await getCurrentState();
        expect(state).to.be.eql([
            otherAccounts[0],
        ]);
    });

    it("should append address to non-empty list", async () => {
        await (<any>instance).methods['append(address)'](otherAccounts[1]);

        let after = {
            first: await instance.first(),
            last: await instance.last(),
            containsA0: await instance.contains(otherAccounts[0]),
            containsA1: await instance.contains(otherAccounts[1]),
        };
        expect(after.first).to.be.eq(otherAccounts[0]);
        expect(after.last).to.be.eq(otherAccounts[1]);
        expect(after.containsA0).to.be.true;
        expect(after.containsA1).to.be.true;

        let state = await getCurrentState();
        expect(state).to.be.eql([
            otherAccounts[0],
            otherAccounts[1],
        ]);
    });

    it("should not append already existing address", async () => {
        await expectRevert(
            (<any>instance).methods['append(address)'](otherAccounts[1]),
            "Unable to contain double element"
        );
    });

    it("should prepend address", async () => {
        await (<any>instance).methods['prepend(address)'](otherAccounts[2]);

        let after = {
            first: await instance.first(),
            last: await instance.last(),
            containsA0: await instance.contains(otherAccounts[0]),
            containsA1: await instance.contains(otherAccounts[1]),
            containsA2: await instance.contains(otherAccounts[2]),
        };
        expect(after.first).to.be.eq(otherAccounts[2]);
        expect(after.last).to.be.eq(otherAccounts[1]);
        expect(after.containsA0).to.be.true;
        expect(after.containsA1).to.be.true;
        expect(after.containsA2).to.be.true;

        let state = await getCurrentState();
        expect(state).to.be.eql([
            otherAccounts[2],
            otherAccounts[0],
            otherAccounts[1],
        ]);
    });

    it("should prepend address in a middle", async () => {
        await (<any>instance).methods['prepend(address,address)'](otherAccounts[3], otherAccounts[0]);

        let state = await getCurrentState();
        expect(state).to.be.eql([
            otherAccounts[2],
            otherAccounts[3],
            otherAccounts[0],
            otherAccounts[1],
        ]);
    });

    it("should remove first address", async () => {
        await (<any>instance).methods['remove(address)'](otherAccounts[2]);

        let state = await getCurrentState();
        expect(state).to.be.eql([
            otherAccounts[3],
            otherAccounts[0],
            otherAccounts[1],
        ]);
    });

    it("should remove middle address", async () => {
        await (<any>instance).methods['remove(address)'](otherAccounts[0]);

        let state = await getCurrentState();
        expect(state).to.be.eql([
            otherAccounts[3],
            otherAccounts[1],
        ]);
    });

    it("should remove last address", async () => {
        await (<any>instance).methods['remove(address)'](otherAccounts[1]);

        let state = await getCurrentState();
        expect(state).to.be.eql([
            otherAccounts[3],
        ]);
    });

    it("should replace the only address", async () => {
        await (<any>instance).methods['replace(address,address)'](otherAccounts[3], otherAccounts[0]);

        let state = await getCurrentState();
        expect(state).to.be.eql([
            otherAccounts[0],
        ]);
    });

    it("should replace middle address", async () => {
        await (<any>instance).methods['append(address)'](otherAccounts[1]);
        await (<any>instance).methods['append(address)'](otherAccounts[2]);
        await (<any>instance).methods['append(address)'](otherAccounts[3]);

        let state = await getCurrentState();
        expect(state).to.be.eql([
            otherAccounts[0],
            otherAccounts[1],
            otherAccounts[2],
            otherAccounts[3],
        ]);

        await (<any>instance).methods['replace(address,address)'](otherAccounts[1], otherAccounts[4]);

        state = await getCurrentState();
        expect(state).to.be.eql([
            otherAccounts[0],
            otherAccounts[4],
            otherAccounts[2],
            otherAccounts[3],
        ]);
    });

    it("should not replace with already existing address", async () => {
        await expectRevert(
            (<any>instance).methods['replace(address,address)'](otherAccounts[4], otherAccounts[0]),
            "New element is already contained"
        );

    });

    it("should swap first with last", async () => {
        await (<any>instance).methods['swap(address,address)'](otherAccounts[0], otherAccounts[3]);

        let state = await getCurrentState();
        expect(state).to.be.eql([
            otherAccounts[3],
            otherAccounts[4],
            otherAccounts[2],
            otherAccounts[0],
        ]);

        await (<any>instance).methods['swap(address,address)'](otherAccounts[0], otherAccounts[3]);

        state = await getCurrentState();
        expect(state).to.be.eql([
            otherAccounts[0],
            otherAccounts[4],
            otherAccounts[2],
            otherAccounts[3],
        ]);
    });

    it("should swap neighboring elements", async () => {
        await (<any>instance).methods['swap(address,address)'](otherAccounts[4], otherAccounts[2]);

        let state = await getCurrentState();
        expect(state).to.be.eql([
            otherAccounts[0],
            otherAccounts[2],
            otherAccounts[4],
            otherAccounts[3],
        ]);

        await (<any>instance).methods['swap(address,address)'](otherAccounts[4], otherAccounts[2]);

        state = await getCurrentState();
        expect(state).to.be.eql([
            otherAccounts[0],
            otherAccounts[4],
            otherAccounts[2],
            otherAccounts[3],
        ]);
    });

    async function getCurrentState():Promise<string[]>{
        let maxElements = 15;
        let state:string[] = [];
        let next = await instance.first();
        let i = 0;
        while(next != "0x0000000000000000000000000000000000000000" && i <= maxElements){
            state.push(next);
            next = await instance.next(next);
            i++
        }
        return state;
    }

});
