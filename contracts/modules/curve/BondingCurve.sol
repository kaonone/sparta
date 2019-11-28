pragma solidity ^0.5.12;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "../../interfaces/curve/IBondingCurve.sol";
import "../../utils/ISQRT.sol";

contract BondingCurve is Initializable, IBondingCurve  {
    using ISQRT for uint256;

    function curve(uint256 a, uint256 b, uint256 s) public pure returns(uint256){
        return (a*a + 4*b*s).sqrt()/2;
    }

/*
    function calculatePurchase(
        uint256 _totalSupply,
        uint256 _poolBalance,
        uint256 _reserveRatio,
        uint256 _amount
    ) external pure returns (uint256) {

    }

    function calculateSale(
        uint256 _totalSupply,
        uint256 _poolBalance,
        uint256 _reserveRatio,
        uint256 _amount
    ) external pure returns (uint256) {

    }
*/

}