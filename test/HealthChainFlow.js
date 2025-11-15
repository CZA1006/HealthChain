const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HealthChain end-to-end flow", function () {
  let deployer, user1, user2;
  let htc, registry, market;

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    // 1) Deploy HTC token
    const HealthChainToken = await ethers.getContractFactory("HealthChainToken");
    htc = await HealthChainToken.deploy();
    await htc.waitForDeployment();

    // 2) Deploy DataRegistry
    const DataRegistry = await ethers.getContractFactory("DataRegistry");
    registry = await DataRegistry.deploy();
    await registry.waitForDeployment();

    // 3) Deploy Marketplace
    const Marketplace = await ethers.getContractFactory("Marketplace");
    market = await Marketplace.deploy(htc.target, registry.target);
    await market.waitForDeployment();

    // 4) Tell registry which marketplace is allowed
    const tx = await registry.setMarketplace(market.target);
    await tx.wait();
  });

  it("mints all initial HTC to deployer", async function () {
    const deployerBalance = await htc.balanceOf(deployer.address);
    const totalSupply = await htc.totalSupply();

    expect(deployerBalance).to.equal(totalSupply);
  });

  it("registers health data and lets a buyer purchase access via marketplace", async function () {
    // --- Step 1: deployer registers data ---
    const dataHash = ethers.keccak256(
      ethers.toUtf8Bytes("wearable steps data for sale")
    );

    const tx1 = await registry.registerData(
      dataHash,
      "steps",
      "ipfs://steps-demo"
    );
    await tx1.wait();

    const rec1 = await registry.records(1);
    expect(rec1.owner).to.equal(deployer.address);
    expect(rec1.dataType).to.equal("steps");
    expect(rec1.uri).to.equal("ipfs://steps-demo");

    // --- Step 2: deployer creates listing for dataId=1 ---
    const price = ethers.parseUnits("100", 18); // 100 HTC

    const tx2 = await market.createListing(1, price);
    await tx2.wait();

    const listing1 = await market.listings(1);
    expect(listing1.id).to.equal(1n);
    expect(listing1.dataId).to.equal(1n);
    expect(listing1.seller).to.equal(deployer.address);
    expect(listing1.price).to.equal(price);
    expect(listing1.active).to.equal(true);

    // --- Step 3: deployer sends 500 HTC to user1 ---
    const tx3 = await htc.transfer(user1.address, ethers.parseUnits("500", 18));
    await tx3.wait();

    expect(
      ethers.formatUnits(await htc.balanceOf(user1.address), 18)
    ).to.equal("500.0");

    // --- Step 4: user1 approves marketplace and buys access ---
    const htcUser1 = htc.connect(user1);
    const marketUser1 = market.connect(user1);

    const tx4 = await htcUser1.approve(market.target, price);
    await tx4.wait();

    const tx5 = await marketUser1.buyAccess(1);
    await tx5.wait();

    // --- Step 5: check balances after purchase ---
    const deployerBalance = await htc.balanceOf(deployer.address);
    const user1Balance = await htc.balanceOf(user1.address);

    // Deployer started with totalSupply, sent 500 to user1, then got 100 back
    // => final = totalSupply - 500 + 100 = totalSupply - 400
    const totalSupply = await htc.totalSupply();
    expect(deployerBalance).to.equal(totalSupply - ethers.parseUnits("400", 18));

    // user1: 500 - 100 = 400
    expect(
      ethers.formatUnits(user1Balance, 18)
    ).to.equal("400.0");

    // --- Step 6: user1 now has access to dataId 1 ---
    expect(
      await registry.canAccess(1, user1.address)
    ).to.equal(true);
  });
});
