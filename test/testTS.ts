import { TestSQRTInstance } from "../types/truffle-contracts/index";

const {Web3, BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
const should = require("chai").should;
const expect = require("chai").expect;

const TestSQRT = artifacts.require("TestSQRT");

contract("TestTS", async ([_, owner, ...otherAccounts]) => {
    let isqrt: TestSQRTInstance;
  
    beforeEach(async () => {
        isqrt = await TestSQRT.new();
    });

    it("web3.utils should be available", async () => {
        let t = web3.utils.toWei('1', 'ether');
        //console.log(t);
    });

    it("BN should be mapped to bn.js", async () => {
        let t = new BN('1');
        let r = t.add(new BN('2'));    //There is no add() in BigNumber.js
        //console.log('1 + 2 = ',r.toNumber());
    });
    it("Result of contract call should be BN, not BigNumber", async () => {
        let val = 16;
        let t = await isqrt.sqrtBabylonian(val);
        //console.log('sqrtBabylonian('+val+') = ', t)
        let r = t.add(new BN('2'));    //There is no add() in BigNumber.js
        //console.log('sqrt('+val+') + 2 = ',r.toNumber());
    });

});
