const hre = require("hardhat");

async function main() {
  const HealthChainToken = await hre.ethers.getContractFactory("HealthChainToken");
  const DataRegistry = await hre.ethers.getContractFactory("DataRegistry");

  const htc = await HealthChainToken.deploy();
  await htc.waitForDeployment();
  console.log(`HealthChainToken deployed to: ${htc.target}`);

  const registry = await DataRegistry.deploy();
  await registry.waitForDeployment();
  console.log(`DataRegistry deployed to: ${registry.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
