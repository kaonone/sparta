import { CompoundModuleInstance, VotesModuleInstance, PoolContract, PoolInstance } from "../types/truffle-contracts/index";
// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();

const Pool = artifacts.require("Pool");

const VotesModule = artifacts.require("VotesModule");

const CompoundModule = artifacts.require("CompoundModule");

contract("Module", async ([_, owner, ...otherAccounts]) => {
    let pool: PoolInstance;
    let votes: VotesModuleInstance; 
    let compound: CompoundModuleInstance;
  
    beforeEach(async () => {
        pool = await Pool.new();
        await (<any> pool).methods['initialize()']({from: owner});

        votes = await VotesModule.new();
        await (<any> votes).methods['initialize(address)'](pool.address, {from: owner});
    });
  
    it("should set module to pool", async () => {
        await pool.set("votes", votes.address, true, {from: owner});  
        (await pool.contains(votes.address)).should.equal(true);
    });
  
    it("should get next module", async () => {
        compound = await CompoundModule.new();
        await (<any> compound).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("votes", votes.address, true, {from: owner}); 
        await pool.set("compound", compound.address, true, {from: owner});
        (await pool.next(votes.address)).should.equal(compound.address);
    });

    it("should get module by name", async () => {
        await pool.set("votes", votes.address, true, {from: owner});  
        (await pool.contains(votes.address)).should.equal(true);
    });
});
