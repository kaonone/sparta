import { BondingCurveInstance } from "../types/truffle-contracts/index";
// tslint:disable-next-line:no-var-requires
const {BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should;
const expect = require("chai").expect;

const BondingCurve = artifacts.require("BondingCurve");

contract("BondingCurve", async ([_, owner, ...otherAccounts]) => {
    let curve: BondingCurveInstance;
  
    beforeEach(async () => {
        curve = await BondingCurve.new();
    });


});
