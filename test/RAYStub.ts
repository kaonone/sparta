import { 
    FreeDAIContract, FreeDAIInstance,
    RAYStubContract, RAYStubInstance 
} from "../types/truffle-contracts/index";

// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, expectRevert, shouldFail, time } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();
var expect = require("chai").expect;
const w3random = require("./utils/w3random");
const expectEqualBN = require("./utils/expectEqualBN");
const findEventArgs = require("./utils/findEventArgs");

const FreeDAI = artifacts.require("FreeDAI");
const RAYStub = artifacts.require("RAYStub");

contract("RAYStub", async ([_, owner, user, ...otherAccounts]) => {
    const RAY_PORTFOLIO_ID = '0xcd93cf275bcc8c600887dc587ea0a16e8f0a87fa7f99560f72186069c8d3b3df';
    let dai: FreeDAIInstance;
    let ray: RAYStubInstance;
    let rayTokenId: string;
  
    before(async () => {
        dai = await FreeDAI.new();
        await (<any> dai).methods['initialize()']({from: owner});

        ray = await RAYStub.new();
        await (<any> ray).methods['initialize(address)'](dai.address, {from: owner});
    });

    it("should mint RAY token ", async () => {
        let result = await ray.mint(RAY_PORTFOLIO_ID, user, 0, {from:user});
        let transferData = findEventArgs(result, 'Transfer');
        let rayTokenIdBN = transferData.tokenId;
        expect(rayTokenIdBN).to.be.bignumber.gt(new BN(0));
        rayTokenId = "0x"+rayTokenIdBN.toString('hex', 64);
    });

    it("should deposit DAI to RAY token", async () => {
        let amount = w3random.interval(100, 1000, 'ether');
        await (<any> dai).methods['mint(uint256)'](amount, {from: user});
        dai.approve(ray.address, amount, {from: user});

        let before = {
            userDaiBalance: await dai.balanceOf(user),
            rayDaiBalance: await dai.balanceOf(ray.address),
            userRayBalance: (await ray.getTokenValueStub(rayTokenId))[0]
        };
        expect(before.userDaiBalance).to.be.bignumber.gte(amount);

        let receipt = await ray.deposit(rayTokenId, amount, {from: user});

        let after = {
            userDaiBalance: await dai.balanceOf(user),
            rayDaiBalance: await dai.balanceOf(ray.address),
            userRayBalance: (await ray.getTokenValueStub(rayTokenId))[0]
        };

        expect(before.userDaiBalance.sub(after.userDaiBalance)).to.be.bignumber.eq(amount);
        expect(after.rayDaiBalance.sub(before.rayDaiBalance)).to.be.bignumber.eq(amount);
        expectEqualBN(after.userRayBalance.sub(before.userRayBalance), amount, 18, -5); //Inaccuracy may be caused by time passed between requests
    });


    it("should redeem DAI from RAY token", async () => {
        let before = {
            userDaiBalance: await dai.balanceOf(user),
            userRayBalance: (await ray.getTokenValueStub(rayTokenId))[0]
        };
        expect(before.userRayBalance).to.be.bignumber.gt(new BN(0));

        let amount = w3random.intervalBN(before.userRayBalance.divn(3), before.userRayBalance.divn(2));

        let receipt = await ray.redeem(rayTokenId, amount, user, {from: user});

        let after = {
            userDaiBalance: await dai.balanceOf(user),
            userRayBalance: (await ray.getTokenValueStub(rayTokenId))[0]
        };
        expect(before.userDaiBalance.add(after.userDaiBalance)).to.be.bignumber.eq(amount);
        expectEqualBN(before.userRayBalance.sub(after.userRayBalance), amount, 18, -5); //Inaccuracy may be caused by time passed between requests
    });

});
