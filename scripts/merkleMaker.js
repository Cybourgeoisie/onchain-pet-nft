const fs = require("fs");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const ethers = require("ethers");

function generateLeaf(address, amount) {
	return ethers.solidityPackedKeccak256(["address", "uint256"], [address, amount]);
}

function generateMerkleData(allowlist) {
	const leafNodes = Object.keys(allowlist).map((k) => generateLeaf(k, allowlist[k][0]));
	const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
	const rootHash = merkleTree.getRoot();

	return {
		leafNodes: leafNodes,
		merkleTree: merkleTree,
		rootHash: rootHash,
		allowlist: allowlist,
	};
}

function getMerkleProof(merkleData, address) {
	const mintInfo = merkleData.allowlist[address];
	if (!mintInfo) {
		return {
			excluded: true,
		};
	}

	const [allowedAmount] = mintInfo;

	const leaf = generateLeaf(address, allowedAmount);
	const proof = merkleData.merkleTree.getHexProof(leaf);

	return {
		allowedAmount: allowedAmount,
		proof: proof,
	};
}

// Get the merkle lookups
const mintData = fs
	.readFileSync(__dirname + "/merkledata/mintlist.csv", "utf8")
	.split("\n")
	.map((x) => x.split("\t"));

// Format the objects
let saleAllowlist = {};
for (let row of mintData) {
	saleAllowlist[row[0]] = [parseInt(row[1], 10)];
}

// Construct the allowlist
const saleMerkleData = generateMerkleData(saleAllowlist);

// Construct the root
const saleMerkleRoot = "0x" + saleMerkleData.rootHash.toString("hex");

let mintJsonFile = {};
for (let row of mintData) {
	mintJsonFile[row[0]] = getMerkleProof(saleMerkleData, row[0]);
}

module.exports = {
	mintJsonFile,
	generateMerkleData: generateMerkleData,
	generateLeaf: generateLeaf,
	getMerkleProof: getMerkleProof,
	data: {
		saleMerkleData,
	},
	root: {
		saleMerkleRoot,
	},
};
