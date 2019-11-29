import { TestSQRTInstance } from "../types/truffle-contracts/index";
// tslint:disable-next-line:no-var-requires
const {BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
var should = require("chai").should;
var expect = require("chai").expect;
const w3random = require("./utils/w3random");

const TestSQRT = artifacts.require("TestSQRT");

contract("ISQRT", async ([_, owner, ...otherAccounts]) => {
    let instance: TestSQRTInstance;
    //let testRnd = new BN('1296000000000000000000'); 
    //let testRnd = new BN('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFE');//constants.MAX_UINT256;
    let testRnd = w3random.bn();
  
    beforeEach(async () => {
        instance = await TestSQRT.new();
    });

    it("should calculate sqrtBitByBit: gas usage", async () => {
        let receipt = await instance.setSqrtBitByBit(testRnd);
        let sqrt = await instance.sqrt();
        //console.log('sqrt2('+testRnd.toString()+') = '+sqrt.toString());
    });
    it("should calculate sqrtBabylonian: gas usage", async () => {
        let receipt = await instance.setSqrtBabylonian(testRnd);
        let sqrt = await instance.sqrt();
        //console.log('sqrtB('+testRnd.toString()+') = '+sqrt.toString());
    });
    
    it("should calculate correct sqrtBitByBit", async () => {
        //let x = new BN('1296');
        let x = w3random.bn();
        let r = await instance.sqrtBitByBit(x);
        //console.log('sqrt2('+x.toString()+') = '+r.toString());
        let rsq = r.mul(r);
        let r1 = r.add(new BN(1));
        let rsq1 = r1.mul(r1);
        expect(rsq).to.be.bignumber.lte(x);
        expect(rsq1).to.be.bignumber.gt(x);
    });

    it("should calculate correct sqrtBabylonian", async () => {
        //let x = new BN('1296');
        let x = w3random.bn();
        let r = await instance.sqrtBabylonian(x);
        //console.log('sqrtB('+x.toString()+') = '+r.toString());
        let rsq = r.mul(r);
        let r1 = r.add(new BN(1));
        let rsq1 = r1.mul(r1);
        expect(await rsq).to.be.bignumber.lte(x);
        expect(await rsq1).to.be.bignumber.gt(x);
    });

});
