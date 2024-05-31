/**
 * @type import('hardhat/config').HardhatUserConfig
 */

//require("hardhat");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-network-helpers");
require("@nomicfoundation/hardhat-ethers");
require("hardhat-gas-reporter");
require("dotenv").config();

module.exports = {
	solidity: {
		version: "0.8.26",
		settings: {
			optimizer: {
				enabled: true,
				runs: 200,
			},
		},
	},
	defaultNetwork: "hardhat",
	networks: {
		hardhat: {
			allowUnlimitedContractSize: false,
		},
		sepolia: {
			url: process.env.ETHEREUM_SEPOLIA_HTTPS_RPC,
			accounts: [`0x${process.env.SEPOLIA_PRIVATE_KEY}`],
		},
		base: {
			url: process.env.BASE_HTTPS_RPC,
			accounts: [`0x${process.env.BASE_PRIVATE_KEY}`],
		},
	},
	gasReporter: {
		enabled: true,
		currency: "USD",
		gasPrice: 10,
	},
	etherscan: {
		apiKey: process.env.BASESCAN_API_KEY_ETHEREUM,
	},
	sourcify: {
		enabled: true,
	},
};
