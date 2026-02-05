const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying Nudge Fee Contracts to Monad Testnet...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "MON\n");

  // Treasury wallet (platform wallet that will accumulate fees)
  const TREASURY = "0x2390C495896C78668416859d9dE84212fCB10801";
  const OWNER = deployer.address;

  // Deploy FeeSplitter
  console.log("📦 Deploying FeeSplitter...");
  const FeeSplitter = await hre.ethers.getContractFactory("NudgeFeeSplitter");
  const feeSplitter = await FeeSplitter.deploy(TREASURY, OWNER);
  await feeSplitter.waitForDeployment();
  const feeSplitterAddress = await feeSplitter.getAddress();
  console.log("✅ FeeSplitter deployed to:", feeSplitterAddress);

  // Deploy NudgeBuyback
  console.log("\n📦 Deploying NudgeBuyback...");
  const NudgeBuyback = await hre.ethers.getContractFactory("NudgeBuyback");
  const buyback = await NudgeBuyback.deploy(OWNER);
  await buyback.waitForDeployment();
  const buybackAddress = await buyback.getAddress();
  console.log("✅ NudgeBuyback deployed to:", buybackAddress);

  // Configure FeeSplitter to accept common tokens
  console.log("\n⚙️ Configuring accepted tokens...");
  
  // Accept native MON (address(0) is handled separately)
  // Accept $NUDGE token
  const NUDGE_TOKEN = "0xaEb52D53b6c3265580B91Be08C620Dc45F57a35F";
  
  try {
    const tx = await feeSplitter.setAcceptedToken(NUDGE_TOKEN, true);
    await tx.wait();
    console.log("✅ $NUDGE token accepted for payments");
  } catch (e) {
    console.log("⚠️ Could not set accepted token:", e.message);
  }

  // Set NUDGE token on buyback contract
  console.log("\n⚙️ Setting NUDGE token on buyback contract...");
  try {
    const tx2 = await buyback.setNudgeToken(NUDGE_TOKEN);
    await tx2.wait();
    console.log("✅ NUDGE token set on buyback contract");
  } catch (e) {
    console.log("⚠️ Could not set NUDGE token:", e.message);
  }

  // Summary
  console.log("\n" + "═".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("═".repeat(60));
  console.log(`Network:        Monad Testnet (${hre.network.config.chainId})`);
  console.log(`FeeSplitter:    ${feeSplitterAddress}`);
  console.log(`NudgeBuyback:   ${buybackAddress}`);
  console.log(`Treasury:       ${TREASURY}`);
  console.log(`NUDGE Token:    ${NUDGE_TOKEN}`);
  console.log(`Owner:          ${OWNER}`);
  console.log("═".repeat(60));

  console.log("\n📝 Next steps:");
  console.log("1. Register agents: feeSplitter.registerAgent(agentId, wallet)");
  console.log("2. Users pay via: feeSplitter.payAgentNative(agentId) or payAgent()");
  console.log("3. Treasury accumulates 20% of fees");
  console.log("4. Run buybacks: buyback.executeBuyback(100) // 1% slippage");
  console.log("5. Distribute: buyback.distributeRewards()");
  console.log("6. Users claim: buyback.claimRewards()");

  // Save deployment addresses
  const fs = require("fs");
  const deployments = {
    network: "monad-testnet",
    chainId: hre.network.config.chainId,
    timestamp: new Date().toISOString(),
    contracts: {
      FeeSplitter: feeSplitterAddress,
      NudgeBuyback: buybackAddress,
    },
    config: {
      treasury: TREASURY,
      nudgeToken: NUDGE_TOKEN,
      owner: OWNER,
      agentShareBps: 8000,
      treasuryShareBps: 2000,
    },
  };

  fs.writeFileSync(
    "./deployments/fee-contracts.json",
    JSON.stringify(deployments, null, 2)
  );
  console.log("\n💾 Saved to deployments/fee-contracts.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
