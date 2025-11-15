const hre = require("hardhat");

async function main() {
  const HealthChainToken = await hre.ethers.getContractFactory("HealthChainToken");
  const htc = await HealthChainToken.deploy();

  await htc.waitForDeployment();

  console.log(`HealthChainToken deployed to: ${htc.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
