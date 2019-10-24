import { Counter_V0Instance } from "../types/truffle-contracts/index";
// tslint:disable-next-line:no-var-requires
const { BN, constants, expectEvent, shouldFail } = require("@openzeppelin/test-helpers");

// tslint:disable-next-line:no-var-requires
const should = require("chai").should();

// tslint:disable-next-line:variable-name
const Counter_V0 = artifacts.require("Counter_V0");

contract("counterV0", async ([_, owner, ...otherAccounts]) => {
  let counter: Counter_V0Instance;
  const value = new BN(9999);
  const add = new BN(1);

  beforeEach(async function() {
    counter = await Counter_V0.new();
    counter.initialize(value, { from: owner });
  });

  it("should have proper owner", async () => {
    (await counter.owner()).should.equal(owner);
  });

  it("should have proper default value", async () => {
    (await counter.getCounter()).should.bignumber.equal(value);
  });

  it("should increase counter value", async () => {
    await counter.increaseCounter(add);
    (await counter.getCounter()).should.bignumber.equal(value.add(add));
  });

});
