// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract HealthChainToken is ERC20, Ownable {
    constructor() ERC20("HealthChain Token", "HTC") Ownable(msg.sender) {
        // Mint initial supply to the deployer
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    // Only the owner (deployer) can mint more tokens
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
