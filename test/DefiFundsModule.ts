import { 
    FreeDAIContract, FreeDAIInstance,
    CErc20StubContract, CErc20StubInstance,
    PoolContract, PoolInstance, 
    PTokenContract, PTokenInstance, 
    CurveModuleContract, CurveModuleInstance,
    DefiFundsModuleContract, DefiFundsModuleInstance,
    CompoundModuleContract, CompoundModuleInstance,
    RAYStubContract, RAYStubInstance,
    RAYModuleContract, RAYModuleInstance,
    LoanModuleStubContract, LoanModuleStubInstance,
    IDefiModuleInstance
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
const CompoundModule = artifacts.require("CompoundModule");
const RAYStub = artifacts.require("RAYStub");
const RAYModule = artifacts.require("RAYModule");
const LoanModuleStub = artifacts.require("LoanModuleStub");
const DefiFundsModule = artifacts.require("DefiFundsModule");

describe("DefiFundsModule", function() {
    let modulesToTest = [
        {module: "CompoundModule", 
            before: async function(dai:FreeDAIInstance, pool:PoolInstance, owner:string):Promise<[IDefiModuleInstance, string, BN]>{
                let cDai: CErc20StubInstance;
                let defi: CompoundModuleInstance;

                cDai = await CErc20Stub.new();
                await (<any> cDai).methods['initialize(address)'](dai.address, {from: owner});
                await pool.set('cdai', cDai.address, false, {from: owner});

                defi = await CompoundModule.new();
                await (<any> defi).methods['initialize(address)'](pool.address, {from: owner});

                let interesRate = await cDai.INTEREST_RATE();

                return [defi, cDai.address, interesRate];
            },
            protocolBalanceOf: async function(defiModuleAddress:string, protocolAddress:string):Promise<BN> {
                let protocol = await CErc20Stub.at(protocolAddress);
                let balance = await protocol.balanceOf(defiModuleAddress);
                return balance;
            },
            underlyingBalanceOf: async function(defiModuleAddress:string, protocolAddress:string):Promise<BN> {
                let protocol = await CErc20Stub.at(protocolAddress);
                let balance = await protocol.getBalanceOfUnderlying(defiModuleAddress);
                return balance;
            }
        },
        {module: "RAYModule", 
            before: async function(dai:FreeDAIInstance, pool:PoolInstance, owner:string):Promise<[IDefiModuleInstance, string, BN]>{
                let ray: RAYStubInstance;
                let defi: RAYModuleInstance;

                ray = await RAYStub.new();
                await (<any> ray).methods['initialize(address)'](dai.address, {from: owner});
                await pool.set('ray', ray.address, false, {from: owner});

                defi = await RAYModule.new();
                await (<any> defi).methods['initialize(address)'](pool.address, {from: owner});

                let interesRate = await ray.INTEREST_RATE();

                return [defi, ray.address, interesRate];
            },
            protocolBalanceOf: async function(defiModuleAddress:string, protocolAddress:string):Promise<BN> {
                // let protocol = RAYStub.at(protocolAddress);
                // let balance = await protocol.balanceOf(defiModuleAddress),
                // return balance;
                return this.underlyingBalanceOf(defiModuleAddress, protocolAddress);
            },
            underlyingBalanceOf: async function(defiModuleAddress:string, protocolAddress:string):Promise<BN> {
                const portfolioID = '0xcd93cf275bcc8c600887dc587ea0a16e8f0a87fa7f99560f72186069c8d3b3df'; //web3.utils.keccak256("DaiCompound");
                let protocol = await RAYStub.at(protocolAddress);
                let rayModule = await RAYModule.at(defiModuleAddress);
                let rayTokenId = await rayModule.rayTokenId();
                let balances = await protocol.getTokenValueStub(rayTokenId);
                return balances[0];
            }
        }   
    ];

    modulesToTest.forEach(function(moduleDef){
        contract("DefiFundsModule + "+moduleDef.module, async ([_, owner, user, ...otherAccounts]) => {
            let dai: FreeDAIInstance;
            let pool: PoolInstance;
            let pToken: PTokenInstance;
            let curve: CurveModuleInstance; 
            let funds: DefiFundsModuleInstance;
            let defim: IDefiModuleInstance;
            let defiProtocolAddress: string;
            let loanm: LoanModuleStubInstance;
            let loanpm: LoanModuleStubInstance;
          
            // Interest in tests can be calculated as (interesRate/expScale)*(secondsPassed/annualSeconds)
            let interesRate:BN, expScale = new BN('1000000000000000000'), annualSeconds = new BN(365*24*60*60+(24*60*60/4));

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

                funds = await DefiFundsModule.new();
                await (<any> funds).methods['initialize(address)'](pool.address, {from: owner});

                loanm = await LoanModuleStub.new();
                await (<any> loanm).methods['initialize(address)'](pool.address, {from: owner});
                loanpm = await LoanModuleStub.new();
                await (<any> loanpm).methods['initialize(address)'](pool.address, {from: owner});

                [defim, defiProtocolAddress, interesRate] = await moduleDef.before(dai, pool, owner);

                await pool.set('ltoken', dai.address, false, {from: owner});
                await pool.set('ptoken', pToken.address, false, {from: owner});
                await pool.set("curve", curve.address, false, {from: owner});  
                await pool.set('funds', funds.address, false, {from: owner});
                await pool.set('defi', defim.address, false, {from: owner});
                await pool.set("loan", loanm.address, false, {from: owner});  
                await pool.set("loan_proposals", loanpm.address, false, {from: owner});  
                await pToken.addMinter(funds.address, {from: owner});
                await funds.addFundsOperator(defim.address, {from: owner});
                await (<any> defim).addDefiOperator(funds.address, {from: owner});
            });


            it("should allow change settings", async () => {
                await funds.setDefiSettings(
                    web3.utils.toWei('10', 'ether'),
                    web3.utils.toWei('20', 'ether'),
                    {from: owner}
                );
                //Change back to zero
                await funds.setDefiSettings(
                    new BN(0),
                    new BN(0),
                    {from: owner}
                );
            })

            it("should deposit DAI to Compound", async () => {
                let amount = w3random.interval(100, 1000, 'ether');
                await (<any> dai).methods['mint(uint256)'](amount, {from: user});
                dai.approve(funds.address, amount, {from: user});

                let before = {
                    userDai: await dai.balanceOf(user),
                    cDaiDai: await dai.balanceOf(defiProtocolAddress),
                    defimCDai: await moduleDef.protocolBalanceOf(defim.address, defiProtocolAddress),
                    cDaiUnderlying: await moduleDef.underlyingBalanceOf(defim.address, defiProtocolAddress),
                };

                let receipt = await funds.depositLTokens(user, amount, {from: owner});

                let after = {
                    userDai: await dai.balanceOf(user),
                    cDaiDai: await dai.balanceOf(defiProtocolAddress),
                    defimCDai: await moduleDef.protocolBalanceOf(defim.address, defiProtocolAddress),
                    cDaiUnderlying: await moduleDef.underlyingBalanceOf(defim.address, defiProtocolAddress),
                };

                expect(after.userDai).to.be.bignumber.eq(before.userDai.sub(amount));
                expect(after.cDaiDai).to.be.bignumber.eq(before.cDaiDai.add(amount));
                expect(after.defimCDai).to.be.bignumber.gt(before.defimCDai);
                expectEqualBN(after.cDaiUnderlying, before.cDaiUnderlying.add(amount), 18, -6); //Accuracy may be bad because of rounding and time passed
            });

            it("should withdraw DAI from Compound", async () => {
                let before = {
                    userDai: await dai.balanceOf(user),
                    cDaiDai: await dai.balanceOf(defiProtocolAddress),
                    defimCDai: await moduleDef.protocolBalanceOf(defim.address, defiProtocolAddress),
                    cDaiUnderlying: await moduleDef.underlyingBalanceOf(defim.address, defiProtocolAddress),
                };
                let amount = w3random.intervalBN(before.cDaiDai.divn(3), before.cDaiDai.divn(2));

                let receipt = await funds.withdrawLTokens(user, amount, new BN(0), {from: owner});

                let after = {
                    userDai: await dai.balanceOf(user),
                    cDaiDai: await dai.balanceOf(defiProtocolAddress),
                    defimCDai: await moduleDef.protocolBalanceOf(defim.address, defiProtocolAddress),
                    cDaiUnderlying: await moduleDef.underlyingBalanceOf(defim.address, defiProtocolAddress),
                };

                expect(after.userDai).to.be.bignumber.eq(before.userDai.add(amount));
                expect(after.cDaiDai).to.be.bignumber.eq(before.cDaiDai.sub(amount));
                expect(after.defimCDai).to.be.bignumber.lt(before.defimCDai);
                expectEqualBN(after.cDaiUnderlying, before.cDaiUnderlying.sub(amount), 18, -5); //Accuracy may be bad because of rounding and time passed
            });

            it("should withdraw all DAI from Compound", async () => {
                let beforeTimeShift = {
                    fundsDai: await dai.balanceOf(funds.address),
                    cDaiDai: await dai.balanceOf(defiProtocolAddress),
                    defimCDai: await moduleDef.protocolBalanceOf(defim.address, defiProtocolAddress),
                    cDaiUnderlying: await moduleDef.underlyingBalanceOf(defim.address, defiProtocolAddress),
                };
                expect(beforeTimeShift.fundsDai).to.be.bignumber.eq(new BN(0));

                let timeShift = w3random.interval(30*24*60*60, 89*24*60*60)
                await time.increase(timeShift);

                let afterTimeShift = {
                    fundsDai: await dai.balanceOf(funds.address),
                    cDaiDai: await dai.balanceOf(defiProtocolAddress),
                    defimCDai: await moduleDef.protocolBalanceOf(defim.address, defiProtocolAddress),
                    cDaiUnderlying: await moduleDef.underlyingBalanceOf(defim.address, defiProtocolAddress),
                };
                expect(afterTimeShift.cDaiUnderlying).to.be.bignumber.gt(beforeTimeShift.cDaiUnderlying);

                let receipt = await funds.withdrawAllFromDefi({from: owner});

                let afterWithdraw = {
                    fundsDai: await dai.balanceOf(funds.address),
                    cDaiDai: await dai.balanceOf(defiProtocolAddress),
                    defimCDai: await moduleDef.protocolBalanceOf(defim.address, defiProtocolAddress),
                    cDaiUnderlying: await moduleDef.underlyingBalanceOf(defim.address, defiProtocolAddress),
                };
                expectEqualBN(afterWithdraw.fundsDai, afterTimeShift.cDaiUnderlying, 18, -5);
                expectEqualBN(afterWithdraw.cDaiDai, new BN(0));
                expectEqualBN(afterWithdraw.defimCDai, new BN(0));
            });

            it("should deposit all DAI to Compound", async () => {
                let before = {
                    fundsDai: await dai.balanceOf(funds.address),
                    cDaiDai: await dai.balanceOf(defiProtocolAddress),
                    defimCDai: await moduleDef.protocolBalanceOf(defim.address, defiProtocolAddress),
                    cDaiUnderlying: await moduleDef.underlyingBalanceOf(defim.address, defiProtocolAddress),
                };
                expect(before.fundsDai).to.be.bignumber.gt(new BN(0));

                let receipt = await funds.depositAllToDefi({from: owner});

                let after = {
                    fundsDai: await dai.balanceOf(funds.address),
                    cDaiDai: await dai.balanceOf(defiProtocolAddress),
                    defimCDai: await moduleDef.protocolBalanceOf(defim.address, defiProtocolAddress),
                    cDaiUnderlying: await moduleDef.underlyingBalanceOf(defim.address, defiProtocolAddress),
                };

                expect(after.fundsDai).to.be.bignumber.eq(new BN(0));
                expect(after.cDaiDai).to.be.bignumber.eq(before.cDaiDai.add(before.fundsDai));
                expect(after.defimCDai).to.be.bignumber.gt(before.defimCDai);
            });

            it("should respect minInstantAmount & maxInstantAmount", async () => {
                let userMintAmount = web3.utils.toWei('10000', 'ether')
                await (<any> dai).methods['mint(uint256)'](userMintAmount, {from: user});
                dai.approve(funds.address, userMintAmount, {from: user});

                let minInstantAmount = new BN(web3.utils.toWei('2000', 'ether'));
                let maxInstantAmount = minInstantAmount.add(minInstantAmount.muln(5).divn(100));
                let before = {
                    fundsDai: await dai.balanceOf(funds.address),
                    cDaiDai: await dai.balanceOf(defiProtocolAddress),
                    defimCDai: await moduleDef.protocolBalanceOf(defim.address, defiProtocolAddress),
                    cDaiUnderlying: await moduleDef.underlyingBalanceOf(defim.address, defiProtocolAddress),
                };

                // Check initial state
                expect(before.fundsDai).to.be.bignumber.eq(new BN(0));
                expect(before.cDaiDai).to.be.bignumber.lt(minInstantAmount); 

                await funds.setDefiSettings(minInstantAmount, maxInstantAmount, {from:owner});

                let afterRebalance = {
                    fundsDai: await dai.balanceOf(funds.address),
                    cDaiDai: await dai.balanceOf(defiProtocolAddress),
                    defimCDai: await moduleDef.protocolBalanceOf(defim.address, defiProtocolAddress),
                    cDaiUnderlying: await moduleDef.underlyingBalanceOf(defim.address, defiProtocolAddress),
                };

                //test after rebalance
                expect(afterRebalance.fundsDai).to.be.bignumber.eq(before.cDaiDai);
                expect(afterRebalance.cDaiDai).to.be.bignumber.eq(new BN(0));

                let verySmallDeposit = new BN(web3.utils.toWei('1', 'ether'));
                expect(afterRebalance.fundsDai.add(verySmallDeposit)).to.be.bignumber.lt(minInstantAmount); 
                
                await funds.depositLTokens(user, verySmallDeposit, {from: owner});

                let afterVerySmallDeposit = {
                    fundsDai: await dai.balanceOf(funds.address),
                    cDaiDai: await dai.balanceOf(defiProtocolAddress),
                    defimCDai: await moduleDef.protocolBalanceOf(defim.address, defiProtocolAddress),
                    cDaiUnderlying: await moduleDef.underlyingBalanceOf(defim.address, defiProtocolAddress),
                };
                expect(afterVerySmallDeposit.fundsDai).to.be.bignumber.eq(afterRebalance.fundsDai.add(verySmallDeposit));
                expect(afterVerySmallDeposit.cDaiDai).to.be.bignumber.eq(new BN(0));
               
                let smallDeposit = minInstantAmount.sub(afterVerySmallDeposit.fundsDai).add( maxInstantAmount.sub(minInstantAmount).divn(2) );
                await funds.depositLTokens(user, smallDeposit, {from: owner});

                let afterSmallDeposit = {
                    fundsDai: await dai.balanceOf(funds.address),
                    cDaiDai: await dai.balanceOf(defiProtocolAddress),
                    defimCDai: await moduleDef.protocolBalanceOf(defim.address, defiProtocolAddress),
                    cDaiUnderlying: await moduleDef.underlyingBalanceOf(defim.address, defiProtocolAddress),
                };
                expect(afterSmallDeposit.fundsDai).to.be.bignumber.gte(minInstantAmount);
                expect(afterSmallDeposit.fundsDai).to.be.bignumber.lte(maxInstantAmount);
                expect(afterSmallDeposit.cDaiDai).to.be.bignumber.eq(new BN(0));

                let bigDeposit = maxInstantAmount;
                await funds.depositLTokens(user, bigDeposit, {from: owner});

                let afterBigDeposit = {
                    fundsDai: await dai.balanceOf(funds.address),
                    cDaiDai: await dai.balanceOf(defiProtocolAddress),
                    defimCDai: await moduleDef.protocolBalanceOf(defim.address, defiProtocolAddress),
                    cDaiUnderlying: await moduleDef.underlyingBalanceOf(defim.address, defiProtocolAddress),
                    userDai: await dai.balanceOf(user),
                };
                expect(afterBigDeposit.fundsDai).to.be.bignumber.eq(minInstantAmount);
                expect(afterBigDeposit.cDaiDai).to.be.bignumber.gt(new BN(0));

                let smallWithdraw = minInstantAmount.divn(2);
                await (<any>funds).methods['withdrawLTokens(address,uint256)'](user, smallWithdraw, {from: owner});

                let afterSmallWithdraw = {
                    fundsDai: await dai.balanceOf(funds.address),
                    cDaiDai: await dai.balanceOf(defiProtocolAddress),
                    defimCDai: await moduleDef.protocolBalanceOf(defim.address, defiProtocolAddress),
                    cDaiUnderlying: await moduleDef.underlyingBalanceOf(defim.address, defiProtocolAddress),
                    userDai: await dai.balanceOf(user),
                };
                expect(afterSmallWithdraw.cDaiDai).to.be.bignumber.eq(afterBigDeposit.cDaiDai);
                expect(afterSmallWithdraw.userDai).to.be.bignumber.eq(afterBigDeposit.userDai.add(smallWithdraw))

                let bigWithdraw = maxInstantAmount;
                await (<any>funds).methods['withdrawLTokens(address,uint256)'](user, bigWithdraw, {from: owner});

                let afterBigWithdraw = {
                    fundsDai: await dai.balanceOf(funds.address),
                    cDaiDai: await dai.balanceOf(defiProtocolAddress),
                    defimCDai: await moduleDef.protocolBalanceOf(defim.address, defiProtocolAddress),
                    cDaiUnderlying: await moduleDef.underlyingBalanceOf(defim.address, defiProtocolAddress),
                    userDai: await dai.balanceOf(user),
                };
                expect(afterBigWithdraw.userDai).to.be.bignumber.eq(afterSmallWithdraw.userDai.add(bigWithdraw));
            });

        });
    });

});
