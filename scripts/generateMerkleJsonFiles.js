const fs = require("fs");
const merkleMaker = require("./merkleMaker.js");

fs.writeFileSync(__dirname + "/merkledata/mintlist-merkle.json", JSON.stringify(merkleMaker.mintJsonFile, null, 4));
fs.writeFileSync(__dirname + "/merkledata/sale-merkleroot.txt", merkleMaker.root.saleMerkleRoot, "utf8");

console.log("saleMerkleRoot:", merkleMaker.root.saleMerkleRoot);
