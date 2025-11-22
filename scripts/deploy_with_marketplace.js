const hre = require("hardhat");

async function main() {
  // 1. Deploy HealthChainToken
  const HealthChainToken = await hre.ethers.getContractFactory("HealthChainToken");
  const htc = await HealthChainToken.deploy();
  await htc.waitForDeployment();
  console.log(`HealthChainToken deployed to: ${htc.target}`);

  // 2. Deploy DataRegistry
  const DataRegistry = await hre.ethers.getContractFactory("DataRegistry");
  const registry = await DataRegistry.deploy();
  await registry.waitForDeployment();
  console.log(`DataRegistry deployed to: ${registry.target}`);

  // 3. Deploy Marketplace
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(htc.target, registry.target);
  await marketplace.waitForDeployment();
  console.log(`Marketplace deployed to: ${marketplace.target}`);

  // 4. Deploy MoveToEarn
  const MoveToEarn = await hre.ethers.getContractFactory("MoveToEarn");
  const moveToEarn = await MoveToEarn.deploy(htc.target, registry.target);
  await moveToEarn.waitForDeployment();
  console.log(`MoveToEarn deployed to: ${moveToEarn.target}`);

  // 5. Set Marketplace in DataRegistry
  const tx = await registry.setMarketplace(marketplace.target);
  await tx.wait();
  console.log(`Marketplace set in DataRegistry`);

  // 6. Fund MoveToEarn contract with rewards (100,000 HTC)
  const fundAmount = hre.ethers.parseEther("100000");
  const fundTx = await htc.transfer(moveToEarn.target, fundAmount);
  await fundTx.wait();
  console.log(`MoveToEarn funded with ${hre.ethers.formatEther(fundAmount)} HTC`);

  // 7. Save contract addresses to frontend
  const fs = require("fs");
  const path = require("path");
  
  const addressesDir = path.join(__dirname, "../frontend/src/contracts");
  if (!fs.existsSync(addressesDir)) {
    fs.mkdirSync(addressesDir, { recursive: true });
  }
  
  const addressesContent = `// Auto-generated contract addresses
// Deployed at: ${new Date().toISOString()}

export const HTC_ADDRESS = "${htc.target}";
export const REGISTRY_ADDRESS = "${registry.target}";
export const MARKETPLACE_ADDRESS = "${marketplace.target}";
export const MOVE_TO_EARN_ADDRESS = "${moveToEarn.target}";

export const CONTRACT_ADDRESSES = {
  healthChainToken: HTC_ADDRESS,
  dataRegistry: REGISTRY_ADDRESS,
  marketplace: MARKETPLACE_ADDRESS,
  moveToEarn: MOVE_TO_EARN_ADDRESS,
};
`;

  fs.writeFileSync(
    path.join(addressesDir, "addresses.js"),
    addressesContent
  );
  console.log("Contract addresses saved to frontend/src/contracts/addresses.js");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
