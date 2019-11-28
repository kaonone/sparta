import { BondingCurveInstance } from "../types/truffle-contracts/index";
// tslint:disable-next-line:no-var-requires
const {BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should;
const expect = require("chai").expect;
const w3random = require("./utils/w3random");
const round10 = require("./utils/roundTools").round10;
const COMPARE_PRECISION = 7;

const BondingCurve = artifacts.require("BondingCurve");

contract("BondingCurve", async ([_, owner, ...otherAccounts]) => {
    let curve: BondingCurveInstance;
    let curveA:number, curveB:number, withdrawFee:number; //Curve parameters (constants)
  
    beforeEach(async () => {
        curve = await BondingCurve.new();
        curveA = (await curve.CURVE_A()).toNumber();
        curveB = (await curve.CURVE_B()).toNumber();
        let withdrawFeePercent = (await curve.WITHDRAW_FEE_PERCENT()).toNumber();
        let percentDivider = 100;
        withdrawFee = withdrawFeePercent/percentDivider;
    });

    it("should correctly calculate curve", async () => {
        let sWei = w3random.interval(1, 1000000000, 'ether');
        let s = Number(web3.utils.fromWei(sWei));
        //console.log("s = ", s, sWei.toString());
        let resultWei = await curve.curveFunction(sWei);
        let result = Number(web3.utils.fromWei(resultWei));
        //console.log("result = ", result, resultWei.toString());
        let expected = curveFunction(s);
        //console.log("expected = ", expected);
        expect(roundP(result)).to.equal(roundP(expected));
    });
    it("should correctly calculate enter", async () => {
        let amountWei = w3random.interval(1, 100000, 'ether');
        let liquidAssetsWei = w3random.interval(1, 1000000000, 'ether');
        let debtCommitmentsWei = w3random.interval(1, 1000000000, 'ether');

        let amount = Number(web3.utils.fromWei(amountWei));
        let liquidAssets = Number(web3.utils.fromWei(liquidAssetsWei));
        let debtCommitments = Number(web3.utils.fromWei(debtCommitmentsWei));
        // console.log("amount = ", amount, amountWei.toString());
        // console.log("liquidAssets = ", liquidAssets, liquidAssetsWei.toString());
        // console.log("debtCommitments = ", debtCommitments, debtCommitmentsWei.toString());

        let resultWei = await curve.calculateEnter(liquidAssetsWei, debtCommitmentsWei, amountWei);
        let result = Number(web3.utils.fromWei(resultWei));
        //console.log("result = ", result, resultWei.toString());

        // let A_plus_depo_Wei =liquidAssetsWei.add(debtCommitmentsWei).add(amountWei);
        // let A_plus_depo = liquidAssets+debtCommitments+amount;
        // console.log('A_plus_depo = ', A_plus_depo, A_plus_depo_Wei.toString());
        // let curve_Ad_Wei = await curve.curveFunction(A_plus_depo_Wei);
        // let curve_Ad = curveFunction(A_plus_depo);
        // console.log('curve = ', curve_Ad, curve_Ad_Wei.toString());


        let expected = curveEnter(liquidAssets, debtCommitments, amount);
        expect(roundP(result)).to.equal(roundP(expected));
    });
    it("should correctly calculate exit", async () => {
        let amountWei = w3random.interval(1, 100000, 'ether');
        let liquidAssetsWei = w3random.interval(1, 1000000000,'ether');

        let amount = Number(web3.utils.fromWei(amountWei));
        let liquidAssets = Number(web3.utils.fromWei(liquidAssetsWei));

        let resultWei = await curve.calculateExit(liquidAssetsWei, amountWei);
        let result = Number(web3.utils.fromWei(resultWei));
        let expected = curveExit(liquidAssets, amount);
        expect(roundP(result)).to.equal(roundP(expected));
    });

    function roundP(x:number):number {
        return round10(x, COMPARE_PRECISION);
    }

    // Functions bellow are defined in a "What is Savings and Uncollateralized Lending Pool" document
    // in a "Bonding Curve Mechanics" section

    /**
     * Bonding curve
     * f(S) = [-a+sqrt(a^2+4bS)]/2, a>0, b>0
     */
    function curveFunction(S:number): number {
        let a = curveA;
        let b = curveB;
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
    function curveExit(L:number, x:number): number {
        let d = withdrawFee;
        return (1+d) * (curveFunction(L) - curveFunction (L - x));
    }
});
