import { 
    PoolContract, PoolInstance, 
    CurveModuleContract, CurveModuleInstance 
} from "../types/truffle-contracts/index";
// tslint:disable-next-line:no-var-requires
const {BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should;
const expect = require("chai").expect;

const Pool = artifacts.require("Pool");
const CurveModule = artifacts.require("CurveModule");

contract("CurveModule", async ([_, owner, ...otherAccounts]) => {
    let pool: PoolInstance;
    let curve: CurveModuleInstance;
  
    beforeEach(async () => {
        //Setup system contracts
        pool = await Pool.new();
        await pool.initialize({from: owner});

        curve = await CurveModule.new();
        await (<any> curve).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set('curve', curve.address, false, {from: owner});
    });


});
