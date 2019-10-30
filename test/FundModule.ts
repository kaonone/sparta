import { CoreContract, CoreInstance, FundsModuleInstance } from '../types/truffle-contracts/index';
// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();

const Core = artifacts.require("Core");

const FundsModule = artifacts.require("FundsModule");

const CompoundModule = artifacts.require("CompoundModule");

contract("CoreFactory", async ([_, owner, ...otherAccounts]) => {
    let pool: CoreInstance;
    let funds: FundsModuleInstance; 
  
    beforeEach(async () => {
        pool = await Core.new();
        await pool.initialize({ from: owner });

        funds = await FundsModule.new();
        await funds.initialize({ from: owner });
    });
  
    it("should set module to pool", async () => {
        await pool.set("funds", funds.address, true, { from: owner });  
        (await pool.contains(funds.address)).should.equal(true);
    });
  
    it("should get next module", async () => {
      await pool.set("funds", funds.address, true, { from: owner });  
      (await pool.contains(funds.address)).should.equal(true);
    });
});
