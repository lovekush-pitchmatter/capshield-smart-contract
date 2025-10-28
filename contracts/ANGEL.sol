// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ANGEL - AngleSeed Token
 * @dev BEP-20 Token for AngleSeed Community Rewards
 * Initial supply: 10,000,000,000 ANGEL
 * Decimals: 18
 * Symbol: ANGEL
 * No fixed supply - can be minted by owner for community rewards
 */
contract ANGEL is ERC20, ERC20Burnable, Ownable {
    uint8 private constant _DECIMALS = 18;
    uint256 private constant _INITIAL_SUPPLY = 10_000_000_000 * 10**_DECIMALS; // 10 billion ANGEL
    
    /**
     * @dev Constructor that mints the initial supply to the deployer
     */
    constructor() ERC20("AngleSeed Token", "ANGEL") {
        _mint(msg.sender, _INITIAL_SUPPLY);
    }
    
    /**
     * @dev Returns the number of decimals used
     */
    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }
    
    /**
     * @dev Mint new tokens - only owner can mint for community rewards
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Override burn function to allow token burning
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) public override {
        _burn(_msgSender(), amount);
    }
    
    /**
     * @dev Override burnFrom function to allow token burning from specific address
     * @param account Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burnFrom(address account, uint256 amount) public override {
        _spendAllowance(account, _msgSender(), amount);
        _burn(account, amount);
    }
}