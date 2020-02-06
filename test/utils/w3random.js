const BN = require('bn.js');
const Web3 = require('web3');

function interval(min=0, max=1, units='wei') {
    let rnd = Math.round(min + (max-min)*Math.random());
    return new BN(Web3.utils.toWei(String(rnd), units));
}
function intervalBN(min, max) {
    let minBN = new BN(min);
    let maxBN = new BN(max);
    const MP = 100000000;
    let rnd = Math.round(MP * Math.random());
    return minBN.add(maxBN.sub(minBN).mul(new BN(rnd)).div(new BN(MP)));
}
function bn(bytes=32){
    return new BN(Web3.utils.randomHex(bytes).substr(2), 16);
}

module.exports = {
    interval,
    intervalBN,
    bn
};
