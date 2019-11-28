pragma solidity ^0.5.12;

import "../utils/ISQRT.sol";

contract TestSQRT {
    using ISQRT for uint256;
    
    uint256 public sqrt;

    function setSqrtBitByBit(uint256 x) external {
        sqrt = x.isqrtBitByBit();
    }

    function setSqrtBabylonian(uint256 x) external {
        sqrt = x.sqrtBabylonian();
    }

    function sqrtBitByBit(uint256 x) pure public returns(uint256){
        return x.isqrtBitByBit();
    }

    function sqrtBabylonian(uint256 x) pure public returns(uint256){
        return x.sqrtBabylonian();
    }

}
