pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../interfaces/defi/IYErc20.sol";
import "../interfaces/defi/ICurveFiSwap.sol";
import "../common/Base.sol";

contract CurveFiSwapStub is Base, ICurveFiSwap {
    using SafeMath for uint256;
    uint256 constant N_COINS = 3;

    CurveFiTokenStub token;
    address[3] public coins;

    function initialize(address[3] _coins) public initializer {
        Base.initialize();
        coins = _coins;
        token = new CurveFiTokenStub();
        token.initialize();
    }


    function add_liquidity (uint256[3] calldata amounts, uint256 min_mint_amount) external {
        uint256 fullAmount;
        for(uint256 i=0; i< N_COINS; i++){
            IERC20(coins[i]).transferFrom(msgSender(), address(this), amounts[i]);
            fullAmount = fullAmount.add(normalizeAmount(coins[i], amounts[i]));
        }
        require(token.mint(_msgSender(), fullAmount), "CurveFiSwapStub:Mint failed");
    }


    function remove_liquidity (uint256 _amount, uint256[3] calldata min_amounts) external;
    function remove_liquidity_imbalance (uint256[3] calldata amounts, uint256 max_burn_amount) external;
    function balances(int128 i) external view returns(uint256);

    function A() external view returns(uint256) {
        return 0;
    }

    function fee() external view returns(uint256) {
        return 0;
    }

    function normalizeAmount(address coin, uint256 amount) {
        uint8 decimals = ERC20Detailed(coin).decimals();
        if (decimals < 18) {
            return amount * 10**(18-decimals);
        } else if(decimals > 18) {
            return amount / 10**(decimals-18);
        } else {
            return amount;
        }
    }
}