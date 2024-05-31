require("hardhat");
const { expect } = require("chai");
const fs = require("fs");

const merkleMaker = require(__dirname + "/../scripts/merkleMaker.js");

const {
	expectRevert, // Assertions for transactions that should fail
} = require("@openzeppelin/test-helpers");

const MINT_PRICE = 0.0042;

const saleAllowlist = {
	"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266": [10000],
	"0x70997970C51812dc3A010C7d01b50e0d17dc79C8": [10000],
	"0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC": [10000],
	"0x90F79bf6EB2c4f870365E785982E1f101E93b906": [2],
	"0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65": [0],
	"0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc": [0],
	"0x976EA74026E726554dB657fA54763abd0C3a0aa9": [0],
	"0x14dC79964da2C08b23698B3D3cc7Ca32193d9955": [5],
	"0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f": [5],
};

let saleMerkleData = merkleMaker.generateMerkleData(saleAllowlist);

describe("NFT Mint Tests", async () => {
	let cdsContract,
		mrContract,
		nftContract,
		mintContract,
		provider,
		owner,
		accts = [];

	let saleMerkleRoot = "0x" + saleMerkleData.rootHash.toString("hex");

	/**
	 * Helper functions
	 **/
	function reviewMints(receipt, to) {
		let eventPresent = false;
		for (const log of receipt.logs) {
			let event;
			try {
				event = nftContract.interface.parseLog(log);
			} catch (_) {
				continue;
			}

			if (event.name === "Transfer") {
				// Make sure that the transfer event has everything expected of it - from, to, id, value
				expect(event.args.from).to.equal("0x0000000000000000000000000000000000000000");
				expect(event.args.to).to.equal(to.address);
				expect(event.args.tokenId).to.be.greaterThan(0);

				// Make sure an event fired
				eventPresent = true;
			}
		}

		// Verify that the event fired
		expect(eventPresent).to.equal(true);
	}

	before(async () => {
		provider = hre.network.provider;

		[owner, ...accts] = await ethers.getSigners();

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
	});

	it("Should allow owner to set mint contract address", async () => {
		await nftContract.setMintContractAddress(mintContract.target);

		let res = await nftContract.nftMintContract();
		expect(res).to.equal(mintContract.target);
	});

	it("Should NOT allow non-owner to set mint contract address", async () => {
		await expectRevert(nftContract.connect(accts[0]).setMintContractAddress(accts[1].address), `OwnableUnauthorizedAccount("${accts[0].address}")`);
		await expectRevert(nftContract.connect(accts[1]).setMintContractAddress(accts[1].address), `OwnableUnauthorizedAccount("${accts[1].address}")`);
		await expectRevert(nftContract.connect(accts[2]).setMintContractAddress(accts[1].address), `OwnableUnauthorizedAccount("${accts[2].address}")`);
	});

	it("Should NOT allow owner and non-owners to mint tokens", async () => {
		await expectRevert(nftContract.connect(owner).mintFromMintContract(accts[1].address, 1), "Only mint contract can mint");
		await expectRevert(nftContract.connect(accts[0]).mintFromMintContract(accts[1].address, 1), "Only mint contract can mint");
		await expectRevert(nftContract.connect(accts[1]).mintFromMintContract(accts[1].address, 1), "Only mint contract can mint");
	});

	it("Should NOT allow non-owners to start sale", async () => {
		await expectRevert(mintContract.connect(accts[0]).setSaleStarted(true), `OwnableUnauthorizedAccount("${accts[0].address}")`);
		await expectRevert(mintContract.connect(accts[1]).setSaleStarted(true), `OwnableUnauthorizedAccount("${accts[1].address}")`);
	});

	it("Should NOT allow users to purchase before sale starts", async () => {
		let user1MerkleData = merkleMaker.getMerkleProof(saleMerkleData, accts[0].address);
		await expectRevert(
			mintContract.connect(accts[0]).purchase(user1MerkleData.proof, user1MerkleData.allowedAmount, 3, {
				value: ethers.parseEther(String(Math.round(MINT_PRICE * 3 * 10000) / 10000)),
			}),
			"Sale has not started",
		);

		await expectRevert(
			mintContract.connect(accts[9]).purchase([], 0, 3, {
				value: ethers.parseEther(String(Math.round(MINT_PRICE * 3 * 10000) / 10000)),
			}),
			"Sale has not started",
		);
	});

	it("Should allow owner to start the sale", async () => {
		expect(await mintContract.isSaleStarted()).to.equal(false);
		await mintContract.setSaleStarted(true);
		expect(await mintContract.isSaleStarted()).to.equal(true);
	});

	it("Should NOT allow owner or non-owners to purchase without correct Ether value", async () => {
		let ownerMerkleData = merkleMaker.getMerkleProof(saleMerkleData, owner.address);
		await expectRevert(
			mintContract.connect(owner).purchase(ownerMerkleData.proof, ownerMerkleData.allowedAmount, 3, { value: 1 }),
			"Incorrect ETH value sent",
		);

		let user1MerkleData = merkleMaker.getMerkleProof(saleMerkleData, accts[0].address);
		await expectRevert(
			mintContract.connect(accts[0]).purchase(user1MerkleData.proof, user1MerkleData.allowedAmount, 3, { value: 1 }),
			"Incorrect ETH value sent",
		);
	});

	it("Should not allow calling internal mint function", async () => {
		try {
			mintContract.connect(owner)._mint(accts[0].address, 1);
		} catch (ex) {
			expect(ex.toString()).to.equal("TypeError: mintContract.connect(...)._mint is not a function");
			return;
		}

		expect(false).to.equal(true);
	});

	it("Should allow EOA on Allowlist to purchase NFT", async () => {
		let user1MerkleData = merkleMaker.getMerkleProof(saleMerkleData, accts[0].address);

		let tx = await mintContract.connect(accts[0]).purchase(user1MerkleData.proof, user1MerkleData.allowedAmount, 3, {
			value: ethers.parseEther(String(Math.round(MINT_PRICE * 3 * 10000) / 10000)),
		});

		let receipt = await tx.wait();
		reviewMints(receipt, accts[0]);

		let res = await nftContract.balanceOf(accts[0].address);
		expect(res).to.equal(3);

		res = await nftContract.totalSupply();
		expect(res).to.equal(3);
	});

	it("Should NOT allow random EOA to purchase NFT yet", async () => {
		await expectRevert(
			mintContract.connect(accts[11]).purchase([], 100, 3, {
				value: ethers.parseEther(String(Math.round(MINT_PRICE * 3 * 10000) / 10000)),
			}),
			"Proof does not match data",
		);
	});

	it("Should allow owner to PAUSE the sale", async () => {
		expect(await mintContract.isSaleStarted()).to.equal(true);
		await mintContract.setSaleStarted(false);
		expect(await mintContract.isSaleStarted()).to.equal(false);
	});

	it("Should allow owner to RESTART the sale", async () => {
		expect(await mintContract.isSaleStarted()).to.equal(false);
		await mintContract.setSaleStarted(true);
		expect(await mintContract.isSaleStarted()).to.equal(true);
	});

	it("Should NOT allow minting more than remaining purchase supply", async () => {
		let user2MerkleData = merkleMaker.getMerkleProof(saleMerkleData, accts[1].address);

		await expectRevert(
			mintContract.connect(accts[1]).purchase(user2MerkleData.proof, user2MerkleData.allowedAmount, 11000, {
				value: ethers.parseEther(String(Math.round(MINT_PRICE * 11000 * 10000) / 10000)),
			}),
			"Mint request exceeds supply",
		);
	});

	it("Should NOT allow minting more than permitted in allowlist", async () => {
		let user3MerkleData = merkleMaker.getMerkleProof(saleMerkleData, accts[2].address);

		await expectRevert(
			mintContract.connect(accts[2]).purchase(user3MerkleData.proof, user3MerkleData.allowedAmount, 3, {
				value: ethers.parseEther(String(Math.round(MINT_PRICE * 3 * 10000) / 10000)),
			}),
			"Can not exceed permitted amount",
		);
	});

	it("Should NOT allow minting if not in the allowlist", async () => {
		let user2MerkleData = merkleMaker.getMerkleProof(saleMerkleData, accts[1].address);

		await expectRevert(
			mintContract.connect(accts[3]).purchase(user2MerkleData.proof, user2MerkleData.allowedAmount, 3, {
				value: ethers.parseEther(String(Math.round(MINT_PRICE * 3 * 10000) / 10000)),
			}),
			"Proof does not match data",
		);
	});

	it("Should NOT allow minting someone else's allotment", async () => {
		let user2MerkleData = merkleMaker.getMerkleProof(saleMerkleData, accts[1].address);

		await expectRevert(
			mintContract.connect(accts[2]).purchase(user2MerkleData.proof, user2MerkleData.allowedAmount, 3, {
				value: ethers.parseEther(String(Math.round(MINT_PRICE * 3 * 10000) / 10000)),
			}),
			"Proof does not match data",
		);
	});

	it("Disallow non-owner from withdrawing", async function () {
		await expectRevert(mintContract.connect(accts[1]).withdraw(), `OwnableUnauthorizedAccount("${accts[1].address}")`);
	});

	it("Allow withdraw", async function () {
		let contractBalanceOld = await ethers.provider.getBalance(mintContract.target);
		expect(contractBalanceOld).to.equal(ethers.parseEther(String(Math.round(MINT_PRICE * 3 * 10000) / 10000)));

		let balanceOld = await ethers.provider.getBalance(owner.address);
		await mintContract.withdraw();
		let balanceNew = await ethers.provider.getBalance(owner.address);
		expect(balanceOld).to.be.lt(balanceNew);

		let contractBalanceNew = await ethers.provider.getBalance(mintContract.target);
		expect(contractBalanceNew).to.equal(0);
	});

	it("Should NOT allow minting if not in the allowlist - purchase, raffle spot but no allowlist position", async () => {
		let user4MerkleData = merkleMaker.getMerkleProof(saleMerkleData, accts[3].address);

		await expectRevert(mintContract.connect(accts[3]).purchase(user4MerkleData.proof, user4MerkleData.allowedAmount, 1), "Can not exceed permitted amount");

		let user5MerkleData = merkleMaker.getMerkleProof(saleMerkleData, accts[4].address);

		await expectRevert(mintContract.connect(accts[4]).purchase(user5MerkleData.proof, user5MerkleData.allowedAmount, 1), "Can not exceed permitted amount");

		let user6MerkleData = merkleMaker.getMerkleProof(saleMerkleData, accts[5].address);

		await expectRevert(mintContract.connect(accts[5]).purchase(user6MerkleData.proof, user6MerkleData.allowedAmount, 1), "Can not exceed permitted amount");
	});

	it("Should NOT allow minting 0 tokens", async () => {
		let user4MerkleData = merkleMaker.getMerkleProof(saleMerkleData, accts[3].address);

		await expectRevert(mintContract.connect(accts[3]).purchase(user4MerkleData.proof, user4MerkleData.allowedAmount, 0), "Must mint 1 or more tokens");
	});

	it("Should NOT allow non-owner to enable open sale", async () => {
		expect(await mintContract.isOpenSale()).to.equal(false);
		await expectRevert(mintContract.connect(accts[0]).setOpenSale(true), `OwnableUnauthorizedAccount("${accts[0].address}")`);
		await expectRevert(mintContract.connect(accts[1]).setOpenSale(true), `OwnableUnauthorizedAccount("${accts[1].address}")`);
		await expectRevert(mintContract.connect(accts[2]).setOpenSale(true), `OwnableUnauthorizedAccount("${accts[2].address}")`);
		expect(await mintContract.isOpenSale()).to.equal(false);
	});

	it("Should NOT allow someone to mint more tokens after allocation", async () => {
		let user7MerkleData = merkleMaker.getMerkleProof(saleMerkleData, accts[6].address);

		await expectRevert(mintContract.connect(accts[6]).purchase(user7MerkleData.proof, user7MerkleData.allowedAmount, 6), "Can not exceed permitted amount");
	});

	it("Should allow someone to mint.", async () => {
		let user8MerkleData = merkleMaker.getMerkleProof(saleMerkleData, accts[7].address);

		await expectRevert(mintContract.connect(accts[7]).purchase(user8MerkleData.proof, user8MerkleData.allowedAmount, 6), "Can not exceed permitted amount");

		await mintContract.connect(accts[7]).purchase(user8MerkleData.proof, user8MerkleData.allowedAmount, 5, {
			value: ethers.parseEther(String(Math.round(MINT_PRICE * 5 * 10000) / 10000)),
		});

		let res = await nftContract.balanceOf(accts[7].address);
		expect(res).to.equal(5);

		res = await nftContract.totalSupply();
		expect(res).to.equal(8);
	});

	it("Should NOT allow minting more than permitted amount if not in the allowlist", async () => {
		let user4MerkleData = merkleMaker.getMerkleProof(saleMerkleData, accts[3].address);

		await expectRevert(mintContract.connect(accts[3]).purchase(user4MerkleData.proof, user4MerkleData.allowedAmount, 2), "Can not exceed permitted amount");
	});

	it("Should allow owner to enable open sale for all allowlisted addresses", async () => {
		expect(await mintContract.isOpenSale()).to.equal(false);
		await mintContract.setOpenSale(true);
		expect(await mintContract.isOpenSale()).to.equal(true);
	});

	it("Open Sale: Should allow anyone to mint again", async () => {
		let user4MerkleData = merkleMaker.getMerkleProof(saleMerkleData, accts[3].address);

		await mintContract.connect(accts[3]).purchase(user4MerkleData.proof, user4MerkleData.allowedAmount, 3, {
			value: ethers.parseEther(String(Math.round(MINT_PRICE * 3 * 10000) / 10000)),
		});

		let res = await nftContract.balanceOf(accts[3].address);
		expect(res).to.equal(3);

		res = await nftContract.totalSupply();
		expect(res).to.equal(11);

		// Run again

		let user5MerkleData = merkleMaker.getMerkleProof(saleMerkleData, accts[4].address);

		await mintContract.connect(accts[4]).purchase(user5MerkleData.proof, user5MerkleData.allowedAmount, 3, {
			value: ethers.parseEther(String(Math.round(MINT_PRICE * 3 * 10000) / 10000)),
		});

		res = await nftContract.balanceOf(accts[4].address);
		expect(res).to.equal(3);

		res = await nftContract.totalSupply();
		expect(res).to.equal(14);

		let user6MerkleData = merkleMaker.getMerkleProof(saleMerkleData, accts[5].address);

		await mintContract.connect(accts[5]).purchase(user6MerkleData.proof, user6MerkleData.allowedAmount, 3, {
			value: ethers.parseEther(String(Math.round(MINT_PRICE * 3 * 10000) / 10000)),
		});

		res = await nftContract.balanceOf(accts[5].address);
		expect(res).to.equal(3);

		res = await nftContract.totalSupply();
		expect(res).to.equal(17);

		// Run again

		let user3MerkleData = merkleMaker.getMerkleProof(saleMerkleData, accts[2].address);

		await mintContract.connect(accts[2]).purchase(user3MerkleData.proof, user3MerkleData.allowedAmount, 3, {
			value: ethers.parseEther(String(Math.round(MINT_PRICE * 3 * 10000) / 10000)),
		});

		res = await nftContract.balanceOf(accts[2].address);
		expect(res).to.equal(3);

		res = await nftContract.totalSupply();
		expect(res).to.equal(20);

		// Run again

		let user7MerkleData = merkleMaker.getMerkleProof(saleMerkleData, accts[6].address);

		await mintContract.connect(accts[6]).purchase(user7MerkleData.proof, user7MerkleData.allowedAmount, 9, {
			value: ethers.parseEther(String(Math.round(MINT_PRICE * 9 * 10000) / 10000)),
		});

		res = await nftContract.balanceOf(accts[6].address);
		expect(res).to.equal(9);

		res = await nftContract.totalSupply();
		expect(res).to.equal(29);
	});

	it("Should allow random EOA to purchase NFT now", async () => {
		await mintContract.connect(accts[11]).purchase([], 0, 3, {
			value: ethers.parseEther(String(Math.round(MINT_PRICE * 3 * 10000) / 10000)),
		});

		let res = await nftContract.balanceOf(accts[11].address);
		expect(res).to.equal(3);

		res = await nftContract.totalSupply();
		expect(res).to.equal(32);
	});
});
