import { ethers } from "hardhat";

async function main() {
  console.log("🧠 Deploying LifeLog Token ($LIFE) to Monad...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "MON\n");

  // Deploy LifeToken
  const LifeToken = await ethers.getContractFactory("LifeToken");
  const token = await LifeToken.deploy();
  
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  
  console.log("✅ LifeLog Token deployed to:", tokenAddress);
  console.log("\n📊 Token Details:");
  console.log("  Name:", await token.name());
  console.log("  Symbol:", await token.symbol());
  console.log("  Decimals:", await token.decimals());
  console.log("  Max Supply:", ethers.formatEther(await token.MAX_SUPPLY()), "$LIFE");
  
  console.log("\n💰 Reward Rates:");
  console.log("  Daily Goal:", ethers.formatEther(await token.rewardRates(0)), "$LIFE");
  console.log("  Weekly Goal:", ethers.formatEther(await token.rewardRates(1)), "$LIFE");
  console.log("  Streak Bonus:", ethers.formatEther(await token.rewardRates(2)), "$LIFE");
  
  console.log("\n🔓 Feature Costs:");
  console.log("  Premium Insights:", ethers.formatEther(await token.featureCosts("premium_insights")), "$LIFE");
  console.log("  AI Coach Call:", ethers.formatEther(await token.featureCosts("ai_coach_call")), "$LIFE");
  console.log("  Agent Discount:", ethers.formatEther(await token.featureCosts("agent_discount")), "$LIFE");
  
  console.log("\n📝 Next steps:");
  console.log("1. Save contract address to .env: LIFE_TOKEN_ADDRESS=" + tokenAddress);
  console.log("2. Verify on explorer: npx hardhat verify --network monadTestnet", tokenAddress);
  console.log("3. Launch on nad.fun with this contract address");
  console.log("4. Add backend minter: await token.setMinter(backendAddress, true)");

  // Save deployment info
  const deploymentInfo = {
    network: "monadTestnet",
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
