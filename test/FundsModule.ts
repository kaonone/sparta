import { CompoundModuleInstance, FundsModuleInstance, PoolContract, PoolInstance } from "../types/truffle-contracts/index";
// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();

const Pool = artifacts.require("Pool");

const FundsModule = artifacts.require("FundsModule");

contract("FundsModule", async ([_, owner, ...otherAccounts]) => {
    let pool: PoolInstance;
    let funds: FundsModuleInstance; 
    let compound: CompoundModuleInstance;
  
    beforeEach(async () => {
        pool = await Pool.new();
        await pool.initialize(owner, {from: owner});

        funds = await FundsModule.new();
        await (<any> funds).methods['initialize(address,address)'](owner, constants.ZERO_ADDRESS, constants.ZERO_ADDRESS, {from: owner});
    });
  
});
