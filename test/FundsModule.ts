import {FundsModuleContract, FundsModuleInstance, PoolContract, PoolInstance } from "../types/truffle-contracts/index";
// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();

const Pool = artifacts.require("Pool");

const FundsModule = artifacts.require("FundsModule");

contract("FundsModule", async ([_, owner, ...otherAccounts]) => {
    let pool: PoolInstance;
    let funds: FundsModuleInstance; 
  
    beforeEach(async () => {
        pool = await Pool.new();
        await pool.initialize(owner, {from: owner});

        funds = await FundsModule.new();
        await (<any> funds).methods['initialize(address,address,address,address)'](owner, pool.address, constants.ZERO_ADDRESS, constants.ZERO_ADDRESS, {from: owner});
    });
  
    // it('should allow deposit if no debts', async () => {
    // });
    // it('should not allow deposit if there are debts', async () => {
    // });
    // it('should allow withdraw if no debts', async () => {
    // });
    // it('should not allow withdraw if there are debts', async () => {
    // });
    // it('should create several debt proposals and lock user tokens', async () => {
    // });
    // it('should create pledge in debt proposal', async () => {
    // });
    // it('should withdraw pledge in debt proposal', async () => {
    // });
    // it('should borrow for successful debt proposal', async () => {
    // });
    // it('should repay debt', async () => {
    // });
    // it('should partially redeem pledge from debt', async () => {
    // });
    // it('should fully redeem pledge from fully paid debt (without partial redeem)', async () => {
    // });
    // it('should fully redeem pledge from fully paid debt (after partial redeem)', async () => {
    // });

});
