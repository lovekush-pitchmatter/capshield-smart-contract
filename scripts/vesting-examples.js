const hre = require("hardhat");

/**
 * Example script demonstrating how to create various vesting schedules
 * This is for reference/testing - customize for your needs
 */

async function main() {
  console.log("TokenVesting - Example Usage\n");

  // Get contracts (replace with actual deployed addresses)
  const VESTING_ADDRESS = process.env.VESTING_ADDRESS || "0x...";
  const CAPX_ADDRESS = process.env.CAPX_ADDRESS || "0x...";
  const ANGEL_ADDRESS = process.env.ANGEL_ADDRESS || "0x...";

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  const tokenVesting = await ethers.getContractAt(
    "TokenVesting",
    VESTING_ADDRESS
  );
  const capx = await ethers.getContractAt("CAPX", CAPX_ADDRESS);
  const angel = await ethers.getContractAt("ANGEL", ANGEL_ADDRESS);

  // Time helper
  const now = Math.floor(Date.now() / 1000);
  const DAY = 86400;
  const MONTH = 30 * DAY;
  const YEAR = 365 * DAY;

  console.log("\n" + "=".repeat(60));
  console.log("EXAMPLE 1: Team Member - 4-year vesting with 1-year cliff");
  console.log("=".repeat(60));

  const teamMember = "0xTeamMemberAddress..."; // Replace with actual address
  const teamAmount = ethers.parseEther("10000"); // 10,000 CAPX

  console.log(`\nBeneficiary: ${teamMember}`);
  console.log(`Amount: ${ethers.formatEther(teamAmount)} CAPX`);
  console.log(`Schedule:`);
  console.log(`  - Start: Immediately`);
  console.log(`  - Cliff: 1 year (no tokens during this period)`);
  console.log(`  - Vesting: 3 years linear (after cliff)`);
  console.log(`  - Total Duration: 4 years`);
  console.log(`  - Type: LINEAR (continuous unlock)`);
  console.log(`  - Revocable: No`);

  // Approve tokens
  console.log(`\nApproving ${ethers.formatEther(teamAmount)} CAPX...`);
  await capx.approve(VESTING_ADDRESS, teamAmount);

  // Create schedule
  console.log(`Creating vesting schedule...`);
  const tx1 = await tokenVesting.createVestingSchedule(
    teamMember,
    CAPX_ADDRESS,
    teamAmount,
    now, // Start immediately
    YEAR, // 1-year cliff
    3 * YEAR, // 3-year vesting
    0, // LINEAR (stepDuration = 0)
    false // Not revocable
  );
  const receipt1 = await tx1.wait();
  console.log(`✅ Schedule created! TX: ${tx1.hash}`);

  console.log("\n" + "=".repeat(60));
  console.log("EXAMPLE 2: Advisor - 2-year quarterly vesting");
  console.log("=".repeat(60));

  const advisor = "0xAdvisorAddress..."; // Replace with actual address
  const advisorAmount = ethers.parseEther("5000"); // 5,000 ANGEL

  console.log(`\nBeneficiary: ${advisor}`);
  console.log(`Amount: ${ethers.formatEther(advisorAmount)} ANGEL`);
  console.log(`Schedule:`);
  console.log(`  - Start: Immediately`);
  console.log(`  - Cliff: None`);
  console.log(`  - Vesting: 2 years (8 quarters)`);
  console.log(`  - Unlock: Every 3 months (quarterly)`);
  console.log(`  - Type: STEP (12.5% per quarter)`);
  console.log(`  - Revocable: Yes`);

  console.log(`\nApproving ${ethers.formatEther(advisorAmount)} ANGEL...`);
  await angel.approve(VESTING_ADDRESS, advisorAmount);

  console.log(`Creating vesting schedule...`);
  const tx2 = await tokenVesting.createVestingSchedule(
    advisor,
    ANGEL_ADDRESS,
    advisorAmount,
    now,
    0, // No cliff
    2 * YEAR, // 2-year vesting
    3 * MONTH, // Quarterly steps (3 months)
    true // Revocable
  );
  const receipt2 = await tx2.wait();
  console.log(`✅ Schedule created! TX: ${tx2.hash}`);

  console.log("\n" + "=".repeat(60));
  console.log("EXAMPLE 3: Community Airdrop - 6-month linear");
  console.log("=".repeat(60));

  const recipients = ["0xRecipient1...", "0xRecipient2...", "0xRecipient3..."];

  const amounts = [
    ethers.parseEther("1000"),
    ethers.parseEther("1500"),
    ethers.parseEther("2000"),
  ];

  const totalAmount = amounts.reduce((a, b) => a + b, 0n);

  console.log(`\nBeneficiaries: ${recipients.length}`);
  console.log(`Total Amount: ${ethers.formatEther(totalAmount)} ANGEL`);
  console.log(`Individual Amounts:`);
  recipients.forEach((addr, i) => {
    console.log(`  - ${addr}: ${ethers.formatEther(amounts[i])} ANGEL`);
  });
  console.log(`Schedule:`);
  console.log(`  - Start: Immediately`);
  console.log(`  - Cliff: None`);
  console.log(`  - Vesting: 6 months linear`);
  console.log(`  - Type: LINEAR (continuous unlock)`);
  console.log(`  - Revocable: No`);

  console.log(`\nApproving ${ethers.formatEther(totalAmount)} ANGEL...`);
  await angel.approve(VESTING_ADDRESS, totalAmount);

  console.log(`Creating batch vesting schedules...`);
  const tx3 = await tokenVesting.batchCreateVestingSchedules(
    recipients,
    ANGEL_ADDRESS,
    amounts,
    now,
    0, // No cliff
    6 * MONTH, // 6-month vesting
    0, // LINEAR
    false // Not revocable
  );
  const receipt3 = await tx3.wait();
  console.log(`✅ Batch schedules created! TX: ${tx3.hash}`);

  console.log("\n" + "=".repeat(60));
  console.log("EXAMPLE 4: Early Investor - 3-year with 6-month cliff");
  console.log("=".repeat(60));

  const investor = "0xInvestorAddress..."; // Replace with actual address
  const investorAmount = ethers.parseEther("50000"); // 50,000 CAPX

  console.log(`\nBeneficiary: ${investor}`);
  console.log(`Amount: ${ethers.formatEther(investorAmount)} CAPX`);
  console.log(`Schedule:`);
  console.log(`  - Start: In 30 days (delayed start)`);
  console.log(`  - Cliff: 6 months`);
  console.log(`  - Vesting: 2.5 years linear (after cliff)`);
  console.log(`  - Total Duration: 3 years from start`);
  console.log(`  - Type: LINEAR`);
  console.log(`  - Revocable: No`);

  const futureStart = now + 30 * DAY; // Start in 30 days

  console.log(`\nApproving ${ethers.formatEther(investorAmount)} CAPX...`);
  await capx.approve(VESTING_ADDRESS, investorAmount);

  console.log(`Creating vesting schedule with delayed start...`);
  const tx4 = await tokenVesting.createVestingSchedule(
    investor,
    CAPX_ADDRESS,
    investorAmount,
    futureStart, // Future start date
    6 * MONTH, // 6-month cliff
    2 * YEAR + 6 * MONTH, // 2.5-year vesting
    0, // LINEAR
    false // Not revocable
  );
  const receipt4 = await tx4.wait();
  console.log(`✅ Schedule created! TX: ${tx4.hash}`);
  console.log(
    `Note: Vesting starts on ${new Date(futureStart * 1000).toISOString()}`
  );

  console.log("\n" + "=".repeat(60));
  console.log("BENEFICIARY ACTIONS - How to Claim");
  console.log("=".repeat(60));

  console.log(`
// Beneficiary checks claimable amount
const scheduleId = 0; // Get from getVestingScheduleIds()
const claimable = await tokenVesting.getClaimableAmount(scheduleId);
console.log("Claimable:", ethers.formatEther(claimable));

// Beneficiary claims tokens
await tokenVesting.connect(beneficiary).claim(scheduleId);

// Or claim from multiple schedules
const scheduleIds = [0, 1, 2];
await tokenVesting.connect(beneficiary).batchClaim(scheduleIds);
    `);

  console.log("\n" + "=".repeat(60));
  console.log("ADMIN ACTIONS - Query & Manage");
  console.log("=".repeat(60));

  console.log(`
// Get all schedules for a beneficiary
const scheduleIds = await tokenVesting.getVestingScheduleIds(
    beneficiaryAddress,
    tokenAddress
);

// Get schedule details
const schedule = await tokenVesting.getVestingSchedule(scheduleId);

// Get vested and claimable amounts
const vested = await tokenVesting.getVestedAmount(scheduleId);
const claimable = await tokenVesting.getClaimableAmount(scheduleId);

// Revoke a schedule (if revocable)
await tokenVesting.revokeVesting(scheduleId);

// Pause in emergency
await tokenVesting.pause();

// Unpause
await tokenVesting.unpause();
    `);

  console.log("\n🎉 Examples completed!");
  console.log("\n⚠️  NOTE: This is a demonstration script.");
  console.log(
    "Replace placeholder addresses with actual addresses before running."
  );
}

// Run only if explicitly called
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };
