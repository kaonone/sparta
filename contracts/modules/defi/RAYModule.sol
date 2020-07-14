pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC721/IERC721Receiver.sol";
import "../../interfaces/token/IPToken.sol";
import "../../interfaces/defi/IRAYStorage.sol";
import "../../interfaces/defi/IRAYPortfolioManager.sol";
import "../../interfaces/defi/IRAYNAVCalculator.sol";
import "./DefiModuleBase.sol";

contract RAYModule is DefiModuleBase, IERC721Receiver {
    bytes32 internal constant PORTFOLIO_MANAGER_CONTRACT = keccak256("PortfolioManagerContract");
    bytes32 internal constant NAV_CALCULATOR_CONTRACT = keccak256("NAVCalculatorContract");
    bytes32 internal constant RAY_TOKEN_CONTRACT = keccak256("RAYTokenContract");
    bytes4 internal constant ERC721_RECEIVER = bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));

    event TokenRegistered(address indexed token, bytes32 portfolioId);
    event TokenUnregistered(address indexed token);

    struct TokenData {
        bytes32 portfolioId;
        bytes32 rayTokenId;
    }

    address[] _registeredTokens;
    mapping(address => TokenData) tokens;

    function initialize(address _pool) public initializer {
        DefiModuleBase.initialize(_pool);
    }

    function onERC721Received(address, address, uint256, bytes memory) public returns (bytes4) {
        address rayTokenContract = rayStorage().getContractAddress(RAY_TOKEN_CONTRACT);
        require(_msgSender() == rayTokenContract, "RAYModule: only accept RAY Token transfers");
        return ERC721_RECEIVER;
    }

    function registerToken(address token, bytes32 portfolioId) public onlyDefiOperator {
        require(token != address(0), "RAYModule: incorrect token address");
        require(portfolioId != bytes32(0), "RAYModule: incorrect portfolio id");
        tokens[token] = TokenData({
            portfolioId: portfolioId,
            rayTokenId: 0x0
        });
        _registeredTokens.push(token);
        uint256 cuurentBalance = IERC20(token).balanceOf(address(this));
        if (cuurentBalance > 0) {
            handleDeposit(token, address(0), cuurentBalance); //This updates depositsSinceLastDistribution
        }
        emit TokenRegistered(token, portfolioId);
    }

    function unregisterToken(address token) public onlyDefiOperator {
        uint256 balance = poolBalanceOf(token);

        //TODO: ensure there is no interest on this token which is wating to be withdrawn

        //Find position of token we are removing
        uint256 pos;
        for (pos = 0; pos < _registeredTokens.length; pos++) {
            if (_registeredTokens[pos] == token) break;
        }
        assert(_registeredTokens[pos] == token); // This should never fail because we know token is registered
        if (pos == _registeredTokens.length - 1) {
            // Removing last token
            _registeredTokens.pop();
        } else {
            // Replace token we are going to delete with the last one and remove it
            address last = _registeredTokens[_registeredTokens.length-1];
            _registeredTokens.pop();
            _registeredTokens[pos] = last;
        }

        if (balance > 0){
            withdrawalsSinceLastDistribution[token] = withdrawalsSinceLastDistribution[token].add(balance);
            withdrawInternal(token, getModuleAddress(MODULE_FUNDS), balance);
            emit Withdraw(token, balance);
        }
        delete tokens[token];

        emit TokenUnregistered(token);
    }

    function registeredTokens() public view returns(address[] memory){
        return _registeredTokens;
    }

    function handleDepositInternal(address token, address, uint256 amount) internal {
        require(tokens[token].portfolioId != 0x0, "RAYModule: token not registered");
        // uint256 balance = IERC20(token).balanceOf(address(this));
        // require(balance >= amount, "RAYModule: not enough balance");
        IRAYPortfolioManager pm = rayPortfolioManager();
        IERC20(token).approve(address(pm), amount);
        if (tokens[token].rayTokenId == 0x0) {
            tokens[token].rayTokenId = pm.mint(tokens[token].portfolioId, address(this), amount);
        } else {
            pm.deposit(tokens[token].rayTokenId, amount);
        }
    }

    function withdrawInternal(address token, address beneficiary, uint256 amount) internal {
        rayPortfolioManager().redeem(tokens[token].rayTokenId, amount, address(0));
        IERC20(token).transfer(beneficiary, amount);
    }

    function poolBalanceOf(address token) internal returns(uint256) {
        if (tokens[token].rayTokenId == 0x0) return 0;
        (uint256 amount,) = rayNAVCalculator().getTokenValue(tokens[token].portfolioId, tokens[token].rayTokenId);
        return amount;
    }
    
    function rayPortfolioManager() private view returns(IRAYPortfolioManager){
        return rayPortfolioManager(rayStorage());
    }

    function rayPortfolioManager(IRAYStorage rayStorage) private view returns(IRAYPortfolioManager){
        return IRAYPortfolioManager(rayStorage.getContractAddress(PORTFOLIO_MANAGER_CONTRACT));
    }

    function rayNAVCalculator() private view returns(IRAYNAVCalculator){
        return rayNAVCalculator(rayStorage());
    }

    function rayNAVCalculator(IRAYStorage rayStorage) private view returns(IRAYNAVCalculator){
        return IRAYNAVCalculator(rayStorage.getContractAddress(NAV_CALCULATOR_CONTRACT));
    }

    function rayStorage() private view returns(IRAYStorage){
        return IRAYStorage(getModuleAddress(MODULE_RAY));
    }
}
