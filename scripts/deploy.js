// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
require("hardhat");
const { ethers } = require("hardhat");

async function main() {
	// Check the address of the sender
	const [deployer] = await ethers.getSigners();

	console.log("Deploying contracts with the account:", deployer.address);

	console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

	// Get the contracts to deploy
	const contract = await ethers.getContractFactory("TestNft");

	// Deploy contract
	const _contract = await contract.deploy();
	await _contract.waitForDeployment();
	console.log("contract deployed to:", await _contract.getAddress());
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
