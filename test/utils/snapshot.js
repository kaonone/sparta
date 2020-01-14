const { promisify } = require('util');

async function rpc(method, arg) {
    let request = {
        jsonrpc: "2.0",
        method: method,
        id: Date.now(),
        params: arg
    };

    let result = await promisify(web3.currentProvider.send.bind(web3.currentProvider))(request);
    if (result.error != null) {
        throw new Error("RPC Error: " + (result.error.message || result.error));
    }
    return result;
};

async function snapshot() {
    return (await rpc("evm_snapshot")).result;
};

async function revert(snapshot_id) {
    await rpc("evm_revert", [snapshot_id]);
};

module.exports = {
    snapshot, revert
}