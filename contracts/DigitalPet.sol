// Digital Pet Structure
struct DigitalPet {
	uint256 petId;
	uint256 dna;
	uint256 birthTime;
	uint256 lastMealTime;
	uint256 lastPlayTime;
	uint256 lastSleepTime;
	uint256 lastExerciseTime;
}

// NFT Structure
struct NftAccount {
	uint256 nftId;
	uint256 dna;
	uint256 activePetId;
	uint256[] digitalPetIds;
}
