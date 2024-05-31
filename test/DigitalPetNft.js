const { ethers } = require("hardhat");
const { expect } = require("chai");
const fs = require("fs");

describe('"Digital Pet NFT" Tests', function () {
	let cdsContract,
		mrContract,
		nftContract,
		mintContract,
		owner,
		accts = [];

	before(async () => {
		[owner, ...accts] = await ethers.getSigners();

		// Get Sale Merkle Root
		const saleMerkleRoot = fs.readFileSync(__dirname + "/../scripts/merkledata/sale-merkleroot.txt", "utf8").trim();

		// Deploy contracts
		const ContractDataStorage = await ethers.getContractFactory("ContractDataStorage");
		const MetadataRenderer = await ethers.getContractFactory("MetadataRenderer");
		const DigitalPetNft = await ethers.getContractFactory("DigitalPetNft");
		const MintContract = await ethers.getContractFactory("MintContract");

		cdsContract = await ContractDataStorage.deploy();
		await cdsContract.waitForDeployment();

		mrContract = await MetadataRenderer.deploy(cdsContract.target);
		await mrContract.waitForDeployment();

		nftContract = await DigitalPetNft.deploy(mrContract.target);
		await nftContract.waitForDeployment();

		mintContract = await MintContract.deploy(nftContract.target, saleMerkleRoot);
		await mintContract.waitForDeployment();

		nftContract.setMintContractAddress(mintContract.target);
	});

	it("Initialization sanity checks", async () => {
		expect(await cdsContract.owner()).to.equal(owner.address);
		expect(await mrContract.owner()).to.equal(owner.address);
		expect(await nftContract.owner()).to.equal(owner.address);
		expect(await mintContract.owner()).to.equal(owner.address);

		expect(await nftContract.totalSupply()).to.equal(0);
		expect(await nftContract.balanceOf(owner.address)).to.equal(0);

		expect(await nftContract.name()).to.equal("Digital Pet");
	});
});
