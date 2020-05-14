import { 
    FreeDAIContract, FreeDAIInstance,
    PoolContract, PoolInstance, 
    PTokenContract, PTokenInstance, 
    CurveModuleContract, CurveModuleInstance,
    BaseFundsModuleContract, BaseFundsModuleInstance,
    LiquidityModuleContract, LiquidityModuleInstance,
    FlashLoansModuleContract, FlashLoansModuleInstance,
    FlashLoanReceiverStubContract, FlashLoanReceiverStubInstance
} from "../types/truffle-contracts/index";

// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, expectRevert, shouldFail, time } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();
var expect = require("chai").expect;
const w3random = require("./utils/w3random");
const expectEqualBN = require("./utils/expectEqualBN");

const FreeDAI = artifacts.require("FreeDAI");
const CErc20Stub = artifacts.require("CErc20Stub");
const Pool = artifacts.require("Pool");
const PToken = artifacts.require("PToken");
const CurveModule = artifacts.require("CurveModule");
const BaseFundsModule = artifacts.require("BaseFundsModule");
const LiquidityModule = artifacts.require("LiquidityModule");
const FlashLoansModule = artifacts.require("FlashLoansModule");
const FlashLoanReceiverStub = artifacts.require("FlashLoanReceiverStub");

contract("FlashLoansModule", async ([_, owner, user, ...otherAccounts]) => {
    let dai: FreeDAIInstance;
    let pool: PoolInstance;
    let pToken: PTokenInstance;
    let curve: CurveModuleInstance; 
    let funds: BaseFundsModuleInstance;
    let liqm: LiquidityModuleInstance; 
    let flashm: FlashLoansModuleInstance;
 
    let loanFee:BN, loanFeeMultiplier:BN;

    before(async () => {
        //Setup "external" contracts
        dai = await FreeDAI.new();
        await (<any> dai).methods['initialize()']({from: owner});

        //Setup system contracts
        pool = await Pool.new();
        await (<any> pool).methods['initialize()']({from: owner});

        pToken = await PToken.new();
        await (<any> pToken).methods['initialize(address)'](pool.address, {from: owner});

        curve = await CurveModule.new();
        await (<any> curve).methods['initialize(address)'](pool.address, {from: owner});

        funds = await BaseFundsModule.new();
        await (<any> funds).methods['initialize(address)'](pool.address, {from: owner});

        liqm = await LiquidityModule.new();
        await (<any> liqm).methods['initialize(address)'](pool.address, {from: owner});

        flashm = await FlashLoansModule.new();
        await (<any> flashm).methods['initialize(address)'](pool.address, {from: owner});

        await pool.set('ltoken', dai.address, false, {from: owner});
        await pool.set('ptoken', pToken.address, false, {from: owner});
        await pool.set('funds', funds.address, false, {from: owner});
        await pool.set("curve", curve.address, true, {from: owner});  
        await pool.set("liquidity", liqm.address, true, {from: owner});  
        await pool.set("flashloans", flashm.address, true, {from: owner});  
        await pToken.addMinter(funds.address, {from: owner});
        await funds.addFundsOperator(liqm.address, {from: owner});
        await funds.addFundsOperator(flashm.address, {from: owner});

        //Load info
        loanFee  = await (<any> flashm).methods['getLoanFee()']();
        loanFeeMultiplier = await flashm.LOAN_FEE_MULTIPLIER();

        //Add liquidity
        let amount = w3random.interval(100000, 1000000, 'ether');
        await (<any> dai).methods['mint(uint256)'](amount, {from: owner});
        dai.approve(funds.address, amount, {from: user});
        liqm.deposit(amount, 0, {from: owner});


    });

    it("should execute flashLoan", async () => {
        let amount = w3random.interval(100, 1000, 'ether');
        let expectedFee = amount.mul(loanFee).div(loanFeeMultiplier);

        let mintAmount = amount.divn(10);
        let expectedProfit = mintAmount.sub(expectedFee);
        let call = web3.eth.abi.encodeFunctionCall(
            {
              "type": "function",
              "name": "mint",
              "inputs": [{"name": "amount","type": "uint256"}]
            },
            [mintAmount]
        );
        let data = web3.eth.abi.encodeParameters(['address','uint256','bytes'], dai.address, 0, call);

        let flashr = await FlashLoanReceiverStub.new({from: user});

        let before = {
            userDai: await dai.balanceOf(user),
            poolDai: await dai.balanceOf(funds.address),
        };

        let receipt = await (<any>flashm).executeLoan(flashr.address, amount, data, {from: user});

        let after = {
            userDai: await dai.balanceOf(user),
            poolDai: await dai.balanceOf(funds.address),
        };

        expect(after.userDai).to.be.bignumber.eq(before.userDai.add(expectedProfit));
        expect(after.poolDai).to.be.bignumber.eq(before.poolDai.add(expectedFee));
    });

});
