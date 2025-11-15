const hre = require("hardhat");

async function main() {
  const HealthChainToken = await hre.ethers.getContractFactory("HealthChainToken");
  const DataRegistry = await hre.ethers.getContractFactory("DataRegistry");
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");

  const htc = await HealthChainToken.deploy();
  await htc.waitForDeployment();
  console.log(`HealthChainToken deployed to: ${htc.target}`);

  const registry = await DataRegistry.deploy();
  await registry.waitForDeployment();
  console.log(`DataRegistry deployed to: ${registry.target}`);

  const marketplace = await Marketplace.deploy(htc.target, registry.target);
  await marketplace.waitForDeployment();
  console.log(`Marketplace deployed to: ${marketplace.target}`);

  // 🔹 NEW: tell the registry which marketplace is allowed
  const tx = await registry.setMarketplace(marketplace.target);
  await tx.wait();
  console.log(`Marketplace set in DataRegistry`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
