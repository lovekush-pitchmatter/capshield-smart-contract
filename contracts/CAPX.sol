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
 */
contract CAPX is ERC20, ERC20Burnable, Ownable {
    uint8 private constant _DECIMALS = 18;
    uint256 private constant _TOTAL_SUPPLY = 100_000_000 * 10**_DECIMALS; // 100 million CAPX
    
    /**
     * @dev Constructor that mints the total supply to the deployer
     */
    constructor() ERC20("CAPShield Token", "CAPX") {
        _mint(msg.sender, _TOTAL_SUPPLY);
    }
    
    /**
     * @dev Returns the number of decimals used
     */
    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }
    
    /**
     * @dev Returns the total supply cap
     */
    function getMaxSupply() public pure returns (uint256) {
        return _TOTAL_SUPPLY;
    }
    
    /**
     * @dev Override burn function to allow token burning
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) public override onlyOwner {
        _burn(_msgSender(), amount);
    }
    
    /**
     * @dev Override burnFrom function to allow token burning from specific address
     * @param account Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burnFrom(address account, uint256 amount) public override onlyOwner {
        _spendAllowance(account, _msgSender(), amount);
        _burn(account, amount);
    }
}