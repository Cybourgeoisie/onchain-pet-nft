//SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "./DigitalPet.sol";
import "./MetadataRenderer.sol";

contract DigitalPetNft is ERC721, Ownable {
	using Strings for uint256;

	// Contracts
	MetadataRenderer public metadataRenderer;
	address public nftMintContract;

	// Constants
	string public constant TOKEN_NAME = "Digital Pet";
	string public constant TOKEN_SYMBOL = "DPET";
	uint256 public constant MAX_TOKENS = 5555;

	// Variables
	uint256 public totalPets = 0;
	uint256 public totalNfts = 0;
	uint256 public randomNumber = 0;

	// NFT ID to DigitalPet mapping
	// I want to change this to each NFT having a set of DigitalPets, but only one active at a time
	// Could store historical pets in a separate mapping
	mapping(uint256 => NftAccount) public nftAccounts;
	mapping(uint256 => DigitalPet) public digitalPets;

	constructor(address _MetadataRendererAddress) ERC721(TOKEN_NAME, TOKEN_SYMBOL) Ownable(_msgSender()) {
		setMetadataRendererAddress(_MetadataRendererAddress);
	}

	function totalSupply() public view returns (uint256) {
		return totalNfts;
	}


	/**
	 * Player functionality
	 **/

	// Spawn a new pet for a player
	function spawnNewPet(uint256 tokenId) public {
		require(_msgSender() == ownerOf(tokenId), "Only owner can spawn new pet");
		createPet(tokenId);
	}

	// Feed the active pet for a player
	function feed(uint256 tokenId) public {
		require(_msgSender() == ownerOf(tokenId), "Only owner can feed pet");
		DigitalPet storage pet = digitalPets[nftAccounts[tokenId].activePetId];
		pet.lastMealTime = block.timestamp;
		pet.feedings++;
	}

	function treat(uint256 tokenId) public {
		require(_msgSender() == ownerOf(tokenId), "Only owner can treat pet");
		DigitalPet storage pet = digitalPets[nftAccounts[tokenId].activePetId];
		pet.treatsSinceLastMeal++;
	}

	// Play with the active pet for a player
	function playWith(uint256 tokenId) public {
		require(_msgSender() == ownerOf(tokenId), "Only owner can play with pet");
		DigitalPet storage pet = digitalPets[nftAccounts[tokenId].activePetId];
		pet.lastPlayTime = block.timestamp;
		pet.playtimes++;
	}

	// Keeps the pet alive, but they get lonely
	function setAutofeeder(uint256 tokenId, bool setting) public {
		require(_msgSender() == ownerOf(tokenId), "Only owner can set autofeeder");
		digitalPets[nftAccounts[tokenId].activePetId].autofeeder = setting;
	}

	/**
	 * Pet health & wellbeing
	 **/
	function getHappiness(uint256 tokenId) public view returns (uint256) {
		_requireOwned(tokenId);
		DigitalPet memory pet = getActivePet(tokenId);
		uint256 hunger = getHunger(tokenId);
		uint256 weight = getWeight(tokenId);

		// How active is the owner with the pet?
		uint256 timeSinceLastMeal = block.timestamp - pet.lastMealTime;
		uint256 timeSinceLastPlay = block.timestamp - pet.lastPlayTime;

		// The lower the number, the happier the pet
		// Where the pet is happiest when hunger is <= 59, and weight is <= 60
		uint256 happiness =
			(hunger <= 59 ? 0 : 1) +
			(weight <= 60 ? 0 : 1) +
			(pet.treatsSinceLastMeal >= 1 ? 0 : 1) +
			(timeSinceLastMeal < 86400 * 3 ? 0 : 1) +
			(timeSinceLastPlay < 86400 * 3 ? 0 : 1);

		return happiness > 100 ? 100 : happiness;
	}

	function getHunger(uint256 tokenId) public view returns (uint256) {
		_requireOwned(tokenId);
		DigitalPet memory pet = getActivePet(tokenId);
		uint256 timeSinceLastMeal = block.timestamp - pet.lastMealTime;
		uint256 treats = pet.treatsSinceLastMeal;

		// If using the autofeeder, hunger resets every 24 hours
		if (pet.autofeeder) {
			return (timeSinceLastMeal + 1800 * treats) % 86400 * 100 / 86400;
		}

		// On a scale of 0-100, 0 being full, 100 being starving,
		// Where the pet loses 1% hunger every 30 minutes (1800 seconds)
		// The optimal time to feed is when hunger is between 38-59 (next feeding within 19 to 29 hours)
		uint256 hunger = timeSinceLastMeal / 1800;
		if (treats > hunger) {
			hunger = 0;
		} else {
			hunger -= treats;
		}

		return hunger > 100 ? 100 : hunger;
	}

	function getWeight(uint256 tokenId) public view returns (uint256) {
		_requireOwned(tokenId);
		DigitalPet memory pet = getActivePet(tokenId);

		// Need an actual algorithm here, this doesn't make sense

		uint256 ageInDays = (block.timestamp - pet.birthTime) / 86400;
		uint256 avgFeedings = pet.feedings * 100 / ageInDays;
		uint256 avgPlaytimes = pet.playtimes * 100 / ageInDays;

		// On a scale of 0-100, 0 being underweight, 100 being overweight,
		// Where the pet gains 1% weight every 10 feedings, and loses 1% weight every 10 playtimes
		uint256 weight = (avgFeedings >= avgPlaytimes) ? avgFeedings - avgPlaytimes : avgPlaytimes - avgFeedings;
		return weight > 100 ? 100 : weight;
	}


	/**
	 * Read-only, utility functions
	 **/

	// Get the active pet for a player
	function getActivePet(uint256 tokenId) public view returns (DigitalPet memory) {
		_requireOwned(tokenId);
		return digitalPets[nftAccounts[tokenId].activePetId];
	}

	// Get pet by ID
	function getPet(uint256 petId) public view returns (DigitalPet memory) {
		return digitalPets[petId];
	}

	// Get all pets for a player
	function getAllPets(uint256 tokenId) public view returns (DigitalPet[] memory) {
		_requireOwned(tokenId);
		uint256[] memory petIds = nftAccounts[tokenId].digitalPetIds;
		DigitalPet[] memory pets = new DigitalPet[](petIds.length);

		for (uint256 i = 0; i < petIds.length; i++) {
			pets[i] = digitalPets[petIds[i]];
		}

		return pets;
	}


	/**
	 * Internal functions
	 **/
	function nextRandom() internal returns (uint256) {
		randomNumber = uint256(
			keccak256(
				abi.encodePacked(
					block.prevrandao,
					block.timestamp,
					randomNumber
				)
			)
		);

		return randomNumber;
	}

	// Create a new pet for a player
	function createPet(uint256 tokenId) internal {
		_requireOwned(tokenId);

		// Increment total pets
		totalPets++;

		// Create the new pet
		uint256 newPetId = totalPets;
		digitalPets[newPetId] = DigitalPet(
			newPetId,
			nftAccounts[tokenId].dna,
			block.timestamp,
			block.timestamp,
			block.timestamp,
			0,
			0,
			0,
			false
		);

		// Add the new pet to the player's account & set it as active
		nftAccounts[tokenId].digitalPetIds.push(newPetId);
		nftAccounts[tokenId].activePetId = newPetId;
	}


	/**
	 * Metadata functionality
	 **/

	function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
		_requireOwned(tokenId);
		return metadataRenderer.generateTokenURI(
			tokenId,
			digitalPets[nftAccounts[tokenId].activePetId]
		);
	}


	/**
	 * Minting functionality
	 **/
	// Next random is like 10% of the cost, the bulk of the above is the storage write
	function mintFromMintContract(address to, uint256 count) external {
		require(msg.sender == nftMintContract, "Only mint contract can mint");
		require(count > 0, "Count must be greater than 0");
		require(totalNfts + count <= MAX_TOKENS, "Max tokens minted");

		for (uint256 i = 0; i < count; i++) {
			totalNfts++;
			_mint(to, totalNfts);

			// This NFT gets an account of Digital Pets
			nftAccounts[totalNfts] = NftAccount(
				totalNfts,
				nextRandom(),
				0,
				new uint256[](0)
			);

			// Create the first Digital Pet for this NFT
			createPet(totalNfts);
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
