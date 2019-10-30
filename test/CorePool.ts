import { CoreContract, CoreInstance} from "../types/truffle-contracts/index";
// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();

const Core = artifacts.require("Core");

contract("CoreFactory", async ([_, owner, ...otherAccounts]) => {
    let pool: CoreInstance;
  
    beforeEach(async () => {
        pool = await Core.new();
        await pool.initialize({ from: owner });
        await pool.setMetadata("creditPool", "Great Pool");
    });

    it("should have proper owner", async () => {
        (await pool.owner()).should.equal(owner);
    });
    
    it("should have proper name", async () => {
        (await pool.name()).should.equal("creditPool");
    });

    it("should have  proper description", async () => {
        (await pool.description()).should.equal("Great Pool");
    });
});
