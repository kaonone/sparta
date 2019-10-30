import { CoreContract, CoreInstance, FundsModuleInstance, CompoundModuleInstance } from "../types/truffle-contracts/index";
// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();

const Core = artifacts.require("Core");

const FundsModule = artifacts.require("FundsModule");

const CompoundModule = artifacts.require("CompoundModule");

contract("FundsModule", async ([_, owner, ...otherAccounts]) => {
    let pool: CoreInstance;
    let funds: FundsModuleInstance; 
    let compound: CompoundModuleInstance;
  
    beforeEach(async () => {
        pool = await Core.new();
        await pool.initialize();

        funds = await FundsModule.new();
        await funds.initialize({ from: owner });
    });
  
    it("should set module to pool", async () => {
        await pool.set("funds", funds.address, true);  
        (await pool.contains(funds.address)).should.equal(true);
    });
  
    it("should get next module", async () => {
        compound = await CompoundModule.new();
        await compound.initialize({ from: owner });  
        await pool.set("funds", funds.address, true); 
        
        await pool.set("compound", compound.address, true);
        (await pool.contains(compound.address)).should.equal(true);
    });
});
