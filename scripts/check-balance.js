const { ethers } = require("ethers");

async function checkBalance(rpcUrl, networkName) {
  try {
    console.log(`\n🔍 Trying ${networkName}...`);
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const address = process.env.PRIVATE_KEY
      ? new ethers.Wallet(process.env.PRIVATE_KEY).address
      : null;

    if (!address) {
      throw new Error("Set PRIVATE_KEY in .env to check balance");
    }

    const balance = await provider.getBalance(address);
    console.log(`✅ ${networkName} connected successfully!`);
    console.log("Address:", address);
    console.log("Balance:", ethers.formatEther(balance));

    return { success: true, balance, rpcUrl };
  } catch (error) {
    console.log(`❌ ${networkName} failed:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log("🔍 Checking balances on configured networks...");

  const endpoints = [
    {
      name: "Polygon Mainnet",
      url:
        process.env.POLYGON_RPC_URL || "https://polygon-bor-rpc.publicnode.com",
    },
    {
      name: "Polygon Amoy Testnet",
      url:
        process.env.POLYGON_AMOY_RPC_URL ||
        "https://polygon-amoy-bor-rpc.publicnode.com",
    },
    {
      name: "BSC Mainnet",
      url: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org",
    },
    {
      name: "BSC Testnet",
      url:
        process.env.BSC_TESTNET_RPC_URL ||
        "https://data-seed-prebsc-1-s1.binance.org:8545/",
    },
  ];

  for (const ep of endpoints) {
    await checkBalance(ep.url, ep.name);
  }
}

main().catch(console.error);
