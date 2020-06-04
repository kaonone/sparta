pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC721/ERC721Burnable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC721/ERC721Metadata.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC721/IERC721Receiver.sol";
import "../interfaces/defi/IRAYStorage.sol";
import "../interfaces/defi/IRAYNAVCalculator.sol";
import "../interfaces/defi/IRAYPortfolioManager.sol";
import "../token/FreeDAI.sol";
import "../common/Base.sol";

contract RAYStub is Base, IRAYStorage, IRAYNAVCalculator, IRAYPortfolioManager, IERC721Receiver, ERC721, ERC721Burnable, ERC721Metadata {
    using SafeMath for uint256;

    uint256 public constant EXP_SCALE = 1e18;  //Exponential scale (see Compound Exponential)
    uint256 public constant INTEREST_RATE = 10 * EXP_SCALE / 100;  // Annual interest 10%
    uint256 public constant ANNUAL_SECONDS = 365*24*60*60+(24*60*60/4);  // Seconds in a year + 1/4 day to compensate leap years
    bytes4 internal constant ERC721_RECEIVER = bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));

    struct TokenData {
        bytes32 portfolioId;
        uint256 updated;
        uint256 value;
    }

    FreeDAI dai;
    uint256 nextId;
    mapping(bytes32 => TokenData) tokenData;

    function initialize(address _dai) public initializer {
        Base.initialize();
        ERC721.initialize();
        ERC721Metadata.initialize("Robo Advisor for Yield", "RAY");
        dai = FreeDAI(_dai);
        nextId = 1;
    }

    function mint(bytes32 portfolioId, address beneficiary, uint256 value) public payable returns(bytes32) {
        uint256 tokenId = nextId++;
        tokenData[bytes32(tokenId)] = TokenData({
            portfolioId: portfolioId,
            updated: now,
            value: value
        });
        if (value > 0) {
            require(dai.transferFrom(_msgSender(), address(this), value), "RAYStub: failed to deposit DAI");
        }
        _safeMint(beneficiary, tokenId);
        return bytes32(tokenId);
    }

    function deposit(bytes32 tokenId, uint256 value) public payable {
        require(dai.transferFrom(_msgSender(), address(this), value), "RAYStub: failed to deposit DAI");
        TokenData storage td = tokenData[tokenId];
        uint256 currentValue = _getTokenValue(tokenId);
        td.value = currentValue.add(value);
        td.updated = now;
    }

    function redeem(bytes32 tokenId, uint256 valueToWithdraw, address) public returns(uint) {
        address tokenOwner = ownerOf(uint256(tokenId));
        require(_msgSender() == tokenOwner, "RayStub: only owner can redeem");
        TokenData storage td = tokenData[tokenId];
        uint256 currentValue = _getTokenValue(tokenId);
        td.value = currentValue.sub(valueToWithdraw);
        td.updated = now;
        _sendDai(tokenOwner, valueToWithdraw);
        return valueToWithdraw;
    }

    function getTokenValue(bytes32, bytes32 tokenId) public returns(uint256, uint256) {
        return (_getTokenValue(tokenId), 0);
    }

    function onERC721Received(address, address from, uint256 tokenId, bytes memory) public returns (bytes4) {
        _burn(from, tokenId);
        return ERC721_RECEIVER;
    }

    function getTokenKey(bytes32 rayTokenId) public view returns (bytes32) {
        return tokenData[rayTokenId].portfolioId;
    }

    function getPrincipalAddress(bytes32) public view returns (address) {
        return address(dai);
    }

    function getIsERC20(address principalAddress) public view returns (bool) {
        return (principalAddress == address(dai));
    }

    function getContractAddress(bytes32) public view returns (address) {
        return address(this);
    }

    function getTokenShares(bytes32, bytes32) public view returns (uint256) {
        return 0; // not used in tests
    }

    function getTokenCapital(bytes32, bytes32) public view returns (uint256) {
        return 0; // not used in tests
    }

    function getTokenAllowance(bytes32, bytes32) public view returns (uint256) {
        return 0; // not used in tests
    }

    function getTokenValueStub(bytes32 tokenId) public view returns(uint256, uint256) {
        return (_getTokenValue(tokenId), 0);
    }

    function _burn(address owner, uint256 tokenId) internal {
        uint256 currentValue = _getTokenValue(bytes32(tokenId));
        delete tokenData[bytes32(tokenId)];
        super._burn(owner, tokenId);
        _sendDai(owner, currentValue);
    }

    function _sendDai(address beneficiary, uint256 amount) internal {
        uint256 daiBalance = dai.balanceOf(address(this));
        if (amount > daiBalance) {
            dai.mint(amount - daiBalance);
        }
        dai.transfer(beneficiary, amount);
    }

    function _getTokenValue(bytes32 tokenId) internal view returns(uint256) {
        TokenData storage td = tokenData[tokenId];
        uint256 interest = td.value.mul(INTEREST_RATE).mul(now - td.updated).div(ANNUAL_SECONDS).div(EXP_SCALE);
        return td.value.add(interest);
    }

}