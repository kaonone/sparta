import { BondingCurveInstance } from "../types/truffle-contracts/index";
// tslint:disable-next-line:no-var-requires
const {BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should;
const expect = require("chai").expect;
const w3random = require("./utils/w3random");
const round10 = require("./utils/roundTools").round10;
const COMPARE_PRECISION = -7;

const BondingCurve = artifacts.require("BondingCurve");

contract("BondingCurve", async ([_, owner, ...otherAccounts]) => {
    let curve: BondingCurveInstance;
    let curveA:number, curveB:number, withdrawFee:number; //Curve parameters (constants)
  
    beforeEach(async () => {
        curveA = 1;
        curveB = 1;
        let withdrawFeePercent = 5;
        let percentDivider = 100;
        withdrawFee = withdrawFeePercent/percentDivider;

        curve = await BondingCurve.new();
        curve.initialize(curveA, curveB, withdrawFeePercent);
    });

    it("should correctly calculate curve", async () => {
        let sWei = w3random.interval(1, 100000000, 'ether');
        let s = Number(web3.utils.fromWei(sWei));
        //console.log("s = ", s, sWei.toString());
        let resultWei = await curve.curveFunction(sWei);
        let result = Number(web3.utils.fromWei(resultWei));
        //console.log("result = ", resultWei.toString(), result);
        let expected = curveFunction(s);
        //console.log("expected = ", expected);
        expect(roundP(result)).to.equal(roundP(expected));
    });
    it("should correctly calculate inverse curve", async () => {
        let xWei = w3random.interval(1, 100000, 'ether');
        let x = Number(web3.utils.fromWei(xWei));
        //console.log("x = ", x, xWei.toString());
        let resultWei = await curve.inverseCurveFunction(xWei);
        let result = Number(web3.utils.fromWei(resultWei));
        //console.log("result = ", resultWei.toString(), result);
        let expected = inverseCurveFunction(x);
        //console.log("expected = ", expected);
        expect(roundP(result)).to.equal(roundP(expected));
    });
    it("should match curve and inverse curve", async () => {
        for(let i=0; i<3; i++){    //Compare 3 random points
            let xWei = w3random.interval(1, 100000, 'ether');
            let cWei = await curve.curveFunction(xWei);
            let icWei = await curve.inverseCurveFunction(cWei);
            expect(icWei.sub(xWei)).to.be.bignumber.lt(new BN(10).pow(new BN(18-COMPARE_PRECISION)));

            let x = Number(web3.utils.fromWei(xWei));
            let c = curveFunction(x);
            let ic = inverseCurveFunction(c);
            expect(roundP(ic)).to.be.equal(roundP(x));
        }
    });
    it("should correctly calculate enter", async () => {
        let amountWei = w3random.interval(1, 100000, 'ether');
        let liquidAssetsWei = w3random.interval(1, 1000000, 'ether');
        let debtCommitmentsWei = w3random.interval(1, 1000000, 'ether');

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

    it("should correctly calculate exit by pToken amount", async () => {
        let liquidAssetsWei = w3random.interval(100000, 1000000,'ether');
        let liquidAssets = Number(web3.utils.fromWei(liquidAssetsWei));
        //console.log("liquidAssets = ", liquidAssetsWei, liquidAssets);

        let maxPAmount = curveEnter(0, 0, liquidAssets-1);
        //console.log("maxPAmount = ", maxPAmount);
        let pAmountWei = w3random.interval(1, maxPAmount, 'ether');
        let pAmount = Number(web3.utils.fromWei(pAmountWei));
        //console.log("pAmount = ", pAmountWei, pAmount);

        let expected = curveExitInverse(liquidAssets, pAmount);
        //console.log('expected', expected);

        let lAmountWei = await curve.calculateExitInverse(liquidAssetsWei, pAmountWei);
        let lAmountT = Number(web3.utils.fromWei(lAmountWei[0]));
        let lAmountU = Number(web3.utils.fromWei(lAmountWei[1]));
        let lAmountP = Number(web3.utils.fromWei(lAmountWei[2]));
        //console.log("lAmount = ", lAmountWei, lAmount);
        expect(roundP(lAmountT)).to.equal(roundP(expected[0]));
        expect(roundP(lAmountU)).to.equal(roundP(expected[1]));
        expect(roundP(lAmountP)).to.equal(roundP(expected[2]));
    });

    it("should correctly calculate exit by liquid token amount", async () => {
        let liquidAssetsWei = w3random.interval(100000, 1000000,'ether');
        let liquidAssets = Number(web3.utils.fromWei(liquidAssetsWei));
        //console.log("liquidAssets = ", liquidAssetsWei, liquidAssets);

        let lAmountWei = w3random.interval(1, 100000, 'ether');
        let lAmount = Number(web3.utils.fromWei(lAmountWei));
        //console.log("lAmount = ", lAmountWei, lAmount);

        let expected = curveExit(liquidAssets, lAmount);
        //console.log("expected = ", expected);

        let pAmountWei = await curve.calculateExit(liquidAssetsWei, lAmountWei);
        let pAmount = Number(web3.utils.fromWei(pAmountWei));
        //console.log("pAmount = ", pAmountWei, pAmount);
        expect(roundP(pAmount)).to.equal(roundP(expected));
    });


    it("should calculate exit by liquid token and by pToken with same results", async () => {
        let liquidAssetsWei = w3random.interval(1, 1000000,'ether');
        let liquidAssets = Number(web3.utils.fromWei(liquidAssetsWei));

        let maxPAmount = curveEnter(0, 0, liquidAssets-1);
        let pAmountWei = w3random.interval(1, maxPAmount, 'ether');
        let pAmount = Number(web3.utils.fromWei(pAmountWei));
        // console.log('pAmount  = ', pAmountWei.toString(), pAmount);

        let lAmountWei = await curve.calculateExitInverse(liquidAssetsWei, pAmountWei);
        let lAmount = Number(web3.utils.fromWei(lAmountWei[0]));
        // console.log('lAmount  = ', lAmountWei.toString(), lAmount);

        let epAmountWei = await curve.calculateExit(liquidAssetsWei, lAmountWei[0]);
        let epAmount = Number(web3.utils.fromWei(epAmountWei));
        // console.log('epAmount = ', epAmountWei.toString(), epAmount);
        expect(roundP(epAmount)).to.equal(roundP(pAmount));
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
     * Inverse Bonding curve
     * S = g(x)=(x^2+ax)/b, a>0, b>0
     */
    function inverseCurveFunction(x:number): number {
        let a = curveA;
        let b = curveB;
        return (x*x + a*x)/b;
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
        return curveFunction(L) - curveFunction (L - x);
    }

    /**
     * Calculate amount of DAI to whithdraw when pTokens sent
     * L - liquid assets in Pool
     * d - withdraw fee
     * dx - Amount of pToken sent
     *
     * Withdraw = L-g(x-dx)
     * x = f(L)
     * dx - amount of pTokens taken from user
     * WithdrawU = Withdraw*(1-d)
     * WithdrawP = Withdraw*d
     */
    function curveExitInverse(L:number, dx:number): [number, number, number] {
        let d = withdrawFee;
        let withdraw = L - inverseCurveFunction(curveFunction(L) - dx)
        let withdrawU = withdraw*(1-d);
        let withdrawP = withdraw*d;
        return [withdraw, withdrawU, withdrawP];
    }
});
