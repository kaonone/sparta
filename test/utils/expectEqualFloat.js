const BN = require('bn.js');
const chai = require('chai');
// const chaiBN = require('chai-bn')(BN);
// require('chai').use(chaiBN);


/**
 * Tests if actual and expected numbers are equal 
 * with accuracy = 10^precision (so `precision` should be negative)
 */
function expectEqualFloat(actual, expected, precision=-7) {
    // console.log("actual", actual);
    // console.log("expected", expected);
    let diff = Math.abs(actual - expected);
    let accuracy = Math.pow(10, precision);
    // console.log("accuracy", accuracy);
    assert( (diff<=accuracy), actual+' should be equal to '+expected+' with accuracy '+accuracy);
}

module.exports = expectEqualFloat;