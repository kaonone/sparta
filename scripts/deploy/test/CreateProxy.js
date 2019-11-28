"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Required by @openzeppelin/upgrades when running from truffle
global.artifacts = artifacts;
global.web3 = web3;
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();
// tslint:disable-next-line:no-var-requires
const { TestHelper } = require("@openzeppelin/cli");
// tslint:disable-next-line:no-var-requires
const { Contracts, ZWeb3 } = require("@openzeppelin/upgrades");
ZWeb3.initialize(web3.currentProvider);
const Pool = Contracts.getFromLocal("Pool");
const PoolContract = artifacts.require("Pool");
contract("Create Proxy", async ([_, owner, ...otherAccounts]) => {
    let project;
    let creatorAddress;
    let initializerAddress;
    beforeEach(async () => {
        project = await TestHelper();
        [creatorAddress, initializerAddress] = await ZWeb3.accounts();
    });
    it("should create proxy", async () => {
        const proxy = await project.createProxy(Pool, { initMethod: "initialize",
            // tslint:disable-next-line:object-literal-sort-keys
            initArgs: [owner], from: creatorAddress });
        const pool = await PoolContract.at(proxy.address);
        await pool.setMetadata("creditPool", "Great Pool", { from: creatorAddress });
        (await pool.owner()).should.equal(owner);
    });
});
//# sourceMappingURL=CreateProxy.js.map