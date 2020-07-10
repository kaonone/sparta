pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC721/IERC721Receiver.sol";
import "../../interfaces/defi/IDefiProtocol.sol";
import "../../interfaces/defi/IRAYStorage.sol";
import "../../interfaces/defi/IRAYPortfolioManager.sol";
import "../../interfaces/defi/IRAYNAVCalculator.sol";
import "../../interfaces/defi/IDefiModule.sol";
import "../../common/Module.sol";
import "./DefiOperatorRole.sol";

/**
 * RAY Protocol support module which works with only one base token
 */
contract RAYProtocol is Module, DefiOperatorRole, IERC721Receiver, IDefiProtocol {
    bytes32 internal constant PORTFOLIO_MANAGER_CONTRACT = keccak256("PortfolioManagerContract");
    bytes32 internal constant NAV_CALCULATOR_CONTRACT = keccak256("NAVCalculatorContract");
    bytes32 internal constant RAY_TOKEN_CONTRACT = keccak256("RAYTokenContract");
    bytes4 internal constant ERC721_RECEIVER = bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));

    IERC20 baseToken;
    bytes32 portfolioId;
    bytes32 rayTokenId;

    function initialize(address _pool, address _token, bytes32 _portfolioId) public initializer {
        Module.initialize(_pool);
        DefiOperatorRole.initialize(_msgSender());
        baseToken = IERC20(_token);
        portfolioId = _portfolioId;
    }

    function onERC721Received(address, address, uint256, bytes memory) public returns (bytes4) {
        address rayTokenContract = rayStorage().getContractAddress(RAY_TOKEN_CONTRACT);
        require(_msgSender() == rayTokenContract, "RAYModule: only accept RAY Token transfers");
        return ERC721_RECEIVER;
    }

    function deposit(address token, address, uint256 amount) public onlyDefiOperator {
        require(token == address(baseToken), "RAYProtocol: token not supported");
        IERC20(token).transferFrom(_msgSender(), address(this), amount);
        IRAYPortfolioManager pm = rayPortfolioManager();
        IERC20(token).approve(address(pm), amount);
        if (rayTokenId == 0x0) {
            rayTokenId = pm.mint(portfolioId, address(this), amount);
        } else {
            pm.deposit(rayTokenId, amount);
        }
    }

    function withdraw(address beneficiary, address token, uint256 amount) public onlyDefiOperator {
        rayPortfolioManager().redeem(rayTokenId, amount, address(0));
        IERC20(token).transfer(beneficiary, amount);
    }

    function balanceOf(address token) public returns(uint256) {
        if (token != address(baseToken)) return 0;
        if (rayTokenId == 0x0) return 0;
        (uint256 amount,) = rayNAVCalculator().getTokenValue(portfolioId, rayTokenId);
        return amount;
    }
    
    function balanceOfAll() public returns(uint256[] memory) {
        uint256[] memory balances = new uint256[](1);
        balances[0] = balanceOf(address(baseToken));
        return balances;
    }

    function supportedTokens() public view returns(address[] memory){
        address[] memory tokens = new address[](1);
        tokens[0] = address(baseToken);
        return tokens;
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
