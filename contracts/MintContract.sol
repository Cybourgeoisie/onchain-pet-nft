// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./DigitalPetNft.sol";

contract MintContract is ReentrancyGuard, Ownable
{
	// NFT contract
	DigitalPetNft public digitalPetNft;

	// CONSTANTS
	uint256 public constant MINT_PRICE = 0.0042 ether;

	// Sale Allowlist
	bytes32 public saleMerkleRoot;
	mapping(address => uint) public saleAllowlistClaimed;

	// Random mint variables
	uint256 internal _leftToMint;

	// Sale switches
	bool internal _saleStarted = false;
	bool internal _openSale = false;

	constructor(
		address _NftAddress,
		bytes32 _saleMerkleRoot
	)
		ReentrancyGuard()
		Ownable(_msgSender())
	{
		// Set the token address
		digitalPetNft = DigitalPetNft(_NftAddress);

		// Set the remaining to mint, as well as purchase and claim mints remaining
		_leftToMint = digitalPetNft.MAX_TOKENS() - digitalPetNft.totalSupply();

		// Set the allowlist sale merkleRoot
		setSaleMerkleRoot(_saleMerkleRoot);
	}

	function setSaleStarted(bool _setting) public onlyOwner {
		_saleStarted = _setting;
	}

	function isSaleStarted() public view returns (bool) {
		return _saleStarted;
	}

	function setOpenSale(bool _setting) public onlyOwner {
		_openSale = _setting;
	}

	function isOpenSale() public view returns (bool) {
		return _openSale;
	}

	function purchase(
		bytes32[] calldata _proof,
		uint256 _allowedAmount,
		uint256 _numTokens
	)
		external
		payable
		nonReentrant
	{
		// Require that the sale has started
		require(_saleStarted, "Sale has not started");

		// Validate that number of tokens is greater than zero
		require(_numTokens > 0, "Must mint 1 or more tokens");

		// Sanity check -- validate that we don't mint more than the total
		require(_numTokens <= _leftToMint, "Mint request exceeds supply");

		// If not an open sale, check that the user is on the allowlist
		if (!_openSale) {
			require(reviewSaleProof(msg.sender, _proof, _allowedAmount), "Proof does not match data");
			require((saleAllowlistClaimed[msg.sender] + _numTokens) <= _allowedAmount, "Can not exceed permitted amount");
		}

		// Validate ETH sent
		require((MINT_PRICE * _numTokens) == msg.value, "Incorrect ETH value sent");

		// Update remaining mints
		_leftToMint -= _numTokens;

		// Update allowlist claimed
		saleAllowlistClaimed[msg.sender] = saleAllowlistClaimed[msg.sender] + _numTokens;

		// Mint the tokens
		digitalPetNft.mintFromMintContract(msg.sender, _numTokens);
	}

	function countRemainingMints() public view returns (uint256) {
		return _leftToMint;
	}

	/**
	 * Withdraw functions
	 **/
	function withdraw() public onlyOwner {
		uint256 balance = address(this).balance;
		(bool success,) = msg.sender.call{value: balance}('');
		require(success, 'Fail Transfer');
	}

	/**
	 * Allowlist Merkle Data
	 * Credit for Merkle setup code: Cobble
	 **/
	function getLeaf(address addr, uint256 amount) public pure returns(bytes32) {
		return keccak256(abi.encodePacked(addr, amount));
	}

	function reviewSaleProof(
		address _sender,
		bytes32[] calldata _proof,
		uint256 _allowedAmount
	) public view returns (bool) {
		return MerkleProof.verify(_proof, saleMerkleRoot, getLeaf(_sender, _allowedAmount));
	}

	function setSaleMerkleRoot(bytes32 _merkleRoot) public onlyOwner {
		saleMerkleRoot = _merkleRoot;
	}
}
