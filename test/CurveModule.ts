import { 
    PoolContract, PoolInstance, 
    CurveModuleContract, CurveModuleInstance 
} from "../types/truffle-contracts/index";
// tslint:disable-next-line:no-var-requires
const {BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should;
const expect = require("chai").expect;
const w3random = require("./utils/w3random");
const expectEqualFloat = require("./utils/expectEqualFloat");

const Pool = artifacts.require("Pool");
const CurveModule = artifacts.require("CurveModule");

contract("CurveModule", async ([_, owner, ...otherAccounts]) => {
    let pool: PoolInstance;
    let curve: CurveModuleInstance;
    let curveA:number, curveB:number, withdrawFee:number; //Curve parameters (constants)
  
    beforeEach(async () => {
        curveA = 1;
        curveB = 1;
        let percentDivider = 100;
        let withdrawFeePercentDefault = 5;

        //Setup system contracts
        pool = await Pool.new();
        await (<any> pool).methods['initialize()']({from: owner});

        curve = await CurveModule.new();
        await (<any> curve).methods['initialize(address)'](pool.address, {from: owner});
        await pool.set('curve', curve.address, false, {from: owner});

        await curve.setWithdrawFee(withdrawFeePercentDefault, {from: owner});
        let withdrawFeePercent = await curve.withdrawFeePercent();
        expect(withdrawFeePercent.toNumber()).to.be.equal(withdrawFeePercentDefault);
        withdrawFee = withdrawFeePercent.toNumber()/percentDivider;
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

        let expected = curveExitInverseWithFee(liquidAssets, pAmount);
        //console.log('expected', expected);

        let lAmountWei = await curve.calculateExitInverseWithFee(liquidAssetsWei, pAmountWei);
        let lAmountT = Number(web3.utils.fromWei(lAmountWei[0]));
        let lAmountU = Number(web3.utils.fromWei(lAmountWei[1]));
        let lAmountP = Number(web3.utils.fromWei(lAmountWei[2]));
        //console.log("lAmount = ", lAmountWei, lAmount);
        expectEqualFloat(lAmountT, expected[0]);
        expectEqualFloat(lAmountU, expected[1]);
        expectEqualFloat(lAmountP, expected[2]);
    });


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
     * Calculate amount of DAI to whithdraw when pTokens sent
     * L - liquid assets in Pool
     * dx - Amount of pToken sent
     *
     * Withdraw = L-g(x-dx)
     * x = f(L)
     * dx - amount of pTokens taken from user
     */
    function curveExitInverse(L:number, dx:number): number {
        let withdraw = L - inverseCurveFunction(curveFunction(L) - dx)
        return withdraw;
    }
    /**
     * WithdrawU = Withdraw*(1-withdrawFee)
     * WithdrawP = Withdraw*withdrawFee
     */
    function curveExitInverseWithFee(L:number, dx:number): [number, number, number] {
        let withdraw = curveExitInverse(L, dx);
        let fee = withdrawFee;
        let withdrawU = withdraw*(1-fee);
        let withdrawP = withdraw*fee;
        return [withdraw, withdrawU, withdrawP];
    }

});
