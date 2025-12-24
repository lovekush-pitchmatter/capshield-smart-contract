# Smart Contract Security & Production Readiness Analysis

**Date:** December 24, 2025  
**Analyzed Contracts:** CAPX.sol (CAPShield Token), ANGEL.sol (AngleSeed Token)  

---

## Executive Summary

There are several critical, medium, low severity issues found and that needs to be addressed.

| Category | Status | Critical Issues | Medium Issues | Low Issues |
|----------|--------|-----------------|---------------|------------|
| Token Smart Contract | Needs Work | 2 | 4 | 3 |
| Minting Rules | Needs Work | 1 | 2 | 2 |
| Burn and Allocation Rules | Well Implemented | 0 | 1 | 2 |

---

## 1. TOKEN SMART CONTRACT FINDINGS

### 1.1 Critical Issues

#### CRITICAL-001: Deployment Script Constructor Parameter Mismatch

**Location:** [scripts/deploy.js](scripts/deploy.js#L15-L25)

**Issue:** The deployment script does NOT pass required constructor parameters to either contract.

```javascript
// CURRENT CODE (BROKEN):
const capx = await CAPX.deploy();  // Missing 3 required parameters!
const angel = await ANGEL.deploy(); // Missing 1 required parameter!

// CAPX REQUIRES: (treasuryAddress, daoAddress, adminAddress)
// ANGEL REQUIRES: (adminAddress)
```

**Impact:** Deployment will FAIL on any network. This indicates the contracts have never been deployed with the current constructor signatures.

**Recommendation:**
```javascript
const capx = await CAPX.deploy(treasuryAddress, daoAddress, deployer.address);
const angel = await ANGEL.deploy(deployer.address);
```

---

#### CRITICAL-002: Missing getMaxSupply() Function in CAPX

**Location:** [scripts/deploy.js](scripts/deploy.js#L35)

**Issue:** Deployment script calls `capx.getMaxSupply()` but this function does not exist in the contract.

```javascript
// DEPLOYMENT SCRIPT:
maxSupply: (await capx.getMaxSupply()).toString(),

// ACTUAL CONTRACT:
uint256 public constant MAX_SUPPLY = 100_000_000 * 10**_DECIMALS;
// No getMaxSupply() function exists!
```

**Impact:** Deployment script will fail at the point of saving deployment info.

**Recommendation:** Either add a getter function to the contract or use `MAX_SUPPLY()` directly:
```solidity
function getMaxSupply() external pure returns (uint256) {
    return MAX_SUPPLY;
}
```

---

### 1.2 Medium Issues

#### MEDIUM-001: Centralization Risk - Single Admin Controls All Roles

**Location:** [contracts/CAPX.sol](contracts/CAPX.sol#L63-L69), [contracts/ANGEL.sol](contracts/ANGEL.sol#L44-L47)

**Issue:** The constructor grants ALL roles (DEFAULT_ADMIN_ROLE, PAUSER_ROLE, all MINTER roles) to a single admin address.

**Impact:** Single point of failure. If the admin key is compromised, the attacker has full control over:
- Minting new tokens
- Pausing/unpausing the contract
- Setting fee exemptions (CAPX)
- Granting/revoking all roles

**Recommendation:**
1. Implement role separation at deployment
2. Use a Timelock contract for admin functions
3. Consider Gnosis Safe or similar multisig for admin address
4. Add a 2-of-3 or 3-of-5 multisig requirement for critical operations

---

#### MEDIUM-002: No Reentrancy Guard on State-Changing Functions

**Location:** [contracts/CAPX.sol](contracts/CAPX.sol#L146-L175) `_transfer` function

**Issue:** The overridden `_transfer` function performs multiple external calls (transfer to recipient, burn, transfer to treasury) without reentrancy protection.

**Current Flow:**
```solidity
super._transfer(from, to, recipientAmount);  // External call 1
_burn(from, burnAmount);                      // State change
super._transfer(from, treasuryAddress, treasuryAmount); // External call 2
```

**Impact:** While OpenZeppelin's ERC20 is safe, custom implementations on receiving contracts could potentially exploit this pattern.

**Recommendation:** Add `ReentrancyGuard` from OpenZeppelin:
```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
contract CAPX is ERC20, ERC20Burnable, Pausable, AccessControl, ReentrancyGuard {
```

---

#### MEDIUM-003: Missing Events for Critical State Changes

**Location:** [contracts/CAPX.sol](contracts/CAPX.sol#L86-L112), [contracts/ANGEL.sol](contracts/ANGEL.sol#L62-L92)

**Issue:** Standard minting functions (teamMint, treasuryMint, daoMint) rely only on ERC20's Transfer event. No custom events track WHO authorized the mint.

**Impact:** Difficult to audit and track which role performed which mint operation on-chain.

**Recommendation:** Add events:
```solidity
event TeamMint(address indexed minter, address indexed to, uint256 amount);
event TreasuryMint(address indexed minter, address indexed to, uint256 amount);
event DAOMint(address indexed minter, address indexed to, uint256 amount);
```

---

#### MEDIUM-004: No Rate Limiting on Minting Operations

**Location:** [contracts/CAPX.sol](contracts/CAPX.sol#L86-L112), [contracts/ANGEL.sol](contracts/ANGEL.sol#L62-L92)

**Issue:** Any account with minting role can mint up to MAX_SUPPLY in a single transaction. No daily/weekly/monthly caps.

**Impact:** If a minter role is compromised, the attacker can mint the entire remaining supply instantly.

**Recommendation:** Implement rate limiting:
```solidity
uint256 public constant DAILY_MINT_LIMIT = 1_000_000 * 10**18;
mapping(uint256 => uint256) public dailyMinted; // day => amount

function _checkMintLimit(uint256 amount) internal {
    uint256 today = block.timestamp / 1 days;
    require(dailyMinted[today] + amount <= DAILY_MINT_LIMIT, "Daily limit exceeded");
    dailyMinted[today] += amount;
}
```

---

### 1.3 Low Issues

#### LOW-001: Hardcoded Fee Percentages

**Location:** [contracts/CAPX.sol](contracts/CAPX.sol#L30-L32)

**Issue:** Burn and treasury fee percentages are hardcoded as constants.

```solidity
uint256 public constant BURN_FEE_PERCENT = 1;
uint256 public constant TREASURY_FEE_PERCENT = 1;
```

**Impact:** Cannot adjust fees without deploying a new contract.

**Recommendation:** Make fees configurable with bounds:
```solidity
uint256 public burnFeePercent = 1;
uint256 public treasuryFeePercent = 1;
uint256 public constant MAX_FEE = 5; // 5% max

function setBurnFee(uint256 _fee) external onlyRole(DEFAULT_ADMIN_ROLE) {
    require(_fee <= MAX_FEE, "Fee too high");
    burnFeePercent = _fee;
}
```

---

#### LOW-002: Missing Input Validation in revenueMint

**Location:** [contracts/CAPX.sol](contracts/CAPX.sol#L114-L131)

**Issue:** No upper bound check on revenue or marketValue parameters.

**Impact:** Extremely large or small values could lead to unexpected minting amounts.

**Recommendation:** Add reasonable bounds checking.

---

#### LOW-003: No Contract Upgrade Path

**Issue:** Both contracts are non-upgradeable.

**Impact:** Any bugs or required feature additions will require deploying new contracts and migrating all users.

**Recommendation:** Consider using OpenZeppelin's UUPS or Transparent Proxy pattern for future flexibility.

---

## 2. MINTING RULES FINDINGS

### 2.1 Critical Issues

#### CRITICAL-003: No Minting Schedule or Vesting Enforcement

**Location:** [contracts/CAPX.sol](contracts/CAPX.sol#L86-L112)

**Issue:** While role-based minting exists, there's no enforcement of a token distribution schedule or vesting.

**Typical Token Distribution:**
- Team: X% vested over Y years
- Treasury: Reserved for operations
- DAO: Community governance
- Public: ICO/IDO allocation

**Current Implementation:** ANY MINTER can mint ANY AMOUNT to ANY ADDRESS at ANY TIME (up to MAX_SUPPLY).

**Impact:** 
- Team could immediately dump tokens
- No guaranteed token distribution to stakeholders
- No cliff or vesting periods enforced on-chain

**Recommendation:** Implement a VestingWallet or TokenVesting contract:
```solidity
// Integrate with OpenZeppelin's VestingWallet
import "@openzeppelin/contracts/finance/VestingWallet.sol";
```

Or implement allocation tracking:
```solidity
struct Allocation {
    uint256 total;
    uint256 released;
    uint256 cliff;
    uint256 vestingDuration;
}
mapping(address => Allocation) public allocations;
```

---

### 2.2 Medium Issues

#### MEDIUM-005: Revenue Mint Formula Potential for Manipulation

**Location:** [contracts/CAPX.sol](contracts/CAPX.sol#L114-L131)

**Issue:** The `revenueMint` function relies on off-chain provided `marketValue`.

```solidity
function revenueMint(
    address to,
    uint256 revenue,
    uint256 marketValue  // ← Who decides this?
) external onlyRole(TREASURY_MINTER_ROLE) whenNotPaused {
    uint256 amount = (revenue * 10**_DECIMALS) / marketValue;
    // ...
}
```

**Impact:** The treasury minter can manipulate the `marketValue` parameter to mint more or fewer tokens than intended.

**Recommendation:**
1. Integrate with a price oracle (Chainlink, TWAP)
2. Add bounds checking: `require(marketValue >= minMarketValue && marketValue <= maxMarketValue)`
3. Implement multi-sig approval for revenue mints

---

#### MEDIUM-006: Batch Minting Gas Limits (ANGEL)

**Location:** [contracts/ANGEL.sol](contracts/ANGEL.sol#L76-L90)

**Issue:** `batchRewardMint` has no limit on array size.

```solidity
function batchRewardMint(
    address[] calldata recipients,  // No size limit!
    uint256[] calldata amounts,
    string calldata reason
) external onlyRole(REWARD_MINTER_ROLE) whenNotPaused {
    for (uint256 i = 0; i < recipients.length; i++) {
        // ...
    }
}
```

**Impact:** Very large arrays could cause transaction to exceed block gas limit, failing silently or causing out-of-gas errors.

**Recommendation:**
```solidity
uint256 public constant MAX_BATCH_SIZE = 100;
require(recipients.length <= MAX_BATCH_SIZE, "Batch too large");
```

---

### 2.3 Low Issues

#### LOW-004: Missing Zero Amount Check in CAPX Minting

**Location:** [contracts/CAPX.sol](contracts/CAPX.sol#L135-L140)

**Issue:** CAPX's `_mintWithCapCheck` doesn't validate that amount > 0 (ANGEL does this correctly).

```solidity
// CAPX - Missing check:
function _mintWithCapCheck(address to, uint256 amount) private {
    require(totalMinted + amount <= MAX_SUPPLY, "...");
    totalMinted += amount;
    _mint(to, amount);
}

// ANGEL - Has the check:
function _mintWithCapCheck(address to, uint256 amount) private {
    require(to != address(0), "Cannot mint to zero address");
    require(amount > 0, "Amount must be greater than 0");  // ✓
    // ...
}
```

**Recommendation:** Add validation to CAPX:
```solidity
require(amount > 0, "Amount must be greater than 0");
require(to != address(0), "Cannot mint to zero address");
```

---

#### LOW-005: No Minting Cooldown Period

**Issue:** Minting can be performed continuously without any cooldown.

**Recommendation:** Consider implementing a minimum time between mints for additional security.

---

## 3. BURN AND ALLOCATION RULES FINDINGS

### 3.1 Positive Findings

#### PASS-001: Irreversible Hard Cap Implementation

**Location:** [contracts/CAPX.sol](contracts/CAPX.sol#L39), [contracts/ANGEL.sol](contracts/ANGEL.sol#L30)

**Implementation:** Both contracts correctly track `totalMinted` separately from `totalSupply`.

```solidity
uint256 public totalMinted;

function _mintWithCapCheck(address to, uint256 amount) private {
    require(totalMinted + amount <= MAX_SUPPLY, "Minting would exceed max supply");
    totalMinted += amount;  // Permanent, never decreases
    _mint(to, amount);
}
```

**Result:** Correctly implement burning tokens logic that does not free up mint capacity

---

#### PASS-002: Burn Functionality Correctly Implemented

**Location:** [contracts/CAPX.sol](contracts/CAPX.sol#L176-L277), [contracts/ANGEL.sol](contracts/ANGEL.sol#L131-L143)

**Implementation:** Both contracts inherit ERC20Burnable and properly maintain `totalMinted` unchanged during burns.

```solidity
function burn(uint256 amount) public override {
    super.burn(amount);
    // totalMinted remains unchanged - burn does not free up mint capacity
}
```

**Result:** Working as intended.

---

#### PASS-003: Transfer Fee Allocation (CAPX)

**Location:** [contracts/CAPX.sol](contracts/CAPX.sol#L146-L175)

**Implementation:** 
- 1% burned (deflationary)
- 1% to treasury (sustainability)
- 98% to recipient
- Treasury and DAO exempt from fees

**Result:** Fee mechanism correctly implemented with proper exemptions.

---

### 3.2 Medium Issues

#### MEDIUM-007: Fee Exemption Can Be Abused

**Location:** [contracts/CAPX.sol](contracts/CAPX.sol#L235-L240)

**Issue:** Admin can set ANY address as fee-exempt.

```solidity
function setExemption(address account, bool exempt) external onlyRole(DEFAULT_ADMIN_ROLE) {
    require(account != address(0), "Cannot set exemption for zero address");
    isExemptFromFees[account] = exempt;
    emit ExemptionUpdated(account, exempt);
}
```

**Impact:** Malicious admin could exempt whale addresses, defeating the tokenomics purpose.

**Recommendation:** 
1. Add a maximum number of exempt addresses
2. Implement timelock for exemption changes
3. Consider making exemptions immutable after initial setup

---

### 3.3 Low Issues

#### LOW-006: No Maximum Burn Limit Per Transaction

**Issue:** Users can burn any amount in a single transaction.

**Impact:** It's obviously not a security issue but large burns could impact the price significantly.

**Recommendation:** Burn liimits.

---

#### LOW-007: Missing burnFrom Authorization Event

**Location:** [contracts/CAPX.sol](contracts/CAPX.sol), [contracts/ANGEL.sol](contracts/ANGEL.sol)

**Issue:** When using `burnFrom`, only the standard Transfer event is emitted. No custom event tracks who authorized the burn.

**Recommendation:** Need to add a custom BurnFrom event for better trail.

---

## 4. TEST COVERAGE ANALYSIS

### Current Coverage
- Deployment tests
- Role-based minting tests
- Hard cap enforcement tests
- Revenue mint formula tests (CAPX)
- Transfer fee tests (CAPX)
- Batch minting tests (ANGEL)
- Pause functionality tests
- Burn functionality tests
- Access control tests

### Missing Test Coverage
- Deployment script integration tests
- Gas consumption tests for batch operations
- Stress tests for maximum array sizes
- Multi-sig integration tests

---

## 5. DEPLOYMENT SCRIPT ISSUES

1. Missing constructor parameters
2. Calling non-existent function `getMaxSupply()`
3. No verification commands after deployment
4. No gas estimation before deployment

---

## 6. RECOMMENDATIONS SUMMARY


1. Fix deployment script - Add constructor parameters
2. Add getMaxSupply() function or fix deployment script to use `MAX_SUPPLY()`
3. Add zero amount validation to CAPX minting
4. Add batch size limit to ANGEL
5. Implement rate limiting for minting operations
6. Add ReentrancyGuard to CAPX
7. Integrate price oracle for revenueMint
8. Add comprehensive events for all minting operations
9. Implement vesting contracts for team/investor allocations
10. Add Timelock for admin functions
11. Setup multi-sig governance

---
