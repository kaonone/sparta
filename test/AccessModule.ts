import { 
    PoolContract, PoolInstance, 
    AccessModuleContract, AccessModuleInstance
} from "../types/truffle-contracts/index";

// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, shouldFail, time } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
import Snapshot from "./utils/snapshot";
const should = require("chai").should();
var expect = require("chai").expect;
const expectRevert= require("./utils/expectRevert");
const expectEqualBN = require("./utils/expectEqualBN");
const w3random = require("./utils/w3random");

const Pool = artifacts.require("Pool");
const AccessModule = artifacts.require("AccessModule");
contract("AccessModule", async ([_, owner, ...otherAccounts]) => {
    let snap: Snapshot;
    let pool: PoolInstance;
    let access: AccessModuleInstance;

    enum Operation {
        // LiquidityModule
        Deposit,
        Withdraw,
        // LoanModule
        CreateDebtProposal,
        AddPledge,
        WithdrawPledge,
        CancelDebtProposal,
        ExecuteDebtProposal,
        Repay,
        ExecuteDebtDefault,
        WithdrawUnlockedPledge
    }
    const alwaysAllowedOps = [Operation.Repay, Operation.WithdrawUnlockedPledge];

    before(async () => {
        //Setup system contracts
        pool = await Pool.new();
        await (<any> pool).methods['initialize()']({from: owner});

        access = await AccessModule.new();
        await (<any> access).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set('access', access.address, false, {from: owner});

        //Save snapshot
        snap = await Snapshot.create(web3.currentProvider);
    });

    beforeEach(async () => {
        //await snap.revert();
    });

    it('should not enable/disable whitelist from unauthorized user', async () => {
        await expectRevert(
            access.enableWhitelist({from:otherAccounts[0]}),
            'WhitelistAdminRole: caller does not have the WhitelistAdmin role'
        );
        await expectRevert(
            access.disableWhitelist({from:otherAccounts[0]}),
            'WhitelistAdminRole: caller does not have the WhitelistAdmin role'
        );
    });
    it('should enable/disable whitelist', async () => {
        let recept = await access.enableWhitelist({from:owner});
        expectEvent(recept, 'WhitelistEnabled');
        expect(await access.whitelistEnabled()).to.be.true;

        recept = await access.disableWhitelist({from:owner});
        expectEvent(recept, 'WhitelistDisabled');
        expect(await access.whitelistEnabled()).to.be.false;
    });
    it('should corectly handle not whitelisted user', async () => {
        await access.enableWhitelist({from:owner});

        let ops = Object.values(Operation).filter(o => (typeof o === "string"));
        for(let opName of ops){
            let op:number = (<any>Operation)[opName];
            let allowed = await access.isOperationAllowed(op, otherAccounts[0]);
            if(alwaysAllowedOps.includes(op)){
                expect(allowed, `Operation ${opName} (${op}) should be allways allowed`).to.be.true;
            }else{
                expect(allowed, `Operation ${opName} (${op}) should not be allowed`).to.be.false;
            }
        }
    });
    it('should allow all to whitelisted user', async () => {
        await access.enableWhitelist({from:owner});
        await access.addWhitelisted(otherAccounts[1], {from:owner});

        let ops = Object.values(Operation).filter(o => (typeof o === "string"));
        for(let opName of ops){
            let op:number = (<any>Operation)[opName];
            let allowed = await access.isOperationAllowed(op, otherAccounts[1]);
            expect(allowed, `Operation ${opName} (${op}) should be allowed to whitelisted`).to.be.true;
        }
    });

});