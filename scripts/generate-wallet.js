// scripts/generate-wallet.js
// Standalone script to generate a new wallet for deployment
// Usage: node scripts/generate-wallet.js

const { ethers } = require("ethers");

function generateWallet() {
  // Generate a new random wallet with mnemonic
  const wallet = ethers.Wallet.createRandom();

  const address = wallet.address;
  const privateKey = wallet.privateKey;
  const mnemonic = wallet.mnemonic?.phrase || null;

  return { address, privateKey, mnemonic };
}

function printWalletInfo(wallet) {
  console.log("\n" + "=".repeat(70));
  console.log("                    NEW WALLET GENERATED");
  console.log("=".repeat(70));

  console.log("\n📬 Address:");
  console.log(`   ${wallet.address}`);

  console.log("\n🔑 Private Key:");
  console.log(`   ${wallet.privateKey}`);

  if (wallet.mnemonic) {
    console.log("\n📝 Mnemonic Phrase (12 words):");
    console.log(`   ${wallet.mnemonic}`);
  }

  console.log("\n" + "-".repeat(70));
  console.log("                    SECURITY WARNINGS");
  console.log("-".repeat(70));

  console.log("\n⚠️  CRITICAL - READ CAREFULLY:");
  console.log("   1. NEVER share your private key or mnemonic with anyone");
  console.log("   2. NEVER commit these to git or any version control");
  console.log("   3. NEVER use this wallet for mainnet without proper backup");
  console.log("   4. Store this information in a secure, encrypted location");
  console.log("   5. This wallet is recommended for TESTING purposes only");

  console.log("\n" + "-".repeat(70));
  console.log("                    .ENV CONFIGURATION");
  console.log("-".repeat(70));

  console.log("\n📋 Add this to your .env file:\n");
  console.log(`PRIVATE_KEY=${wallet.privateKey}`);

  console.log("\n" + "-".repeat(70));
  console.log("                    NEXT STEPS");
  console.log("-".repeat(70));

  console.log("\n1. Copy the PRIVATE_KEY line above to your .env file");
  console.log("2. Fund your wallet with testnet tokens:");
  console.log("   - Polygon Amoy: https://faucet.polygon.technology/");
  console.log("   - BSC Testnet:  https://testnet.bnbchain.org/faucet-smart");
  console.log("3. Check balance: node scripts/check-balance.js");
  console.log(
    "4. Deploy: npx hardhat run scripts/deploy.js --network polygonAmoy"
  );

  console.log("\n" + "=".repeat(70) + "\n");
}

function main() {
  try {
    const wallet = generateWallet();
    printWalletInfo(wallet);
  } catch (error) {
    console.error("\n❌ Failed to generate wallet:", error.message);
    process.exit(1);
  }
}

main();
