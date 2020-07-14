module.exports = {
  accounts: {
    ether: 1e6,
  },

  contracts: {
    type: "truffle",
  },

  setupProvider: (baseProvider) => {
    const { utils, GSNDevProvider } = require("@openzeppelin/gsn-provider");
    const { accounts, web3 } = require("@openzeppelin/test-environment");

    return new GSNDevProvider(baseProvider, {
      txfee: 70,
      useGSN: false,
      ownerAddress: accounts[8],
      relayerAddress: accounts[9],
      approveFunction: utils.makeApproveFunction(async (data) => {
        const sig = await web3.eth.sign(data, accounts[1]);
        return sig;
      }),
    });
  },
};
