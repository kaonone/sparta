import {
  GSNV1AdapterInstance,
  IRelayHubInstance,
  PoolContract,
  PoolInstance,
  FundsModuleContract,
  FundsModuleInstance,
  AccessModuleContract,
  AccessModuleInstance,
  LiquidityModuleContract,
  LiquidityModuleInstance,
  LoanModuleStubContract,
  LoanModuleStubInstance,
  CurveModuleContract,
  CurveModuleInstance,
  PTokenContract,
  PTokenInstance,
  FreeDAIContract,
  FreeDAIInstance,
  // @ts-ignore
} from "../types/truffle-contracts";

const {
  BN,
  constants,
  expectEvent,
  shouldFail,
  time,
} = require("@openzeppelin/test-helpers");
const { deployRelayHub, fundRecipient } = require("@openzeppelin/gsn-helpers");
const expectRevert = require("../utils/expectRevert");
// tslint:disable-next-line:no-var-requires
const should = require("chai").should();
var expect = require("chai").expect;
const w3random = require("../utils/w3random");
const findEventArgs = require("../utils/findEventArgs");
const expectEqualBN = require("../utils/expectEqualBN");

const {
  accounts: [_, owner, liquidityProvider, borrower, ...otherAccounts],
  accounts,
  contract,
  web3,
} = require("@openzeppelin/test-environment");

const Pool = contract.fromArtifact("Pool");
const FundsModule = contract.fromArtifact("FundsModule");
const AccessModule = contract.fromArtifact("AccessModule");
const LiquidityModule = contract.fromArtifact("LiquidityModule");
const LoanModuleStub = contract.fromArtifact("LoanModuleStub");
const CurveModule = contract.fromArtifact("CurveModule");
const PToken = contract.fromArtifact("PToken");
const FreeDAI = contract.fromArtifact("FreeDAI");

const GSNV1Adapter = contract.fromArtifact("GSNV1Adapter");
const IRelayHub = contract.fromArtifact("IRelayHub");

const {
  abi: LiquidityModuleAbi,
} = require("../../build/contracts/LiquidityModule.json");
const {
  abi: GSNV1AdapterAbi,
} = require("../../build/contracts/GSNV1Adapter.json");

