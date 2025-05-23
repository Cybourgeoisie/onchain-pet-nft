// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
	// Check the address of the sender
	const [deployer] = await ethers.getSigners();

	console.log("Deploying contracts with the account:", deployer.address);
	console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

	// Get the sale merkle root
	const saleMerkleRoot = fs.readFileSync(__dirname + "/merkledata/sale-merkleroot.txt", "utf8").trim();

	// Get the contracts to deploy
	const cdsContract = await ethers.getContractFactory("ContractDataStorage");
	const mrContract = await ethers.getContractFactory("MetadataRenderer");
	const nftContract = await ethers.getContractFactory("DigitalPetNft");
	const mintContract = await ethers.getContractFactory("MintContract");

	// Deploy contract
	const _cdsContract = await cdsContract.deploy();
	await _cdsContract.waitForDeployment();
	const cdsAddress = await _cdsContract.getAddress();
	console.log("Contract Data Storage deployed to:", cdsAddress);

	const _mrContract = await mrContract.deploy(cdsAddress);
	await _mrContract.waitForDeployment();
	const mrAddress = await _mrContract.getAddress();
	console.log("Metadata Renderer deployed to:", mrAddress);

	const _nftContract = await nftContract.deploy(mrAddress);
	await _nftContract.waitForDeployment();
	const nftAddress = await _nftContract.getAddress();
	console.log("Digital Pet NFT deployed to:", nftAddress);

	const _mintContract = await mintContract.deploy(nftAddress, saleMerkleRoot);
	await _mintContract.waitForDeployment();
	const mintAddress = await _mintContract.getAddress();
	console.log("Mint Contract deployed to:", mintAddress);

	// Set the mint contract address
	await _nftContract.setMintContractAddress(mintAddress);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
