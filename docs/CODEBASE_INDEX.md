# CapShield Codebase Index

**Last Updated**: January 28, 2026
**Version**: 1.0.0 (Chainlink Enhanced)

This document provides a complete inventory of the CapShield smart contract ecosystem.

---

## 🏗️ Core Contracts
> Located in `contracts/`

### [CAPX.sol](contracts/CAPX.sol)
**Type**: Governance / Utility Token (ERC20)
**Purpose**: Primary ecosystem token with advanced DeFi features.
**Key Features**:
- **Trustless Revenue Minting**: Uses Chainlink Oracles to calculate mint amounts based on USD revenue.
- **Chainlink Automation**: Configured to automatically mint accumulated revenue at set intervals (Keepers).
- **Access Control**: Granular roles (Team, Treasury, DAO) via `AccessControl`.
- **Transfer Hooks**: 1% Burn + 1% Treasury fee on every transfer.
- **Hard Cap**: Strictly enforced 100M supply cap.
- **Pausable**: Emergency stop mechanism.

### [ANGEL.sol](contracts/ANGEL.sol)
**Type**: Reward Token (ERC20)
**Purpose**: Community engagement and rewards token.
**Key Features**:
- **Batch Minting**: Gas-efficient `batchRewardMint` for distributing to multiple users.
- **Mint Limits**: Tracks `remainingMintableSupply` against a hard cap.
- **Role-Based**: Only authorized `REWARD_MINTER_ROLE` can mint.

---

## 🧪 Test Suite
> Located in `test/`

### [CAPX.test.js](test/CAPX.test.js) (Unit)
- Covers standard ERC20 functionality.
- Verifies Role-Based Access Control (RBAC).
- Tests Transfer Fee mechanics (Burn/Treasury).
- Validates Hard Cap enforcement.

### [CAPX.oracle.test.js](test/CAPX.oracle.test.js) (Integration)
- **New**: Verifies Chainlink Price Feed integration.
- Tests dynamic minting logic based on mock price data ($0.50, $1.00, $2.00).
- Ensures `InvalidOraclePrice` errors are thrown correctly.

### [CAPX.automation.test.js](test/CAPX.automation.test.js) (Integration)
- **New**: Tests Chainlink Keepers logic (`checkUpkeep`, `performUpkeep`).
- Verifies time-based and revenue-based triggers.

### [ANGEL.test.js](test/ANGEL.test.js) (Unit)
- Covers batch minting efficiency.
- Verifies supply tracking and burn logic.

---

## 🛠️ Infrastructure & Mocks
> Located in `contracts/mock/` & `scripts/`

- **contracts/mock/MockV3Aggregator.sol**: Simulates Chainlink Price Feeds for local testing.
- **contracts/mock/MockMultisig.sol**: Simulates a Gnosis Safe for admin actions.
- **scripts/deploy.js**: Main deployment script for testnet/mainnet.
- **hardhat.config.js**: Configuration for Solidity 0.8.30 and networks.
- **fix_deps.ps1**: Utility script to resolve dependency conflicts.

---

## 📦 Configuration
- **package.json**: Defines project dependencies (Hardhat 2.22.x, Ethers v6, Chainlink).
- **package-lock.json**: Pinned dependency tree.

---

## 📊 Summary Stats
- **Total Contracts**: 2 Core, 2 Mocks
- **Total Tests**: 103 (100% Passing)
- **Solidity Version**: 0.8.30
