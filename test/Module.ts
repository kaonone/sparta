import { DefiModuleStubInstance, VotesModuleInstance, PoolContract, PoolInstance } from "../types/truffle-contracts/index";
// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();

const Pool = artifacts.require("Pool");

const VotesModule = artifacts.require("VotesModule");

const DefiModuleStub = artifacts.require("DefiModuleStub");

contract("Module", async ([_, owner, ...otherAccounts]) => {
    let pool: PoolInstance;
    let votes: VotesModuleInstance; 
    let defi: DefiModuleStubInstance;
  
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
        defi = await DefiModuleStub.new();
        await (<any> defi).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set("votes", votes.address, true, {from: owner}); 
        await pool.set("compound", defi.address, true, {from: owner});
        (await pool.next(votes.address)).should.equal(defi.address);
    });

    it("should get module by name", async () => {
        await pool.set("votes", votes.address, true, {from: owner});  
        (await pool.contains(votes.address)).should.equal(true);
    });
});
