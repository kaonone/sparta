const BN = require('bn.js');
const Web3 = require('web3');

function interval(min=0, max=1, units='wei') {
    let rnd = min + (max-min)*Math.random();
    return new BN(Web3.utils.toWei(String(rnd), units));
}
function bn(bytes=32){
    return new BN(Web3.utils.randomHex(bytes).substr(2), 16);
}

module.exports = {
    interval,
    bn
};
