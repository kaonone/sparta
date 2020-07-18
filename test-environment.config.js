const fs = require("fs");

module.exports = {
  node: {
    logger: {
      log: function (...args) {
        fs.writeFile("./logs.txt", args, function (err) {
          if (err) {
            return console.log(err);
          }
          console.log("The file was saved!");
        });
      },
    },
    debug: true,
  },

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
