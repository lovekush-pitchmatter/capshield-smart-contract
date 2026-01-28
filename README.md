# CAPShield Smart Contracts

**Audit-Ready | Deflationary | Autonomous**

Advanced ERC20 token implementations for the CAPShield ecosystem, featuring **Chainlink Oracle** integration for trustless pricing and **Chainlink Keepers** for automated revenue operations.

---

## 🚀 Key Enhancements (v1.0.0)

This repository has been upgraded from a manual proof-of-concept to a **production-ready DeFi protocol**:

*   **🔒 Trustless Pricing**: Integrated **Chainlink Price Feeds** to fetch real-time ETH/USD rates, removing admin reliance and preventing price manipulation.
*   **🤖 Fully Autonomous**: Implemented **Chainlink Keepers** to automatically mint revenue tokens when conditions are met, ensuring 24/7 operation without manual intervention.
*   **🛡️ Enhanced Security**: Fixed critical vulnerabilities, added custom error handling, and enforced strict access controls.
*   **✅ 100% Test Coverage**: Comprehensive test suite (103/103 passing) covering all scenarios, including mocks for Oracles and Keepers.

---

## Overview

This repository contains two smart contracts built on OpenZeppelin v4.9.6:

*   **CAPX (CAPY)**: Core Shield Token with deflationary mechanics and oracle-driven revenue minting.
*   **ANGEL (SEED)**: Community Reward Token for incentives, grants, and ecosystem growth.

---

## 🛡️ CAPX Token – Shield Token

### Core Features

1.  **Deflationary Transfer Fee**:
    *   **1% Burn**: Permanently reduces supply on every transfer.
    *   **1% Treasury**: Sent to the protocol treasury for ecosystem funding.
    *   **98% Recipient**: The user receives the remaining amount.

2.  **Oracle-Driven Revenue Minting**:
    *   **Old Way (Insecure)**: Admin manually input the price.
    *   **New Way (Secure)**: `revenueMint` queries the **Chainlink Aggregator** for the latest price.
    *   **Formula**: `Mint Amount = Revenue (USD) / Current Token Price (USD from Oracle)`

3.  **Automated Operations (Chainlink Keepers)**:
    *   **`checkUpkeep`**: Checks if pending revenue > 0 and the mint interval has passed.
    *   **`performUpkeep`**: Automatically executes the minting transaction if `checkUpkeep` returns true.

### Access Control

*   **DEFAULT_ADMIN_ROLE**: Manages system parameters (Price Feed address, Mint Interval).
*   **TEAM_MINTER_ROLE**: Authorized for team allocations.
*   **TREASURY_MINTER_ROLE**: Authorized for treasury operations.
*   **DAO_MINTER_ROLE**: Governance-controlled minting.

---

## 👼 ANGEL Token – Community Rewards

*   **Purpose**: Reward community members, developers, and partners.
*   **Batch Minting**: Gas-efficient `batchRewardMint` for distributing tokens to multiple users in one transaction.
*   **Strict Caps**: Hard supply cap of 10,000,000,000 tokens ensures scarcity.
*   **Auditability**: Every mint requires a visible reason string on-chain.

---

## 🛠️ Testing & Verification

The project includes a robust test suite powered by Hardhat and Ethers.js.

### Running Tests
```bash
npx hardhat test
```

### Test Suites
*   **`test/CAPX.test.js`**: Core ERC20 logic, fees, and roles.
*   **`test/ANGEL.test.js`**: Reward minting and batch operations.
*   **`test/CAPX.oracle.test.js`**: **(New)** Verifies Chainlink price feed integration and error handling.
*   **`test/CAPX.automation.test.js`**: **(New)** Verifies Chainlink Keeper logic and conditional execution.

---

## 📦 Deployment & Setup

### deployment-info.json
Contains the addresses of deployed contracts (when available).

### Key Commands

**Install Dependencies:**
```bash
npm install
```

**Compile Contracts:**
```bash
npx hardhat compile
```

**Run Analysis:**
```bash
npx hardhat test
npx hardhat coverage
```

---

## 📜 License
MIT
