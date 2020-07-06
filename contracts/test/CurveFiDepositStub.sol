pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../interfaces/defi/IYErc20.sol";
import "../interfaces/defi/ICurveFiSwap.sol";
import "../interfaces/defi/ICurveFiDeposit.sol";
import "../common/Base.sol";
import "./CurveFiSwapStub.sol";
import "./CurveFiTokenStub.sol";

contract CurveFiDepositStub is Base, ICurveFiDeposit {
    using SafeMath for uint256;
    uint256 constant EXP_SCALE = 1e18;  //Exponential scale (see Compound Exponential)
    uint256 public constant N_COINS = 3;

    CurveFiSwapStub public curveFiSwap;
    CurveFiTokenStub public token;
    address[3] _coins;
    address[3] underlying;

    function initialize(address _curveFiSwap) public initializer {
        Base.initialize();
        curveFiSwap = CurveFiSwapStub(_curveFiSwap);
        token = CurveFiTokenStub(curveFiSwap.token());
        for(uint256 i=0; i < N_COINS; i++){
            _coins[i] = curveFiSwap.coins(int128(i));
            underlying[i] = IYErc20(_coins[i]).token();
        }
    }

    function add_liquidity (uint256[3] calldata uamounts, uint256 min_mint_amount) external {
        uint256[3] memory amounts = [uint256(0),uint256(0),uint256(0)];
        for(uint256 i=0; i<uamounts.length; i++){
            require(IERC20(underlying[i]).transferFrom(_msgSender(), address(this), uamounts[i]), "CurveFiDepositStub: failed to transfer underlying");
            IYErc20(_coins[i]).deposit(uamounts[i]);
            amounts[i] = IYErc20(_coins[i]).balanceOf(address(this));
        }
        curveFiSwap.add_liquidity(amounts, min_mint_amount);
        uint256 shares = token.balanceOf(address(this));
        token.transfer(_msgSender(), shares);
    }
    
    function remove_liquidity (uint256 _amount, uint256[3] calldata min_uamounts) external {
        token.transferFrom(_msgSender(), address(this), _amount);
        curveFiSwap.remove_liquidity(_amount, [uint256(0),uint256(0),uint256(0)]);
        send_all(_msgSender(), min_uamounts);
    }

    function remove_liquidity_imbalance (uint256[3] calldata uamounts, uint256 max_burn_amount) external {
        uint256[3] memory amounts = [uint256(0),uint256(0),uint256(0)];
        for(uint256 i=0; i<uamounts.length; i++){
            amounts[i] = uamounts[i].mul(EXP_SCALE).div(IYErc20(_coins[i]).getPricePerFullShare());
        }

        uint256 shares = token.balanceOf(_msgSender());
        if(shares > max_burn_amount) shares = max_burn_amount;

        token.transferFrom(_msgSender(), address(this), shares);
        curveFiSwap.remove_liquidity_imbalance(amounts, shares);

        shares = token.balanceOf(_msgSender());
        token.transfer(_msgSender(), shares); // Return unused
        send_all(_msgSender(), [uint256(0),uint256(0),uint256(0)]);
    }

    function remove_liquidity_one_coin(uint256 _token_amount, int128 i, uint256 min_uamount) external {
        remove_liquidity_one_coin(_token_amount, i, min_uamount, false);
    }

    function withdraw_donated_dust() external onlyOwner {
        uint256 shares = token.balanceOf(address(this));
        token.transfer(owner(), shares);
    }

    function coins(int128 i) external view returns (address) {
        return _coins[uint256(i)];
    }

    function underlying_coins(int128 i) external view returns (address) {
        return underlying[uint256(i)];
    }

    function curve() external view returns (address) {
        return address(curveFiSwap);
    }

    function calc_withdraw_one_coin (uint256 _token_amount, int128 i) external view returns (uint256) {
        return uint256(0).mul(_token_amount.mul(uint256(i))); //we do not use this
    }

    function remove_liquidity_one_coin(uint256 _token_amount, int128 _i, uint256 min_uamount, bool donate_dust) public {
        uint256[3] memory amounts = [uint256(0),uint256(0),uint256(0)];
        uint256 i = uint256(_i);
        amounts[i] = min_uamount.mul(EXP_SCALE).div(IYErc20(_coins[i]).getPricePerFullShare());
        curveFiSwap.remove_liquidity_imbalance(amounts, _token_amount);

        uint256[3] memory uamounts = [uint256(0),uint256(0),uint256(0)];
        uamounts[i] = min_uamount;
        send_all(_msgSender(), uamounts);
        if(!donate_dust) {
            uint256 shares = token.balanceOf(address(this));
            token.transfer(_msgSender(), shares);
        }
    }

    function send_all(address beneficiary, uint256[3] memory min_uamounts) internal {
        for(uint256 i=0; i<_coins.length; i++){
            uint256 shares = IYErc20(_coins[i]).balanceOf(address(this));
            if(shares == 0){
                require(min_uamounts[i] == 0, "CurveFiDepositStub: nothing to withdraw");
                continue;
            }
            IYErc20(_coins[i]).withdraw(shares);
            uint256 uamount = IERC20(underlying[i]).balanceOf(address(this));
            require(uamount >= min_uamounts[i], "CurveFiDepositStub: requested amount is too high");
            if(uamount > 0) {
                IERC20(underlying[i]).transfer(beneficiary, uamount);
            }
        }        
    }
}