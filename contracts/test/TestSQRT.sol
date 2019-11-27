pragma solidity ^0.5.12;

import "../utils/ISQRT.sol";

contract TestSQRT {
    using ISQRT for uint256;
    
    uint256 public sqrt;

    function setSqrt2(uint256 x) external {
        sqrt = x.isqrt2();
    }

    function setSqrtB(uint256 x) external {
        sqrt = x.sqrtBabylonian();
    }

    function sqrt2(uint256 x) pure public returns(uint256){
        return x.isqrt2();
    }

    function sqrtB(uint256 x) pure public returns(uint256){
        return x.sqrtBabylonian();
    }

}
