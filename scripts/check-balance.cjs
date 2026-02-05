const hre = require("hardhat");
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "MON");
  
  // Get gas estimate
  const NudgeBuyback = await hre.ethers.getContractFactory("NudgeBuyback");
  const deployTx = await NudgeBuyback.getDeployTransaction(
    deployer.address,
    "0x865054F0F6A288adaAc30261731361EA7E908003",
    "0xB056d79CA5257589692699a46623F901a3BB76f1"
  );
  
  const gasEstimate = await hre.ethers.provider.estimateGas(deployTx);
  const feeData = await hre.ethers.provider.getFeeData();
  const cost = gasEstimate * feeData.gasPrice;
  
  console.log("Gas estimate:", gasEstimate.toString());
  console.log("Gas price:", hre.ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei");
  console.log("Estimated cost:", hre.ethers.formatEther(cost), "MON");
}
main();
