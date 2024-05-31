const { ethers } = require("hardhat");
const { expect } = require("chai");
const fs = require("fs");

const merkleMaker = require(__dirname + "/../scripts/merkleMaker.js");

const MINT_PRICE = 0.0042;

const saleAllowlist = {
	"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266": [10000],
	"0x70997970C51812dc3A010C7d01b50e0d17dc79C8": [10000],
	"0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC": [10000],
};

let saleMerkleData = merkleMaker.generateMerkleData(saleAllowlist);

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
		const saleMerkleRoot = "0x" + saleMerkleData.rootHash.toString("hex");

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

	// Start the sale
	it("Start the sale", async () => {
		await mintContract.setSaleStarted(true);
		expect(await mintContract.isSaleStarted()).to.equal(true);
	});

	// Mint a few NFTs
	it("Mint 5 NFTs", async () => {
		let user1MerkleData = merkleMaker.getMerkleProof(saleMerkleData, accts[0].address);
		await mintContract.connect(accts[0]).purchase(user1MerkleData.proof, user1MerkleData.allowedAmount, 5, {
			value: ethers.parseEther(String(Math.round(MINT_PRICE * 5 * 10000) / 10000)),
		});

		expect(await nftContract.totalSupply()).to.equal(5);
		expect(await nftContract.balanceOf(owner.address)).to.equal(0);
	});

	// View the metadata
	it.skip("View the metadata", async () => {
		for (let i = 1; i <= 5; i++) {
			let metadata = await nftContract.tokenURI(i);
			console.log(metadata);
		}
	});
});
