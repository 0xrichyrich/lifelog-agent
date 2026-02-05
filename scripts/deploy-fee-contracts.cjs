const hre = require("hardhat");

// nad.fun contract addresses per network
const NADFUN_CONTRACTS = {
  // Monad Testnet (Chain ID: 10143)
  testnet: {
    router: "0x865054F0F6A288adaAc30261731361EA7E908003",
    lens: "0xB056d79CA5257589692699a46623F901a3BB76f1",
  },
  // Monad Mainnet (Chain ID: 143)
  mainnet: {
    router: "0x6F6B8F1a20703309951a5127c45B49b1CD981A22",
    lens: "0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea",
  },
};

async function main() {
  const networkName = hre.network.name;
  const chainId = hre.network.config.chainId;
  
  // Determine if testnet or mainnet
  const isMainnet = chainId === 143;
  const nadfunConfig = isMainnet ? NADFUN_CONTRACTS.mainnet : NADFUN_CONTRACTS.testnet;
  
  console.log(`🚀 Deploying Nudge Fee Contracts to ${networkName}...\n`);
  console.log(`Chain ID: ${chainId} (${isMainnet ? 'MAINNET' : 'TESTNET'})`);
  console.log(`nad.fun Router: ${nadfunConfig.router}`);
  console.log(`nad.fun Lens: ${nadfunConfig.lens}\n`);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "MON\n");

  if (parseFloat(hre.ethers.formatEther(balance)) < 0.1) {
    console.error("❌ Insufficient balance for deployment (need at least 0.1 MON)");
    process.exit(1);
  }

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

  // Deploy NudgeBuyback with network-specific nad.fun addresses
  console.log("\n📦 Deploying NudgeBuyback...");
  const NudgeBuyback = await hre.ethers.getContractFactory("NudgeBuyback");
  const buyback = await NudgeBuyback.deploy(
    OWNER,
    nadfunConfig.router,
    nadfunConfig.lens
  );
  await buyback.waitForDeployment();
  const buybackAddress = await buyback.getAddress();
  console.log("✅ NudgeBuyback deployed to:", buybackAddress);

  // Configure FeeSplitter to accept common tokens
  console.log("\n⚙️ Configuring FeeSplitter...");
  
  // $NUDGE token (testnet deployment - update for mainnet when available)
  const NUDGE_TOKEN = isMainnet 
    ? process.env.MAINNET_NUDGE_TOKEN || "0x0000000000000000000000000000000000000000"
    : "0xaEb52D53b6c3265580B91Be08C620Dc45F57a35F";
  
  if (NUDGE_TOKEN !== "0x0000000000000000000000000000000000000000") {
    try {
      const tx = await feeSplitter.setAcceptedToken(NUDGE_TOKEN, true);
      await tx.wait();
      console.log("✅ $NUDGE token accepted for payments");
      
      // Set NUDGE token on buyback contract
      const tx2 = await buyback.setNudgeToken(NUDGE_TOKEN);
      await tx2.wait();
      console.log("✅ NUDGE token set on buyback contract");
    } catch (e) {
      console.log("⚠️ Could not configure NUDGE token:", e.message);
    }
  } else {
    console.log("⚠️ NUDGE token not configured (set MAINNET_NUDGE_TOKEN for mainnet)");
  }

  // Summary
  console.log("\n" + "═".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("═".repeat(60));
  console.log(`Network:        ${networkName} (${chainId})`);
  console.log(`Environment:    ${isMainnet ? '🔴 MAINNET' : '🟢 TESTNET'}`);
  console.log(`FeeSplitter:    ${feeSplitterAddress}`);
  console.log(`NudgeBuyback:   ${buybackAddress}`);
  console.log(`Treasury:       ${TREASURY}`);
  console.log(`NUDGE Token:    ${NUDGE_TOKEN}`);
  console.log(`Owner:          ${OWNER}`);
  console.log(`nad.fun Router: ${nadfunConfig.router}`);
  console.log(`nad.fun Lens:   ${nadfunConfig.lens}`);
  console.log("═".repeat(60));

  console.log("\n📝 Contract Features:");
  console.log("✓ Pausable (emergency stop)");
  console.log("✓ Agent active/inactive status");
  console.log("✓ Configurable nad.fun addresses");
  console.log("✓ Statistics tracking");
  console.log("✓ O(1) recipient removal");
  console.log("✓ Minimum buyback threshold");
  console.log("✓ Slippage protection (max 10%)");

  console.log("\n📝 Next steps:");
  console.log("1. Register agents: feeSplitter.registerAgent(agentId, wallet)");
  console.log("2. Users pay via: feeSplitter.payAgentNative(agentId) or payAgent()");
  console.log("3. Treasury accumulates 20% of fees");
  console.log("4. Run buybacks: buyback.executeBuyback(100) // 1% slippage");
  console.log("5. Distribute: buyback.distributeRewards()");
  console.log("6. Users claim: buyback.claimRewards()");

  // Save deployment addresses
  const fs = require("fs");
  const deploymentFile = isMainnet ? "fee-contracts-mainnet.json" : "fee-contracts.json";
  
  const deployments = {
    network: networkName,
    chainId: chainId,
    environment: isMainnet ? "mainnet" : "testnet",
    timestamp: new Date().toISOString(),
    contracts: {
      FeeSplitter: feeSplitterAddress,
      NudgeBuyback: buybackAddress,
    },
    nadfun: nadfunConfig,
    config: {
      treasury: TREASURY,
      nudgeToken: NUDGE_TOKEN,
      owner: OWNER,
      agentShareBps: 8000,
      treasuryShareBps: 2000,
    },
    features: [
      "pausable",
      "agent-status",
      "configurable-nadfun",
      "statistics",
      "o1-removal",
      "min-buyback",
      "slippage-protection"
    ]
  };

  fs.writeFileSync(
    `./deployments/${deploymentFile}`,
    JSON.stringify(deployments, null, 2)
  );
  console.log(`\n💾 Saved to deployments/${deploymentFile}`);

  if (isMainnet) {
    console.log("\n⚠️  MAINNET DEPLOYMENT CHECKLIST:");
    console.log("[ ] Verify contracts on block explorer");
    console.log("[ ] Transfer ownership to multisig");
    console.log("[ ] Test all functions with small amounts");
    console.log("[ ] Set up monitoring for events");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
