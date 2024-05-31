//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract DigitalPetNft is ERC721, Ownable {
    using Strings for uint256;

    constructor(address initialOwner) ERC721("test nft", "testnft") Ownable(initialOwner) { }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

		return string(
			abi.encodePacked(
                bytes('data:application/json;utf8,{"name":"Test NFT","description":"Test description for test NFT.",'),
                bytes('"animation_url":"data:text/html;charset=utf-8,<html><body><div id=\\\"counter\\\">0</div><script>setInterval(() => {const counter = document.getElementById(\'counter\'); counter.innerHTML = parseInt(counter.innerHTML, 10) + 1;}, 1000);</script></body></html>"}')
			)
		);
    }

    function mint(address _to, uint256 _tokenId) public onlyOwner {
        _mint(_to, _tokenId);
    }
}
