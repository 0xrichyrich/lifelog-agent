const hre = require("hardhat");

async function main() {
  console.log("🧠 Deploying LifeLog Token ($LIFE) to Monad...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "MON\n");

  // Deploy LifeToken
  const LifeToken = await hre.ethers.getContractFactory("LifeToken");
  const token = await LifeToken.deploy();
  
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  
  console.log("✅ LifeLog Token deployed to:", tokenAddress);
  console.log("\n📊 Token Details:");
  console.log("  Name:", await token.name());
  console.log("  Symbol:", await token.symbol());
  console.log("  Decimals:", await token.decimals());
  console.log("  Max Supply:", hre.ethers.formatEther(await token.MAX_SUPPLY()), "$LIFE");
  
  console.log("\n💰 Reward Rates:");
  console.log("  Daily Goal:", hre.ethers.formatEther(await token.rewardRates(0)), "$LIFE");
  console.log("  Weekly Goal:", hre.ethers.formatEther(await token.rewardRates(1)), "$LIFE");
  console.log("  Streak Bonus:", hre.ethers.formatEther(await token.rewardRates(2)), "$LIFE");
  
  console.log("\n🔓 Feature Costs:");
  console.log("  Premium Insights:", hre.ethers.formatEther(await token.featureCosts("premium_insights")), "$LIFE");
  console.log("  AI Coach Call:", hre.ethers.formatEther(await token.featureCosts("ai_coach_call")), "$LIFE");
  console.log("  Agent Discount:", hre.ethers.formatEther(await token.featureCosts("agent_discount")), "$LIFE");
  
  console.log("\n📝 Next steps:");
  console.log("1. Save contract address to .env: LIFE_TOKEN_ADDRESS=" + tokenAddress);
  console.log("2. Verify on explorer: npx hardhat verify --network monadTestnet", tokenAddress);
  console.log("3. Launch on nad.fun with this contract address");
  console.log("4. Add backend minter: await token.setMinter(backendAddress, true)");

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: tokenAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    txHash: token.deploymentTransaction()?.hash,
  };
  
  console.log("\n📄 Deployment Info:", JSON.stringify(deploymentInfo, null, 2));
  
  return deploymentInfo;
}

main()
  .then((info) => {
    console.log("\n🎉 Deployment successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
