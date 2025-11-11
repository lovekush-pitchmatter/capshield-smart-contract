// scripts/generate-wallet.js
const { ethers } = require("ethers");

async function main() {
  console.log("🔐 Generating new wallet for testing...\n");
  
  // Generate a new random wallet
  const wallet = ethers.Wallet.createRandom();
  
  console.log("✅ New Wallet Generated Successfully!");
  console.log("📬 Address:", wallet.address);
  console.log("🔑 Private Key:", wallet.privateKey);
  console.log("📝 Mnemonic:", wallet.mnemonic.phrase);
  
  console.log("\n⚠️  IMPORTANT SECURITY NOTES:");
  console.log("1. Save this information in a secure place");
  console.log("2. Use this ONLY for testing purposes");
  console.log("3. Never share your private key or mnemonic");
  console.log("4. Update your .env file with the new private key");
  
  console.log("\n📋 Copy this to your .env file:");
  console.log(`PRIVATE_KEY=${wallet.privateKey}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});