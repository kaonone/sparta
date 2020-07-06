pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../interfaces/defi/IYErc20.sol";
import "../interfaces/defi/ICurveFiSwap.sol";
import "../common/Base.sol";
import "./CurveFiTokenStub.sol";


contract CurveFiSwapStub is Base, ICurveFiSwap {
    using SafeMath for uint256;
    uint256 public constant N_COINS = 3;
    uint256 constant MAX_EXCHANGE_FEE = 0.05*1e18;

    CurveFiTokenStub public token;
    address[3] _coins;

    function initialize(address[3] memory __coins) public initializer {
        Base.initialize();
        _coins = __coins;
        token = new CurveFiTokenStub();
        token.initialize();
    }


    function add_liquidity (uint256[3] calldata amounts, uint256 min_mint_amount) external {
        uint256 fullAmount;
        for(uint256 i=0; i< N_COINS; i++){
            IERC20(_coins[i]).transferFrom(_msgSender(), address(this), amounts[i]);
            fullAmount = fullAmount.add(normalizeAmount(_coins[i], amounts[i]));
        }
        (uint256 fee, bool bonus) = calculateExchangeFee(amounts, false);
        if(bonus) {
            fullAmount = fullAmount.add(fee);
        }else{
            fullAmount = fullAmount.sub(fee);
        }
        require(fullAmount >= min_mint_amount, "CurveFiSwapStub: Requested mint amount is too high");
        require(token.mint(_msgSender(), fullAmount), "CurveFiSwapStub: Mint failed");
    }


    function remove_liquidity (uint256 _amount, uint256[3] calldata min_amounts) external {
        uint256 totalSupply = token.totalSupply();
        uint256[] memory amounts = new uint256[](_coins.length);
        for(uint256 i=0; i < _coins.length; i++){
            uint256 balance = balances(int128(i));
            amounts[i] = _amount.mul(balance).div(totalSupply);
            require(amounts[i] >= min_amounts[i], "CurveFiSwapStub: Requested amount is too high");
            IERC20(_coins[i]).transfer(_msgSender(), amounts[i]);
        }
        token.burnFrom(_msgSender(), _amount);
    }

    function remove_liquidity_imbalance(uint256[3] calldata amounts, uint256 max_burn_amount) external {
        uint256 fullAmount = calc_token_amount(amounts, false);
        for(uint256 i=0; i< _coins.length; i++){
            IERC20(_coins[i]).transfer(_msgSender(), amounts[i]);
        }
        require(max_burn_amount == 0 || fullAmount <= max_burn_amount, "CurveFiSwapStub: Allowed burn amount is not enough");
        token.burnFrom(_msgSender(), fullAmount);
    }

    function calc_token_amount(uint256[3] memory amounts, bool deposit) public view returns(uint256) {
        (uint256 fee, bool bonus) = calculateExchangeFee(amounts, deposit);
        uint256 fullAmount;
        for(uint256 i=0; i< _coins.length; i++){
            uint256 balance = balances(int128(i));
            require(balance >= amounts[i], "CurveFiSwapStub: Not enough supply");
            fullAmount = fullAmount.add(amounts[i]);
        }
        if(bonus) {
            fullAmount = fullAmount.sub(fee);
        }else{
            fullAmount = fullAmount.add(fee);
        }
        return fullAmount;
    }

    function balances(int128 i) public view returns(uint256) {
        return IERC20(_coins[uint256(i)]).balanceOf(address(this));
    }

    function A() external view returns(uint256) {
        return 0;
    }

    function fee() external view returns(uint256) {
        return 0;
    }
    function coins(int128 i) external view returns (address) {
        return _coins[uint256(i)];
    }

    function calculateExchangeFee(uint256[3] memory diff, bool deposit) internal view returns(uint256 fullFee, bool bonus){
        uint256 averageAmount = 0;
        uint256[] memory _balances = new uint256[](_coins.length);
        for(uint256 i=0; i < _coins.length; i++){
            _balances[i] = balances(int128(i));
            averageAmount = averageAmount.add(_balances[i]);
        }
        averageAmount = averageAmount.div(_coins.length);
        int256 totalFee;
        for(uint256 i=0; i < _coins.length; i++){
            int256 oldDiff = int256(_balances[i]) - int256(averageAmount);
            int256 newDiff;
            if (deposit) {
                newDiff = oldDiff + int256(diff[i]);
            } else {
                newDiff = oldDiff - int256(diff[i]);
            }
             

            uint256 maxFee = diff[i].mul(MAX_EXCHANGE_FEE).div(1e18);
            int256 _fee;
            if(oldDiff == 0) {
                _fee = 0;
            }else {
                if (deposit){
                    _fee = int256(MAX_EXCHANGE_FEE)*int256(diff[i]) / oldDiff;
                } else {
                    _fee = -1*int256(MAX_EXCHANGE_FEE)*int256(diff[i]) / oldDiff;
                }
            }
            if(_fee >  0 && _fee > int256(maxFee)) _fee = int256(maxFee);
            if(_fee <  0 && -1*_fee > int256(maxFee)) _fee = -1*int256(maxFee);
            totalFee += _fee;
        }
        if(totalFee < 0){
            bonus = true;
            fullFee = uint256(-1*totalFee);
        } else {
            bonus = false;
            fullFee = uint256(totalFee);
        }
    }

    function normalizeAmount(address coin, uint256 amount) internal view returns(uint256){
        uint8 decimals = ERC20Detailed(coin).decimals();
        if (decimals < 18) {
            return amount * uint256(10)**(18-decimals);
        } else if(decimals > 18) {
            return amount / uint256(10)**(decimals-18);
        } else {
            return amount;
        }
    }
}