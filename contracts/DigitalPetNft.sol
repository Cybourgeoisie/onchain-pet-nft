//SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "./MetadataRenderer.sol";

contract DigitalPetNft is ERC721, Ownable {
	using Strings for uint256;

	// Contracts
	MetadataRenderer public metadataRenderer;
	address public nftMintContract;

	// Constants
	string public TOKEN_NAME = "Digital Pet";
	string public TOKEN_SYMBOL = "DPET";
	uint256 public MAX_TOKENS = 5555;

	// Variables
	uint256 private totalMinted = 0;

	constructor(address _MetadataRendererAddress) ERC721(TOKEN_NAME, TOKEN_SYMBOL) Ownable(_msgSender()) {
		setMetadataRendererAddress(_MetadataRendererAddress);
	}

	function totalSupply() public view returns (uint256) {
		return totalMinted;
	}

	/**
	 * Metadata functionality
	 **/

	function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
		_requireOwned(tokenId);
		return metadataRenderer.generateTokenURI(tokenId);
	}


	/**
	 * Minting functionality
	 **/
	function mintFromMintContract(address to, uint256 count) external {
		require(msg.sender == nftMintContract, "Only mint contract can mint");
		require(count > 0, "Count must be greater than 0");
		require(totalMinted + count <= MAX_TOKENS, "Max tokens minted");

		for (uint256 i = 0; i < count; i++) {
			totalMinted++;
			_mint(to, totalMinted);
		}
	}

	/**
	 * Owner-only functions
	 **/
	function setMintContractAddress(address _MintContract) public onlyOwner {
		nftMintContract = _MintContract;
	}

	function setMetadataRendererAddress(address _MetadataRendererAddress) public onlyOwner {
		metadataRenderer = MetadataRenderer(_MetadataRendererAddress);
	}

	function withdraw() public onlyOwner {
		uint256 balance = address(this).balance;
		(bool success,) = msg.sender.call{value: balance}('');
		require(success, 'Fail Transfer');
	}
}
