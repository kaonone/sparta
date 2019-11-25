"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();
const Pool = artifacts.require("Pool");
contract("Pool", async ([_, owner, wallet1, wallet2, wallet3, wallet4, wallet5]) => {
    let pool;
    beforeEach(async () => {
        pool = await Pool.new();
        await pool.initialize(owner, { from: owner });
        const address = await pool.owner();
        await pool.setMetadata("creditPool", "Great Pool", { from: address });
    });
    it("should have proper owner", async () => {
        const address = await pool.owner();
        (await pool.founder()).should.equal(address);
    });
    it("should have proper name", async () => {
        (await pool.name()).should.equal("creditPool");
    });
    it("should have  proper description", async () => {
        (await pool.description()).should.equal("Great Pool");
    });
});
//# sourceMappingURL=Pool.js.map