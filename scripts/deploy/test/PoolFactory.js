"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();
const PoolFactory = artifacts.require("PoolFactory");
const Pool = artifacts.require("Pool");
contract("PoolFactory", async ([_, owner, ...otherAccounts]) => {
    let poolFactory;
    let pool;
    beforeEach(async () => {
        poolFactory = await PoolFactory.new();
        await poolFactory.initialize(owner, { from: owner });
        await poolFactory.create("creditPool", "Greate Pool");
        const poolAddress = await poolFactory.getLastContract();
        pool = await Pool.at(poolAddress);
    });
    it("should have proper owner", async () => {
        (await poolFactory.owner()).should.equal(owner);
    });
    it("should have pool with proper founder", async () => {
        const founder = poolFactory.address;
        (await pool.founder()).should.equal(founder);
    });
    it("should have pool with proper name", async () => {
        (await pool.name()).should.equal("creditPool");
    });
    it("should have pool with proper description", async () => {
        (await pool.description()).should.equal("Greate Pool");
    });
});
//# sourceMappingURL=PoolFactory.js.map