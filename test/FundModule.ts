import { CompoundModuleInstance, FundsModuleInstance, PoolContract, PoolInstance } from "../types/truffle-contracts/index";
// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();

const Pool = artifacts.require("Pool");

const FundsModule = artifacts.require("FundsModule");

const CompoundModule = artifacts.require("CompoundModule");

contract("FundsModule", async ([_, owner, ...otherAccounts]) => {
    let pool: PoolInstance;
    let funds: FundsModuleInstance; 
    let compound: CompoundModuleInstance;
  
    beforeEach(async () => {
        pool = await Pool.new();
        await pool.initialize(owner, {from: owner});

        funds = await FundsModule.new();
        await funds.initialize(owner, constants.ZERO_ADDRESS, constants.ZERO_ADDRESS, {from: owner});
    });
  
    it("should set module to pool", async () => {
        await pool.set("funds", funds.address, true, {from: owner});  
        (await pool.contains(funds.address)).should.equal(true);
    });
  
    it("should get next module", async () => {
        compound = await CompoundModule.new();
        await compound.initialize(owner, {from: owner});
        await pool.set("funds", funds.address, true, {from: owner}); 
        await pool.set("compound", compound.address, true, {from: owner});
        (await pool.next(funds.address)).should.equal(compound.address);
    });
});
