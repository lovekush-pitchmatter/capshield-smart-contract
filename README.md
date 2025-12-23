# CAPShield Smart Contracts

Advanced ERC20 token implementations for the CAPShield ecosystem featuring role-based access control, hard cap enforcement, and specialized tokenomics.

## Overview

This repository contains two smart contracts built on OpenZeppelin v4.9.6:
- **CAPX (CAPY)**: Shield Token with transfer fees and revenue-based minting
- **ANGEL (SEED)**: Community Token with reward distribution system

## CAPX Token - How It Works

### Core Mechanism
CAPX is a deflationary token with automated fee distribution on every transfer. The contract enforces a hard cap of 100 million tokens through irreversible tracking.

### Supply Management
- Starts at zero supply
- Multiple minting roles (Team, Treasury, DAO) can mint up to the hard cap
- Revenue-based minting calculates tokens using: `amount = revenue / marketValue`
- Once minted, the `totalMinted` counter permanently tracks capacity used
- Burning tokens reduces circulating supply but does not free up mint capacity

### Transfer Tax System
Every non-exempt transfer automatically deducts 2% fees:
- 1% burned permanently (deflationary pressure)
- 1% sent to treasury wallet
- Treasury and DAO addresses are exempt from fees
- Exemptions can be added/removed by admin

### Access Control
Five distinct roles control different operations:
- **DEFAULT_ADMIN_ROLE**: Manages all roles and updates treasury/DAO addresses
- **TEAM_MINTER_ROLE**: Mints tokens for team allocations
- **TREASURY_MINTER_ROLE**: Executes standard and revenue-based mints
- **DAO_MINTER_ROLE**: Mints tokens for DAO operations
- **PAUSER_ROLE**: Can pause/unpause all token operations

### Safety Features
- Emergency pause stops all transfers and minting
- Cannot mint beyond MAX_SUPPLY under any circumstances
- Address zero checks prevent accidental burns
- All critical operations emit events for transparency

## ANGEL Token - How It Works

### Core Mechanism
ANGEL is a reward distribution token with transparent reason tracking. The contract enforces a hard cap of 10 billion tokens.

### Minting System
- Starts at zero supply
- All mints require a reason string (e.g., "Community engagement reward")
- Single recipient minting: `rewardMint(address, amount, reason)`
- Batch minting for multiple recipients in one transaction
- Every mint emits a `RewardMint` event with the reason for auditability

### Supply Control
- Hard cap of 10,000,000,000 tokens enforced via `totalMinted` tracking
- Burning tokens reduces circulating supply but not mintable capacity
- Once cap is reached, no more tokens can be minted ever
- `remainingMintableSupply()` shows available mint capacity
- `canMint(amount)` checks if specific amount can be minted

### Access Control
Three roles manage the token:
- **DEFAULT_ADMIN_ROLE**: Full administrative control
- **REWARD_MINTER_ROLE**: Can mint rewards (single and batch)
- **PAUSER_ROLE**: Emergency pause capability

### Batch Operations
The `batchRewardMint` function allows efficient distribution:
- Takes arrays of recipients and amounts
- Single reason applies to all recipients
- All recipients get individual RewardMint events
- Gas-efficient for airdrops and bulk rewards

### Safety Features
- Emergency pause stops all operations
- Reason parameter cannot be empty
- Amount must be greater than zero
- Recipient cannot be zero address
- Hard cap prevents unlimited inflation

## Deployment

### Prerequisites
- Node.js 16+
- Hardhat
- BNB for gas fees

### Setup
1. Install dependencies:
   ```bash
   npm install