// Digital Pet Structure
struct DigitalPet {
	uint256 petId;
	uint256 dna;
	uint256 birthTime;
	uint256 lastMealTime;
	uint256 lastPlayTime;
	uint256 feedings;
	uint256 treatsSinceLastMeal;
	uint256 playtimes;
	bool autofeeder;
}

// NFT Structure
struct NftAccount {
	uint256 nftId;
	uint256 dna;
	uint256 activePetId;
	uint256[] digitalPetIds;
}
