import { PoolContract, PoolInstance} from "../types/truffle-contracts/index";
// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();

const Pool = artifacts.require("Pool");

contract("Pool", async ([_, owner,  wallet1, wallet2, wallet3, wallet4, wallet5]) => {
    let pool: PoolInstance;
  
    beforeEach(async () => {
        pool = await Pool.new();
        await (<any> pool).methods['initialize()']({from: owner});
        const address = await pool.owner();
        await pool.setMetadata("creditPool", "Great Pool",  {from: address});
    });

    it("should have proper owner", async () => {
        const address = await pool.owner();
        (await pool.founder()).should.equal(address);
    });
    
    it("should have proper name", async () => {
        (await pool.name()).should.equal("creditPool");
    });

    it("should have proper description", async () => {
        (await pool.description()).should.equal("Great Pool");
    });

    it("should add module", async () => {
        await pool.set('testModule', wallet1, false, {from: owner});
    });

    it("should replace module", async () => {
        await pool.set('testModule', wallet1, false, {from: owner});
        await pool.set('testModule', wallet2, false, {from: owner});
    });
    it("should add module after replace first module", async () => {
        await pool.set('testModule1', wallet1, false, {from: owner});
        await pool.set('testModule2', wallet2, false, {from: owner});
        await pool.set('testModule3', wallet3, false, {from: owner});
        // console.log('Modules - before replace', await getAllModules());
        await pool.set('testModule3', wallet4, false, {from: owner});
        // console.log('Modules - after replace', await getAllModules());
        await pool.set('anotherTestModule', wallet5, false, {from: owner});
        // console.log('Modules - after add', await getAllModules());
    });
    it("should add module after replace middle module", async () => {
        await pool.set('testModule1', wallet1, false, {from: owner});
        await pool.set('testModule2', wallet2, false, {from: owner});
        await pool.set('testModule3', wallet3, false, {from: owner});
        // console.log('Modules - before replace', await getAllModules());
        await pool.set('testModule3', wallet4, false, {from: owner});
        // console.log('Modules - after replace', await getAllModules());
        await pool.set('anotherTestModule', wallet5, false, {from: owner});
        // console.log('Modules - after add', await getAllModules());
    });
    it("should add module after replace last module", async () => {
        await pool.set('testModule1', wallet1, false, {from: owner});
        await pool.set('testModule2', wallet2, false, {from: owner});
        await pool.set('testModule3', wallet3, false, {from: owner});
        // console.log('Modules - before replace', await getAllModules());
        await pool.set('testModule3', wallet4, false, {from: owner});
        // console.log('Modules - after replace', await getAllModules());
        await pool.set('anotherTestModule', wallet5, false, {from: owner});
        // console.log('Modules - after add', await getAllModules());
    });


    async function getAllModules():Promise<string[]>{
        let modules:string[] = [];
        let addr = await pool.first();
        while(addr != '0x0000000000000000000000000000000000000000') {
            modules.push(addr);
            addr = await pool.next(addr);
        }
        return modules;
    }
});
