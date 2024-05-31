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

	// Constants
	string private TOKEN_NAME = "Digital Pet";
	string private TOKEN_SYMBOL = "DPET";
	uint256 private MAX_TOKENS = 5555;

	// Variables
	uint256 private totalMinted = 0;

	constructor(address _MetadataRendererAddress) ERC721(TOKEN_NAME, TOKEN_SYMBOL) Ownable(_msgSender()) {
		setMetadataRendererAddress(_MetadataRendererAddress);
	}

	/**
	 * Metadata functionality
	 **/

	function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
		_requireOwned(tokenId);

		return string(
			abi.encodePacked(
				bytes('data:application/json;utf8,{"name":"Test NFT #'),
				tokenId.toString(),
				bytes('","description":"Test description for test NFT.",'),
				bytes('"animation_url":"data:text/html;charset=utf-8,<html><body><div id=\\\"counter\\\">0</div><script>setInterval(() => {const counter = document.getElementById(\'counter\'); counter.innerHTML = parseInt(counter.innerHTML, 10) + 1;}, 1000);</script></body></html>"}')
			)
		);
	}


	/**
	 * Minting functionality
	 **/
	function totalSupply() public view returns (uint256) {
		return totalMinted;
	}

	function mint(address to, uint256 count) external {
		require(totalMinted < MAX_TOKENS, "Max tokens minted");
		require(totalMinted + count <= MAX_TOKENS, "Max tokens minted");

		for (uint256 i = 0; i < count; i++) {
			totalMinted++;
			_mint(to, totalMinted);
		}
		//block.prevrandao
	}


	/**
	 * Owner-only functions
	 **/
	function setMetadataRendererAddress(address _MetadataRendererAddress) public onlyOwner {
		metadataRenderer = MetadataRenderer(_MetadataRendererAddress);
	}

	function withdraw() public onlyOwner {
		uint256 balance = address(this).balance;
		(bool success,) = msg.sender.call{value: balance}('');
		require(success, 'Fail Transfer');
	}
}
