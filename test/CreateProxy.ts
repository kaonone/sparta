// tslint:disable-next-line:no-reference
/// <reference path="../global.d.ts" />
// tslint:disable-next-line:import-spacing
import { PoolInstance } from "../types/truffle-contracts/index";

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

contract("Create Proxy", async ([_, owner,  ...otherAccounts]) => {

        let project: any;
        let creatorAddress: string;
    
        beforeEach(async () => {
            project = await TestHelper();
            creatorAddress = await ZWeb3.defaultAccount();
        });
    
        it("should create proxy", async () => {
            const proxy = await project.createProxy(Pool, { initMethod: "initialize",
                // tslint:disable-next-line:object-literal-sort-keys
                initArgs: [owner], from: creatorAddress 
            });
            const pool = await PoolContract.at(proxy.address);

            await pool.setMetadata("creditPool", "Great Pool",  {from: owner });
            (await pool.owner()).should.equal(owner);
        });
});
