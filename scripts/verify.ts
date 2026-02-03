import { run } from "hardhat";

async function main() {
  const contractAddress = process.env.LIFE_TOKEN_ADDRESS;
  
  if (!contractAddress) {
    console.error("❌ Set LIFE_TOKEN_ADDRESS environment variable");
    process.exit(1);
  }

  console.log("🔍 Verifying LifeToken at:", contractAddress);
  
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });
    console.log("✅ Contract verified successfully!");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Contract is already verified");
    } else {
      console.error("❌ Verification failed:", error);
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