describe("GSN-LiquidityModule", async () => {
  let pool: PoolInstance;
  let funds: FundsModuleInstance;
  let access: AccessModuleInstance;
  let liqm: LiquidityModuleInstance;
  let loanms: LoanModuleStubInstance;
  let loanmps: LoanModuleStubInstance;
  let curve: CurveModuleInstance;
  let pToken: PTokenInstance;
  let lToken: FreeDAIInstance;

  // GSN Instances
  let gsnV1AdapterInstance: GSNV1AdapterInstance;
  let irelayHubInstance: IRelayHubInstance;

  // Web3 Instances
  let liqmWeb3Instance: any;
  let gsnV1AdapterWeb3Instance: any;

  beforeEach(async () => {
    //Setup system contracts
    pool = await Pool.new();
    await (<any>pool).methods["initialize()"]({ from: owner });

    lToken = await FreeDAI.new();
    await (<any>lToken).methods["initialize()"]({ from: owner });
    await pool.set("ltoken", lToken.address, true, { from: owner });

    pToken = await PToken.new();
    await (<any>pToken).methods["initialize(address)"](pool.address, {
      from: owner,
    });
    await pool.set("ptoken", pToken.address, true, { from: owner });

    access = await AccessModule.new();
    await (<any>access).methods["initialize(address)"](pool.address, {
      from: owner,
    });
    await pool.set("access", access.address, true, { from: owner });
    access.disableWhitelist({ from: owner });

    curve = await CurveModule.new();
    await (<any>curve).methods["initialize(address)"](pool.address, {
      from: owner,
    });
    await pool.set("curve", curve.address, true, { from: owner });

    liqm = await LiquidityModule.new();
    await (<any>liqm).methods["initialize(address)"](pool.address, {
      from: owner,
    });
    await pool.set("liquidity", liqm.address, true, { from: owner });

    loanms = await LoanModuleStub.new();
    await (<any>loanms).methods["initialize(address)"](pool.address, {
      from: owner,
    });
    await pool.set("loan", loanms.address, true, { from: owner });
    loanmps = await LoanModuleStub.new();
    await (<any>loanmps).methods["initialize(address)"](pool.address, {
      from: owner,
    });
    await pool.set("loan_proposals", loanmps.address, true, { from: owner });

    funds = await FundsModule.new();
    await (<any>funds).methods["initialize(address)"](pool.address, {
      from: owner,
    });
    await pool.set("funds", funds.address, true, { from: owner });
    await pToken.addMinter(funds.address, { from: owner });
    await funds.addFundsOperator(liqm.address, { from: owner });

    //Do common tasks
    lToken.mint(liquidityProvider, web3.utils.toWei("1000000"), {
      from: owner,
    });
    await lToken.approve(funds.address, web3.utils.toWei("1000000"), {
      from: liquidityProvider,
    });

    await deployRelayHub(web3, { from: owner });

    // @ts-ignore
    gsnV1AdapterInstance = await GSNV1Adapter.new();

    irelayHubInstance = await IRelayHub.at(
      "0xD216153c06E857cD7f72665E0aF1d7D82172F494"
    );

    liqmWeb3Instance = new web3.eth.Contract(
      LiquidityModuleAbi,
      // @ts-ignore
      liqm.address
    );

    gsnV1AdapterWeb3Instance = new web3.eth.Contract(
      GSNV1AdapterAbi,
      // @ts-ignore
      gsnV1AdapterInstance.address
    );

    await gsnV1AdapterInstance.initilize__0xb373a41f(owner, owner, {
      from: owner,
    });

    await gsnV1AdapterInstance.setTarget__0xb373a41f(
      liqmWeb3Instance.methods
        .deposit("0", "0")
        .encodeABI()
        .slice(0, 10),
      "LiquidityModule__deposit",
      // @ts-ignore
      liqm.address,
      {
        from: owner,
      }
    );

    await liqm.setRelayHub(gsnV1AdapterInstance.address);

    const HubAddr = await liqm.getHubAddr();

    console.log({ gsnAddr: gsnV1AdapterInstance.address, HubAddr });

    const targetAddress = await gsnV1AdapterInstance.getTargetAddress__0xb373a41f(
      "0xe2bbb158"
    );

    console.log({ targetAddress, liqm: liqm.address });

    // @ts-ignore
    await fundRecipient(web3, { recipient: gsnV1AdapterInstance.address });
  });

  it("should allow deposit if no debts", async function() {
    let fundsLWei = await lToken.balanceOf(funds.address);
    // const amountWeiLToken = w3random.interval(10, 100000, "ether");
    const amountWeiLToken = new BN("10000");

    // const data = liqmWeb3Instance.methods
    //   .deposit(amountWeiLToken.toString(), "0")
    //   .encodeABI();

    // console.log(data);

    // @ts-ignore
    const res = await gsnV1AdapterInstance.sendTransaction({
      from: liquidityProvider,
      data:
        "0xe2bbb15800000000000000000000000000000000000000000000000000000000000027100000000000000000000000000000000000000000000000000000000000000000",
      useGSN: true,
    });

    // console.log({ res, data, liqm: liqm.address });

    // let expectedfundsLWei = fundsLWei.add(amountWeiLToken);
    // // expectEvent(receipt, "Deposit", {
    // //   sender: liquidityProvider,
    // //   lAmount: amountWeiLToken,
    // // });
    // fundsLWei = await lToken.balanceOf(funds.address);

    // console.log({
    //   fundsLWei: fundsLWei.toString(),
    //   expectedfundsLWei: expectedfundsLWei.toString(),
    // });
    // // expectEqualBN(fundsLWei, expectedfundsLWei);
    // // let lpBalance = await pToken.balanceOf(liquidityProvider);
    // // expect(lpBalance).to.be.bignumber.gt("0");
  });
});
