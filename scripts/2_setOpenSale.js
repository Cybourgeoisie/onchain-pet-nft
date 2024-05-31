require("hardhat");
const { ethers } = require("hardhat");
const CONTRACTS = require("./0_contracts.js");

const SETTING = true;

async function main() {
	const networkName = hre.network.name;
	const CONTRACT_ADDRESS = CONTRACTS[networkName]["mint"];

	// We get the contract to deploy
	const MintContract = await ethers.getContractFactory("MintContract");
	const contract = await MintContract.attach(CONTRACT_ADDRESS);

	let tx = await contract.setOpenSale(SETTING);
	let receipt = await tx.wait();

	console.log(receipt);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
