pragma solidity ^0.5.12;

/**
 * @title Integer Square Root calculation for solidity
 */
library ISQRT {

    /**
     * @notice Calculate Square Root
     * @param n Operand of sqrt() function
     * @return greatest integer less than or equal to the square root of n
     */
    function sqrt(uint256 n) internal pure returns(uint256){
        return sqrtBabylonian(n);
    }

    /**
     * Based on Digit-by-digit algorithm with bitwise operations.
     * This algorith is chousen because it has final amount of steps
     * and only requires multiply and bit shift operations.
     * See: https://en.wikipedia.org/wiki/Integer_square_root
     */
    function isqrt1(uint256 n) internal pure returns(uint256){
        /*  
            function integerSqrt(n):
                if n < 0:
                    error "integerSqrt works for only nonnegative inputs"
                
                # Find greatest shift.
                shift = 2
                nShifted = n >> shift
                # We check for nShifted being n, since some implementations
                # perform shift operations modulo the word size.
                while nShifted ≠ 0 and nShifted ≠ n:
                    shift = shift + 2
                    nShifted = n >> shift
                shift = shift - 2
                
                # Find digits of result.
                result = 0
                while shift ≥ 0:
                    result = result << 1
                    candidateResult = result + 1
                    if candidateResult*candidateResult ≤ n >> shift:
                        result = candidateResult
                    shift = shift - 2
               
                return result
        */      
        //Find greatest shift
        uint256 shift = 2;
        uint256 nShifted = n >> shift;
        while (nShifted > 0){
            shift = shift + 2;
            nShifted = n / (2 ** shift);
        }
        shift = shift - 2;
        // return shift;
        //Find digits of result
        uint256 result = 0;
        while (shift >= 0){
            result = result << 1;
            uint256 candidate = result + 1;
            nShifted = n >> shift;
            if (candidate*candidate <= nShifted) {
                result = candidate;
                if (shift > 0) {
                    shift = shift - 2; //shift is always incremented/decremented by 2, and checked against 0 on each iteration, so owerflow will not ocure
                } else {
                    break;
                }
            }
        }
        return result;
    }

    /**
     * Based on Martin Guy implementation
     * http://freaknet.org/martin/tape/gos/misc/personal/msc/sqrt/sqrt.c
     */
    function isqrt2(uint256 x) internal pure returns (uint256){
        uint256 op = x;
        uint256 res = 0;
        /* "one" starts at the highest power of four <= than the argument. */
        uint256 one = 1 << 254; /* second-to-top bit set */

        while (one > op) {
            one = one >> 2;
        }

        while (one != 0) {
            if (op >= res + one) {
                op = op - (res + one);
                res = res + 2 * one;
            }
            res = res/2;
            one = one/4;
        }
        return res;

    }

    /**
     * Babylonian method implemented in dapp-bin library
     * https://github.com/ethereum/dapp-bin/pull/50
     */
    function sqrtBabylonian(uint256 x) internal pure returns (uint256 y) {
        uint z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}