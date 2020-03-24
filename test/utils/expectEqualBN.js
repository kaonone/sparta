const BN = require('bn.js');
const chai = require('chai');
// const chaiBN = require('chai-bn')(BN);
// require('chai').use(chaiBN);


/**
 * Tests if actual and expected (BN|string) are equal 
 * with accuracy = 10^precision (so `precision` should be negative)
 * assuming v1 and v2 are big numbers with `decimals` decimals.
 */
function expectEqualBN(actual, expected, decimals=18, precision=-14) {
    // console.log("actual", actual.toString());
    // console.log("expected", expected.toString());
    if(decimals <= -1*precision) throw "Precision should be less then decimals";
    let diff = (new BN(actual)).sub(new BN(expected)).abs(); //This also converts v1 and v2 from strings, if necessary
    //console.log("diff", diff.toString());
    let accuracy = (new BN(10)).pow(new BN(decimals+precision));
    //console.log("accuracy", accuracy.toString());
    assert(diff.lte(accuracy), actual.toString()+' should be equal to '+expected.toString()+' with accuracy '+accuracy.toString());
}

module.exports = expectEqualBN;