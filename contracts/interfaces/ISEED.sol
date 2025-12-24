// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title ISEED
 * @notice Interface for CAPShield Community Token (SEED)
 */
interface ISEED {
    ///////////////// ERRORS /////////////////

    error ZeroAddress();
    error MaxSupplyExceeded();
    error InvalidAmount();
    error AdminMustBeContract();

    ///////////////// EVENTS /////////////////

    event RewardMint(address indexed to, uint256 amount, uint256 indexed role);
    event RoleGranted(uint256 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(uint256 indexed role, address indexed account, address indexed sender);

    ///////////////// FUNCTIONS /////////////////

    /**
     * @notice Mint tokens for rewards
     * @param to Address to mint to
     * @param amount Amount to mint
     */
    function rewardMint(address to, uint256 amount) external;

    /**
     * @notice Burn tokens
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external;

    /**
     * @notice Burn tokens from another account (with allowance)
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address from, uint256 amount) external;

    /**
     * @notice Pause token transfers and minting
     */
    function pause() external;

    /**
     * @notice Unpause token transfers and minting
     */
    function unpause() external;

    /**
     * @notice Grant roles to a user
     * @param user Address to grant roles to
     * @param roles Roles to grant (as bitmap)
     */
    function grantRoles(address user, uint256 roles) external payable;

    /**
     * @notice Revoke roles from a user
     * @param user Address to revoke roles from
     * @param roles Roles to revoke (as bitmap)
     */
    function revokeRoles(address user, uint256 roles) external payable;

    /**
     * @notice Get the maximum supply
     * @return Maximum supply cap
     */
    function getMaxSupply() external pure returns (uint256);

    /**
     * @notice Check if an address has a specific role
     * @param role Role to check (as bitmap)
     * @param user Address to check
     * @return True if user has the role
     */
    function hasRole(uint256 role, address user) external view returns (bool);

    /**
     * @notice Check if the owner is a multisig contract
     * @return True if owner is a contract
     */
    function isOwnerMultisig() external view returns (bool);
}
