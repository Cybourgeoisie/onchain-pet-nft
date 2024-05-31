const { ethers } = require("hardhat");
const { expect } = require("chai");

describe('"Digital Pet NFT" Tests', function () {
	let contract;
	let owner,
		accts = [];

	before(async () => {
		[owner, ...accts] = await ethers.getSigners();

		// Deploy contract
		const DigitalPetNft = await ethers.getContractFactory("DigitalPetNft");
		contract = await DigitalPetNft.deploy(owner.address);
	});

	it("Initialization sanity checks", async () => {
		expect(await contract.owner()).to.equal(owner.address);
		expect(await contract.totalSupply()).to.equal(0);
		expect(await contract.balanceOf(owner.address)).to.equal(0);
	});
});
