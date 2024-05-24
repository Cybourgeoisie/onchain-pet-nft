pragma solidity ^0.8.0;

import "@manifoldxyz/creator-core-solidity/contracts/ERC721Creator.sol";

contract TestNft is ERC721Creator  {
    constructor() ERC721Creator ("test nft", "testnft") {
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

		return string(
			abi.encodePacked(
                bytes('data:application/json;utf8,{"name":"Test NFT","description":"Test description for test NFT.",'),
                bytes('"animation_url":"data:text/html;charset=utf-8,<html><body><div id=\\\"counter\\\">0</div><script>setInterval(() => {const counter = document.getElementById(\'counter\'); counter.innerHTML = parseInt(counter.innerHTML, 10) + 1;}, 1000);</script></body></html>"}')
			)
		);
    }
}
