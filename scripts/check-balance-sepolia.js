// scripts/check-balance-sepolia.js
const { ethers } = require("hardhat");

async function checkBalance(rpcUrl, networkName) {
  try {
    console.log(`\n🔍 Trying ${networkName}...`);
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    // Set a timeout for the provider
    provider.pollingInterval = 1000;

    const address = process.env.PRIVATE_KEY
      ? new ethers.Wallet(process.env.PRIVATE_KEY).address
      : "0x5325C04eC695d1CB13EB984F7956D90717c4Ac6f";

    const balance = await provider.getBalance(address);
    console.log(`✅ ${networkName} connected successfully!`);
    console.log("Address:", address);
    console.log("Balance:", ethers.utils.formatEther(balance), "ETH");

    if (balance.lt(ethers.utils.parseEther("0.001"))) {
      console.log("❌ Insufficient ETH for deployment.");
    } else {
      console.log("✅ Sufficient balance for deployment!");
    }

    return { success: true, balance, provider: rpcUrl };
  } catch (error) {
    console.log(`❌ ${networkName} failed:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log("🔍 Checking Sepolia testnet balances...");

  const rpcEndpoints = [
    {
      url: "https://ethereum-sepolia-rpc.publicnode.com",
      name: "PublicNode RPC",
    },
    {
      url: "https://rpc2.sepolia.org",
      name: "Sepolia Official RPC 2",
    },
    {
      url: "https://rpc.sepolia.org",
      name: "Sepolia Official RPC 1",
    },
    {
      url: "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      name: "Infura RPC",
    },
  ];

  let successfulConnection = null;

  for (const endpoint of rpcEndpoints) {
    const result = await checkBalance(endpoint.url, endpoint.name);
    if (result.success) {
      successfulConnection = result;
      break; // Stop at first successful connection
    }
  }

  if (successfulConnection) {
    console.log("\n🎉 Found working RPC endpoint!");
    console.log("You can now deploy using this endpoint.");
  } else {
    console.log("\n❌ All RPC endpoints failed.");
    console.log("💡 Try these solutions:");
    console.log("1. Check your internet connection");
    console.log("2. Try again in a few minutes");
    console.log("3. Use a VPN if you're in a restricted network");
    console.log("4. Try deploying to Polygon Mumbai instead");
  }
}

main().catch(console.error);
