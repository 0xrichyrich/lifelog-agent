const hre = require("hardhat");

const NADFUN_CONTRACTS = {
  testnet: {
    router: "0x865054F0F6A288adaAc30261731361EA7E908003",
    lens: "0xB056d79CA5257589692699a46623F901a3BB76f1",
  },
  mainnet: {
    router: "0x6F6B8F1a20703309951a5127c45B49b1CD981A22",
    lens: "0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea",
  },
};

async function main() {
  const chainId = hre.network.config.chainId;
  const isMainnet = chainId === 143;
  const nadfunConfig = isMainnet ? NADFUN_CONTRACTS.mainnet : NADFUN_CONTRACTS.testnet;
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "MON\n");

  console.log("📦 Deploying NudgeBuyback...");
  const NudgeBuyback = await hre.ethers.getContractFactory("NudgeBuyback");
  
  // Deploy with explicit gas limit
  const buyback = await NudgeBuyback.deploy(
    deployer.address,
    nadfunConfig.router,
    nadfunConfig.lens,
    {
      gasLimit: 4000000 // 4M gas limit
    }
  );
  await buyback.waitForDeployment();
  const buybackAddress = await buyback.getAddress();
  console.log("✅ NudgeBuyback deployed to:", buybackAddress);

  // Configure NUDGE token
  const NUDGE_TOKEN = "0xaEb52D53b6c3265580B91Be08C620Dc45F57a35F";
  const tx = await buyback.setNudgeToken(NUDGE_TOKEN);
  await tx.wait();
  console.log("✅ NUDGE token configured");
  
  console.log("\n════════════════════════════════════════════════════════════");
  console.log("📋 BUYBACK CONTRACT (v3 - Weighted)");
  console.log("════════════════════════════════════════════════════════════");
  console.log(`NudgeBuyback:   ${buybackAddress}`);
  console.log(`FeeSplitter:    0xA3c103809d995a0e4d698b69f3DB9f2da643c053`);
  console.log("════════════════════════════════════════════════════════════");
  console.log("\n✓ Weighted distribution (users earn by contribution)");
  console.log("✓ Max 10,000 recipients cap");
  console.log("✓ O(1) recipient removal");
  console.log("✓ Statistics tracking");
}

main()
  .then(() => process.exit(0))
  .catch(console.error);
