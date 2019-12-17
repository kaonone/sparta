const BN = require('bn.js');

function roundBN_decimalPlaces(v, decimalPlaces){
    let bits = Math.round(Math.log2(Math.pow(10, decimalPlaces)));
    return roundBNBits(v, bits);
}

function roundBN_bits(v, roundBits) {
    let t = BN(v); //Convert v to BN or returns v itself
    return t.shrn(roundBits).shln(roundBits);
}

module.exports = {
    roundBN_decimalPlaces,
    roundBN_bits
}