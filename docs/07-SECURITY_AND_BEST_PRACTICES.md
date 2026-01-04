# 🔒 Security & Best Practices

Comprehensive security considerations, best practices, and guidelines for CAPShield smart contracts.

---

## 📖 Table of Contents

- [Security Overview](#security-overview)
- [Known Risks](#known-risks)
- [Mitigation Strategies](#mitigation-strategies)
- [Operational Security](#operational-security)
- [Monitoring & Alerts](#monitoring--alerts)
- [Emergency Procedures](#emergency-procedures)
- [Compliance](#compliance)

---

## 🎯 Security Overview

### Audit Status

⚠️ **NOT YET AUDITED**

These contracts have NOT undergone professional security auditing. 

**Recommendations before mainnet:**
1. ✅ Professional smart contract audit (CertiK, OpenZeppelin, Trail of Bits)
2. ✅ Bug bounty program (ImmuneFi, Code4rena)
3. ✅ Formal verification of critical functions (optional)
4. ✅ Multi-day testnet deployment with real usage

### Security Features Implemented

✅ **Battle-Tested Dependencies:**
- OpenZeppelin Contracts v4.9.6 (widely audited)
- Solidity 0.8.19 (built-in overflow protection)

✅ **Access Control:**
- Role-based permissions (no single owner)
- Multisig-ready design
- Granular role separation

✅ **Reentrancy Protection:**
- ReentrancyGuard on critical functions (claims)
- SafeERC20 for interactions

✅ **Input Validation:**
- Non-zero address checks
- Amount validation
- Pause state validation

✅ **Transparency:**
- Immutable on-chain records
- Comprehensive event logging
- Public state inspection

---

## ⚠️ Known Risks

### 1. Admin Centralization

**Risk:** Admin role has significant power (minting, fee exemptions, pausing)

**Impact:** 
- Admin could mint unlimited tokens (but hard-capped by MAX_SUPPLY)
- Admin could add any address to fee exemptions
- Admin could pause transfers

**Mitigation:**
```javascript
// Use Multisig for admin
✅ Gnosis Safe with 2-3+ signers
✅ Geographically distributed signers
✅ Hardware wallets for key holders

// Add timelock for critical operations
⏳ 48-hour delay on admin actions
⏳ Allows community objection period
⏳ Requires multiple approvals
```

**Responsibility:** Admin acts as trusted custodian of protocol

### 2. Transfer Fee Mechanism (CAPX)

**Risk:** Users may not expect 2% fee on every transfer

**Impact:**
- Users lose 2% value on each transfer
- Integration partners must account for fees
- TokenVesting must be fee exempt (CRITICAL!)

**Mitigation:**
```javascript
// Clear documentation
✅ Website/UI clearly shows 2% fee
✅ Fee breakdown visible in UI

// Integration warnings
✅ DEX integrations handle fee logic
✅ Bridge contracts whitelist-checked

// Fee exemption for vesting
✅ MUST run configure:exemption script
✅ Verify exemption before production
```

**Responsibility:** UI/UX should prominently display fee

### 3. Hard Cap Cannot Be Increased

**Risk:** Hard cap is irreversible and immutable

**Impact:**
- If hard cap reached, no more tokens can be minted
- Cannot adjust cap even for extraordinary circumstances
- Long-term supply inflation expectations set in stone

**Mitigation:**
```javascript
// Planning
✅ Calculate realistic max supply needs
✅ Account for growth, reserves, emergencies
✅ 10B for ANGEL and 100M for CAPX are limits

// Monitoring
✅ Track totalMinted vs. MAX_SUPPLY
✅ Alert at 80% capacity
✅ Plan future needs early

// Alternative
If more tokens needed: Deploy new token contract
(Not ideal, but immutable cap prevents mistakes)
```

**Responsibility:** Team should plan supply needs carefully

### 4. Batch Operations Atomicity

**Risk:** Batch operations are atomic (all or nothing)

**Impact:**
- If one recipient address is invalid, entire batch reverts
- No partial batch minting
- Requires careful input validation before submission

**Mitigation:**
```javascript
// Validation
✅ Verify all addresses before batch submission
✅ Check array lengths match
✅ Validate total amount won't exceed cap

// Testing
✅ Test with max batch sizes
✅ Test with edge cases (zero amounts, duplicates)
✅ Test failure scenarios
```

**Responsibility:** Use validation scripts before batch operations

### 5. Vesting Schedule Immutability

**Risk:** Vesting schedules cannot be modified after creation

**Impact:**
- Created schedule parameters are permanent
- Cannot adjust beneficiary or amount
- Can only revoke (if revocable) or let it complete

**Mitigation:**
```javascript
// Verification
✅ Triple-check parameters before creation
✅ Test on testnet first
✅ Use batch creation for validation

// Design
✅ Make schedules revocable when possible
✅ Document each schedule's purpose
✅ Maintain schedule registry
```

**Responsibility:** Careful verification before schedule creation

---

## 🛡️ Mitigation Strategies

### Strategy 1: Multisig Administration

**Objective:** Eliminate single point of admin failure

```javascript
// Recommended Setup
Gnosis Safe on mainnet with:
├─ 3-5 team members as signers
├─ 2-of-3 approval threshold
├─ Geographically distributed team
├─ Different organizations/entities when possible
└─ Mix of technical and non-technical signers
```

**Implementation:**
1. Create Gnosis Safe at https://app.safe.global
2. Set DEFAULT_ADMIN_ROLE to Safe address
3. Grant other roles to Safe as well
4. All admin actions go through Safe

**Benefits:**
- ✅ Requires multiple approvals (2-of-3, 3-of-5, etc.)
- ✅ Transparent execution
- ✅ No single person can unilaterally act
- ✅ Transaction history visible
- ✅ Community can audit

### Strategy 2: Timelock for Critical Operations

**Objective:** Allow community to react to admin actions

```javascript
// Recommended delays:
setExemption()             → 24-48 hours
updateTreasuryAddress()    → 24-48 hours
updateDAOAddress()         → 24-48 hours
grantRole()                → 24-48 hours
pause()                    → 0 (immediate, for emergencies)
```

**Implementation:**
1. Deploy separate Timelock contract
2. Make Timelock the admin (not Safe directly)
3. Safe proposes actions through Timelock
4. Anyone can execute after delay

**Example with OpenZeppelin Timelock:**
```javascript
const timelock = await TimelockController.deploy(
    minDelay = 2 * 24 * 60 * 60,  // 48 hours
    proposers = [safeAddress],
    executors = [ethers.constants.AddressZero],  // anyone
    admin = safeAddress
);

// Now all admin actions go through timelock
// Safe proposes → 48 hour wait → Anyone executes
```

### Strategy 3: Emergency Pause

**Objective:** Stop contract if vulnerability discovered

```javascript
// When to use pause:
✅ Security vulnerability discovered
✅ Reentrancy attack happening
✅ Oracle manipulation detected
✅ Mass fund drain detected

// How to use:
// Step 1: Identify issue (monitoring, user reports)
// Step 2: Verify issue (reproduce, confirm)
// Step 3: Execute pause() (PAUSER_ROLE)
// Step 4: Deploy fix
// Step 5: Unpause after fix verification
```

**Prevention:**
- Grant PAUSER_ROLE to emergency multisig
- Keep this key secure and accessible
- Test pause/unpause regularly
- Monitor for unusual activity 24/7

### Strategy 4: Off-Chain Monitoring

**Objective:** Detect issues before damage occurs

```javascript
// What to monitor:
✅ Large mints (flag > 10% of remaining supply)
✅ Unusual transfers (flag > 100M tokens)
✅ Fee exemption changes (notify on new exemptions)
✅ Role changes (alert on role grants/revokes)
✅ Pause events (immediate alert)
✅ Error events (alert on failures)

// Implementation:
Use services like:
├─ Alchemy Notify
├─ OpenZeppelin Defender
├─ Tenderly Alerts
└─ Custom Subgraph on The Graph
```

**Alert Example:**
```javascript
// Alert on large mint
if (amount > MAX_SUPPLY * 0.1) {
    sendAlert("⚠️ Large mint detected: " + amount);
}

// Alert on fee exemption change
if (exemptionChanged) {
    sendAlert("Fee exemption changed: " + account);
}
```

### Strategy 5: Gradual Rollout

**Objective:** Minimize risk of unknown issues

```javascript
// Mainnet deployment phases:

Phase 1: Conservative
├─ Deploy with MockAdmin (if testing)
├─ Mint small test amounts
├─ 1 week observation period
└─ Monitor for issues

Phase 2: Limited Distribution
├─ Begin team allocations (small amounts)
├─ Gradual increase over 2 weeks
├─ Monitor transfer patterns
└─ Verify fee calculations

Phase 3: Full Operations
├─ Full team distribution
├─ Begin community rewards
├─ Normal operations
└─ Continue monitoring

Phase 4: Vesting Integration
├─ Deploy TokenVesting
├─ Small pilot vesting schedules
├─ Verify cliff/linear logic
└─ Scale up gradually
```

---

## 🔐 Operational Security

### 1. Private Key Management

**Deployment Account:**
```
✅ DO:
└─ Use separate account for deployment
  ├─ Different from multisig signers
  ├─ Only has funds for gas
  ├─ Separate from operational accounts
  ├─ Hardware wallet preferred
  └─ Private key rotated after deployment

❌ DON'T:
└─ Use account with large funds
  ├─ Don't use team member personal keys
  ├─ Don't share private keys
  ├─ Don't store in plaintext
  └─ Don't commit to Git
```

**Implementation:**
```bash
# Generate new wallet for deployment
npm run generate:wallet

# Fund with minimal gas (0.5-1 USD equivalent)
# Deploy contracts
# Rotate key afterward
```

### 2. Environment File Security

**.env File:**
```bash
# DO:
✅ Keep .env in .gitignore
✅ Store in 1Password/LastPass/secure vault
✅ Limited access (only deployment engineer)
✅ Encrypted backups only
✅ Different .env for each environment

# DON'T:
❌ Commit .env to Git
❌ Share .env in Slack/email
❌ Store plaintext on personal devices
❌ Use same keys across networks
❌ Reuse deployment keys after mainnet
```

### 3. Multisig Signer Security

**For Each Signer:**
```
Hardware Setup:
├─ Ledger/Trezor hardware wallet
├─ Dedicated signing device
├─ Backed up seed phrase (offline, secure location)
└─ PINs and passphrases protected

Operational:
├─ Sign transactions only from verified sources
├─ Verify transaction details before signing
├─ Never sign without understanding request
├─ Keep Gnosis Safe link bookmarked (prevent phishing)
└─ Rotate signers periodically (e.g., quarterly)
```

### 4. Deployment Checklist

```
Before Mainnet Deployment:
□ Code review completed (2+ people)
□ All tests passing (100% coverage)
□ Security audit completed
□ Gnosis Safe created (2-3+ signers)
□ Timelock controller deployed (optional, recommended)
□ Monitoring set up (alerts configured)
□ Rollback plan documented
□ Communication plan ready (announcement)
□ Team trained (how to respond to issues)

Deployment Day:
□ All signers available
□ Single deployment window (no concurrent deploys)
□ Notification sent to team
□ Block explorer verified
□ Initial sanity checks pass
□ Monitoring confirmed working
□ Team notified of success

Post-Deployment:
□ Verify contract on explorer
□ Grant roles via Gnosis Safe
□ Announce mainnet to community
□ Setup ongoing monitoring
□ Document all addresses
□ Celebrate success!
```

---

## 📊 Monitoring & Alerts

### What to Monitor

```javascript
// Token-Level Monitoring:

CAPX:
├─ totalSupply() - Should only decrease (burns)
├─ totalMinted() - Should only increase
├─ Verify: totalSupply <= totalMinted (always)
├─ Monitor: Transfer fees (1% + 1%)
└─ Alert: Fee logic errors or bypasses

ANGEL:
├─ totalSupply() - Should only increase (no burns if locked)
├─ totalMinted() - Should only increase
├─ Verify: totalSupply == totalMinted
└─ Alert: Any deviation from expected

TokenVesting:
├─ Schedule creation count
├─ Claim events
├─ Revocation events
└─ Cliff/vesting calculations accuracy
```

### Recommended Monitoring Services

**OpenZeppelin Defender:**
```
https://defender.openzeppelin.com/

Features:
├─ Event monitoring
├─ Alert rules
├─ Automated responses
├─ Transaction simulation
└─ Multi-network support
```

**Tenderly:**
```
https://tenderly.co/

Features:
├─ Transaction tracing
├─ Real-time alerts
├─ Webhook integrations
├─ Gas estimation
└─ Error debugging
```

**The Graph (Subgraph):**
```
Create custom subgraph for:
├─ CAPX transfers
├─ ANGEL distributions
├─ Vesting schedules
├─ Events indexing
└─ Off-chain queries
```

### Alert Rules

```javascript
// Example Alert Configuration:

{
  "name": "Large CAPX Transfer",
  "condition": "transfer.value > 1000000 CAPX",
  "action": "notify Slack #alerts"
}

{
  "name": "TokenVesting Claim",
  "condition": "claim event emitted",
  "action": "log to database"
}

{
  "name": "Fee Exemption Change",
  "condition": "exemption set/revoked",
  "action": "notify team"
}

{
  "name": "Pause Event",
  "condition": "paused == true",
  "action": "immediate Slack + email alert"
}

{
  "name": "Supply Anomaly",
  "condition": "totalMinted diverges from expected",
  "action": "escalate to security team"
}
```

---

## 🚨 Emergency Procedures

### Issue Detection & Response

**Level 1: Minor Issue** (Typo, documentation, non-critical)
```
Response Time: 24-48 hours
Action:
└─ Fix and deploy non-critical patch
└─ No pause needed
└─ Update documentation
```

**Level 2: Moderate Issue** (Inefficiency, edge case)
```
Response Time: 4-8 hours
Action:
├─ Assess impact
├─ Pause if affecting operations
├─ Deploy fix
└─ Test thoroughly
└─ Communicate to users
```

**Level 3: Critical Issue** (Security vulnerability, fund loss risk)
```
Response Time: Immediate (< 1 hour)
Action:
├─ Activate emergency response team
├─ Pause affected contracts
├─ Assess scope and impact
├─ Develop fix
├─ Deploy and verify fix
├─ Communicate immediately to community
├─ Post-mortem analysis
└─ Implement preventive measures
```

### Emergency Contacts

```
Emergency Response Team:
├─ Tech Lead: [Name] [Phone]
├─ Security Lead: [Name] [Phone]
├─ Operations: [Name] [Phone]
└─ Communications: [Name] [Phone]

Escalation:
├─ Level 1: Team Slack
├─ Level 2: Team call
└─ Level 3: Team + Board call
```

### Pause Activation

```javascript
// Step 1: Identify issue
// → Monitoring alert or user report

// Step 2: Verify issue
// → Run diagnostic tests
// → Confirm on testnet if possible

// Step 3: Activate pause
// → Call pause() via PAUSER_ROLE
// → Confirm transaction on explorer
// → Notify team immediately

// Step 4: Communicate
// → Post on social media
// → Notify users
// → Explain issue and ETA for fix

// Step 5: Deploy fix
// → Test thoroughly
// → Code review
// → Deploy to testnet first
// → Deploy to mainnet

// Step 6: Verify fix
// → Test all affected functionality
// → Monitor for 2-4 hours
// → Gather logs and data

// Step 7: Unpause
// → Call unpause() via PAUSER_ROLE
// → Confirm on explorer
// → Notify community

// Step 8: Post-mortem
// → Document what happened
// → Document why it happened
// → Implement preventive measures
// → Share learnings with team
```

---

## ✅ Compliance

### Regulatory Considerations

⚠️ **Not Legal Advice** - Consult with legal counsel

**Potential Compliance Areas:**
```
1. Securities Law
   └─ CAPX/ANGEL may be considered securities
   └─ Consult with securities attorney
   └─ Consider registration/exemption

2. Tax Implications
   └─ Token distributions may be taxable events
   └─ Keep immutable audit trail (via blockchain)
   └─ Provide reporting to users

3. KYC/AML Requirements
   └─ If platform facilitates transfers
   └─ May require identity verification
   └─ Consider stablecoin regulations

4. Jurisdictional Issues
   └─ Different rules per country
   └─ Consider geographic restrictions
   └─ Consult local regulations
```

### Transparency & Auditability

**On-Chain Record Keeping:**
```solidity
// Events provide immutable audit trail:

RewardMint(address indexed to, uint256 amount, string reason)
// ✅ Who received tokens
// ✅ How much they received
// ✅ Why they received it
// ✅ When they received it
// ✅ Cannot be deleted or modified

Transfer(address indexed from, address indexed to, uint256 value)
// ✅ All transfers recorded
// ✅ Includes fee transfers
// ✅ Publicly auditable
// ✅ Transparent on blockchain
```

**User Audit Trail:**
```javascript
// Users can verify their rewards:
// 1. Go to explorer: polygonscan.com
// 2. Search their address
// 3. Find all RewardMint events
// 4. Verify amounts and reasons
// 5. Calculate expected value
// 6. Confirm on-chain vs. off-chain records
```
