import { TestSQRTInstance } from "../types/truffle-contracts/index";
// tslint:disable-next-line:no-var-requires
const {BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
var should = require("chai").should;
var expect = require("chai").expect;

const TestSQRT = artifacts.require("TestSQRT");

contract("ISQRT", async ([_, owner, ...otherAccounts]) => {
    let instance: TestSQRTInstance;
    //let testRnd = new BN('1296000000000000000000'); 
    let testRnd = getRandomBN();
  
    beforeEach(async () => {
        instance = await TestSQRT.new();
    });

    it("should calculate sqrt2 - testing gas usage", async () => {
        let receipt = await instance.setSqrt2(testRnd);
        let sqrt = await instance.sqrt();
        //console.log('sqrt2('+testRnd.toString()+') = '+sqrt.toString());
    });
    it("should calculate sqrtB - testing gas usage", async () => {
        let receipt = await instance.setSqrtB(testRnd);
        let sqrt = await instance.sqrt();
        //console.log('sqrtB('+testRnd.toString()+') = '+sqrt.toString());
    });
    
    it("should calculate correct sqrt2", async () => {
        //let x = new BN('1296');
        let x = getRandomBN();
        let r:any = await instance.sqrt2(x);
        //console.log('sqrt2('+x.toString()+') = '+r.toString());
        let rsq = r.mul(r);
        let r1 = r.add(new BN(1));
        let rsq1 = r1.mul(r1);
        expect(rsq).to.be.bignumber.lte(x);
        expect(rsq1).to.be.bignumber.gt(x);
    });

    it("should calculate correct sqrtB", async () => {
        //let x = new BN('1296');
        let x = getRandomBN();
        let r:any = await instance.sqrtB(x);
        //console.log('sqrtB('+x.toString()+') = '+r.toString());
        let rsq = r.mul(r);
        let r1 = r.add(new BN(1));
        let rsq1 = r1.mul(r1);
        expect(await rsq).to.be.bignumber.lte(x);
        expect(await rsq1).to.be.bignumber.gt(x);
    });
    function getRandomBN() {
        let w3:any = web3;
        return new BN(w3.utils.randomHex(32));
    }

});
