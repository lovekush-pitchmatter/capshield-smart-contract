// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CAPX - CAPShield Token
 * @dev BEP-20 Token for CAPShield Ecosystem
 * Fixed supply: 100,000,000 CAPX
 * Decimals: 18
 * Symbol: CAPX
 * No minting allowed after deployment
 */
contract CAPX is ERC20, ERC20Burnable, Ownable {
    uint8 private constant _DECIMALS = 18;
    uint256 private constant _TOTAL_SUPPLY = 100_000_000 * 10**_DECIMALS;
    
    constructor() ERC20("CAPShield Token", "CAPX") {
        _mint(msg.sender, _TOTAL_SUPPLY);
    }
    
    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }
    
    /**
     * @dev Returns the maximum supply (fixed)
     */
    function getMaxSupply() public pure returns (uint256) {
        return _TOTAL_SUPPLY;
    }
    
    // Note: Burn functions remain public (not onlyOwner) as per ERC20Burnable
    // This allows anyone to burn their own tokens for deflationary purposes
}