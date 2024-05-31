// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./ContractDataStorage.sol";
import "./DigitalPet.sol";

contract MetadataRenderer is Ownable {
	using Strings for uint256;

	// Contracts
	ContractDataStorage public contractDataStorage;

	constructor(address _ContractDataStorageAddress) Ownable(_msgSender()) {
		setContractDataStorageAddress(_ContractDataStorageAddress);
	}

	function setContractDataStorageAddress(address _ContractDataStorageAddress) public onlyOwner {
		contractDataStorage = ContractDataStorage(_ContractDataStorageAddress);
	}

	function generateTokenURI(
		uint256 tokenId,
		DigitalPet memory _digitalPet
	)
		public
		pure
		returns (string memory)
	{
		return string(
			abi.encodePacked(
				abi.encodePacked(
					bytes('data:application/json;utf8,{"name":"'),
					getName(tokenId),
					bytes('","description":"'),
					getDescription(tokenId, _digitalPet),
					bytes('","external_url":"'),
					getExternalUrl(tokenId),
					bytes('","animation_url":"'),
					renderHtml(tokenId)
				),
				abi.encodePacked(
					bytes('","attributes":['),
					getAttributes(tokenId),
					bytes(']}')
				)
			)
		);
	}

	function getName(uint256 tokenId) public pure returns (string memory) {
		return string(
			abi.encodePacked(
				"Token #",
				tokenId.toString()
			)
		);
	}

	function getDescription(uint256 tokenId, DigitalPet memory _digitalPet) public pure returns (string memory) {
		return string(
			abi.encodePacked(
				"Token ID: ",
				tokenId.toString(),
				" | Active Pet ID: ",
				_digitalPet.petId.toString(),
				" | DNA: ",
				_digitalPet.dna.toString(),
				" | Birth Time: ",
				_digitalPet.birthTime.toString()
			)
		);
	}

	function getExternalUrl(uint256 tokenId) public pure returns (string memory) {
		return string(
			abi.encodePacked(
				"https://example.com/token/",
				tokenId.toString()
			)
		);
	}

	function getAttributes(uint256 tokenId) public pure returns (string memory) {
		return string(
			abi.encodePacked(
				"{\"trait_type\":\"tokenId\",\"value\":\"",
				tokenId.toString(),
				bytes("\"}")
			)
		);
	}

	function renderHtml(uint256 tokenId) public pure returns (string memory) {
		return string(
			abi.encodePacked(
				bytes('data:text/html;charset=utf-8,<html><body><div id=\\\"counter\\\">0</div>for token #'),
				tokenId.toString(),
				bytes('<script>setInterval(() => {const counter = document.getElementById(\'counter\'); counter.innerHTML = parseInt(counter.innerHTML, 10) + 1;}, 1000);</script></body></html>"}')
			)
		);
	}
}