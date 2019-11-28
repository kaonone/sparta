import { BondingCurveInstance } from "../types/truffle-contracts/index";
// tslint:disable-next-line:no-var-requires
const {BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should;
const expect = require("chai").expect;
const w3random = require("./utils/w3random");

const BondingCurve = artifacts.require("BondingCurve");

contract("BondingCurve", async ([_, owner, ...otherAccounts]) => {
    let curve: BondingCurveInstance;
    let curveA:number, curveB:number, withdrawFee:number; //Curve parameters (constants)
  
    beforeEach(async () => {
        curve = await BondingCurve.new();
        curveA = await curve.CURVE_A();
        curveB = await curve.CURVE_B();
        let withdrawFeePercent = await curve.WITHDRAW_FEE_PERCENT();
        let percentDivider = await curve.PERCENT_DIVIDER();
        withdrawFee = withdrawFeePercent/percentDivider;
    });

    it("should correctly calculate curve", async () => {
        let s = w3random.interval(1, 1000000000);
        let result = await curve.curveFunction(s);
        let expected = Math.round(curveFunction(curveA, curveB, s.toNumber()));
        expect(result).to.equal(expected);
    });
    it("should correctly calculate enter", async () => {
        let amount = w3random.interval(1, 100000);
        let liquidAssets = w3random.interval(1, 1000000000);
        let debtCommitments = w3random.interval(1, 1000000000);
        let result = await curve.calculateEnter(liquidAssetss.toNumber(), debtCommitmentss.toNumber(), amounts.toNumber());
        let expected = curveEnter(liquidAssets, debtCommitmentss, amount);
        expect(result).to.equal(expected);
    });
    it("should correctly calculate exit", async () => {
        let amount = w3random.interval(1, 100000);
        let liquidAssets = w3random.interval(1, 1000000000);
        let result = await curve.curveExit(liquidAssetss.toNumber(), amounts.toNumber());
        let expected = curveEnter(liquidAssets, withdrawFee, amount);
        expect(result).to.equal(expected);
    });

    // Functions bellow are defined in a "What is Savings and Uncollateralized Lending Pool" document
    // in a "Bonding Curve Mechanics" section

    /**
     * Bonding curve
     * f(S) = [-a+sqrt(a^2+4bS)]/2, a>0, b>0
     */
    function curveFunction(a:number, b:number, S:number): number {
        return (-1*a + Math.sqrt(a*a + 4*b*S))/2;
    }

    /**
     * Calculate amount of pTokens returned when DAI deposited
     * L - liquid assets in Pool
     * debt - debt commitments
     * x - Amount of DAI beeing deposited
     *
     * dx = f(A + Deposit) - f(A)
     * A - A is the volume of  total assets (liquid assets in Pool + debt commitments), 
     */
    function curveEnter(L:number, debt:number, x:number): number {
        let A = L + debt;
        return curveFunction(A + x) - curveFunction(A);
    }

    /**
     * Calculate amount of pTokens to send to whithdraw DAI 
     * L - liquid assets in Pool
     * d - withdraw fee
     * x - Amount of DAI beeing withdrawn
     *
     * dx = (1+d)*(f(L) - f(L - Whidraw))
     * L is the volume of liquid assets
     */
    function curveExit(L:number, d:number, x:number): number {
        return (1+d) * (curveFunction(L) - curveFunction (L - x));
    }
});
