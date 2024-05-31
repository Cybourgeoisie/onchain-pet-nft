// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./ContractDataStorage.sol";

contract MetadataRenderer is Ownable {
	// Contracts
	ContractDataStorage public contractDataStorage;

	constructor(address _ContractDataStorageAddress) Ownable(_msgSender()) {
		setContractDataStorageAddress(_ContractDataStorageAddress);
	}

	function setContractDataStorageAddress(address _ContractDataStorageAddress) public onlyOwner {
		contractDataStorage = ContractDataStorage(_ContractDataStorageAddress);
	}
}