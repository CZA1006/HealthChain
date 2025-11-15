# HealthChain 🩺📊  
_A blockchain-based framework for tokenized health data ownership and exchange_

---

## Table of Contents

1. [Project Concept](#1-project-concept)
   - [Motivation](#motivation)
   - [High-level Architecture](#high-level-architecture)
2. [Smart Contracts Overview](#2-smart-contracts-overview)
   - [HealthChainToken (HTC)](#21-healthchaintoken-htc)
   - [DataRegistry](#22-dataregistry)
   - [Marketplace](#23-marketplace)
3. [Repository Structure](#3-repository-structure)
4. [Prerequisites & Environment Setup](#4-prerequisites--environment-setup)
   - [Node.js & npm](#nodejs--npm)
   - [Install Dependencies](#install-dependencies)
5. [Hardhat Usage](#5-hardhat-usage)
   - [Compile Contracts](#compile-contracts)
   - [Run Tests](#run-tests)
   - [Start Local Node](#start-local-node)
   - [Deploy Contracts](#deploy-contracts)
6. [End-to-End Demo Flow](#6-end-to-end-demo-flow)
   - [Step 1 — Start Local Node](#step-1--start-local-node)
   - [Step 2 — Deploy Contracts](#step-2--deploy-contracts)
   - [Step 3 — Interact via Hardhat Console](#step-3--interact-via-hardhat-console)
7. [Design Decisions & Security Notes](#7-design-decisions--security-notes)
8. [Future Work](#8-future-work)

---

## 1. Project Concept

### Motivation

Modern wearable devices (Apple Watch, Fitbit, Xiaomi Band, etc.) generate huge amounts of personal health data (steps, heart rate, sleep, activity logs).  

However:

- These data are usually stored and monetized by **centralized platforms**, not by the user.
- Users have **limited control** over who can access or purchase their data.
- There is no transparent, on-chain record tying **ownership, access rights and payments** together.

**HealthChain** aims to address this by:

- Treating health data as a **user-owned digital asset**.
- Storing **proof of data existence and ownership** on-chain (hash + metadata).
- Allowing users to **sell access** to their health data in exchange for a native token (**HTC – HealthChain Token**).
- Providing a transparent, auditable log of **who can access which data and why**.

### High-level Architecture

We separate the system into **off-chain** and **on-chain** components:

- **Off-chain:**
  - Raw health data files (e.g., JSON, CSV, ZIP) are stored on IPFS or a secure server.
  - The contract only sees a **hash** of the data plus an URI, not the raw contents.

- **On-chain (this repo):**
  - [`HealthChainToken.sol`](contracts/HealthChainToken.sol): ERC‑20 token used for payments in the ecosystem.
  - [`DataRegistry.sol`](contracts/DataRegistry.sol): registry of health data records and access permissions.
  - [`Marketplace.sol`](contracts/Marketplace.sol): simple marketplace where data owners can sell access to their records for HTC.

**Core flow:**

1. A user uploads wearable data off-chain, computes a hash, and calls `DataRegistry.registerData(...)`.
2. The registry stores:
   - data owner
   - data hash
   - data type (e.g. "steps")
   - URI to the data (e.g. `ipfs://...`).
3. The owner creates a listing in the `Marketplace` contract with a price in HTC.
4. Another user buys access by paying HTC to the owner through `Marketplace`.
5. `Marketplace` calls back into `DataRegistry` to grant the buyer access, so on-chain we know the buyer is authorized to fetch/use that off-chain data.

---

## 2. Smart Contracts Overview

### 2.1 `HealthChainToken` (HTC)

File: [`contracts/HealthChainToken.sol`](contracts/HealthChainToken.sol)

- Implements an ERC‑20 token using OpenZeppelin.
- **Name:** `HealthChain Token`  
- **Symbol:** `HTC`
- **Decimals:** 18
- On deployment:
  - The entire initial supply (e.g. 1,000,000 HTC) is minted to the deployer.

**Key responsibilities:**

- Act as the **medium of exchange** in the HealthChain marketplace.
- Allow standard ERC‑20 operations: `transfer`, `approve`, `transferFrom`, `balanceOf`, etc.

---

### 2.2 `DataRegistry`

File: [`contracts/DataRegistry.sol`](contracts/DataRegistry.sol)

Stores metadata and access control for health data records.

Each record:

```solidity
struct DataRecord {
    address owner;      // who controls the data
    bytes32 dataHash;   // hash of the off-chain data
    string dataType;    // e.g. "steps", "heart_rate"
    string uri;         // pointer to off-chain data, e.g. ipfs://...
    uint256 createdAt;  // timestamp
}
```

- Records are stored in a `mapping(uint256 => DataRecord) public records;`
- `dataId` starts from 1 and increments for each new registration.

**Key functions:**

- `registerData(bytes32 hash, string dataType, string uri)`  
  - **Caller becomes `owner` of the new record.**
  - Emits an event (e.g. `DataRegistered`).
- `grantAccess(uint256 dataId, address user)`  
  - Only the `owner` or an authorized `marketplace` can call this.
- `revokeAccess(uint256 dataId, address user)`  
  - Revert access previously granted.
- `canAccess(uint256 dataId, address user) public view returns (bool)`  
  - Returns `true` if:
    - `user` is the owner, or
    - access has been explicitly granted.

**Marketplace integration:**

- `setMarketplace(address marketplace)`  
  - Sets the only marketplace contract that can automatically grant access upon successful purchase.
  - Normally called once right after deploying `Marketplace`.

---

### 2.3 `Marketplace`

File: [`contracts/Marketplace.sol`](contracts/Marketplace.sol)

Simple listing & purchase market.

```solidity
struct Listing {
    uint256 id;       // listing ID
    uint256 dataId;   // which record in DataRegistry
    address seller;   // record owner
    uint256 price;    // price in HTC (ERC-20)
    bool active;      // false after purchase or cancellation
}
```

**Key functions:**

- `createListing(uint256 dataId, uint256 price)`
  - Only the **owner** of the data record (in `DataRegistry`) can create a listing.
  - Stores listing and marks it as `active`.

- `buyAccess(uint256 listingId)`
  - Buyer must:
    - Hold enough HTC.
    - Approve the marketplace to spend at least `price` HTC.
  - On success:
    - Transfers `price` HTC from buyer to seller.
    - Calls `DataRegistry.grantAccess(dataId, buyer)` so the buyer is authorized.
    - Deactivates the listing (`active = false`).

This is intentionally minimal to keep the protocol easy to reason about for teaching / demo purposes.

---

## 3. Repository Structure

Typical layout:

```text
HealthChain/
├── contracts/
│   ├── HealthChainToken.sol      # ERC-20 HTC token
│   ├── DataRegistry.sol          # Health data registry & access control
│   └── Marketplace.sol           # Data access marketplace
├── scripts/
│   ├── deploy.js                 # (optional initial token deploy)
│   ├── deploy_all.js             # deploy HTC + DataRegistry
│   └── deploy_with_marketplace.js# deploy HTC + DataRegistry + Marketplace and wire them
├── test/
│   └── HealthChainFlow.js        # end-to-end Hardhat tests
├── hardhat.config.js             # Hardhat configuration
├── package.json                  # Node dependencies & scripts
└── README.md                     # (this file)
```

---

## 4. Prerequisites & Environment Setup

### Node.js & npm

You need:

- **Node.js** ≥ 18 (project developed with Node 20.x)
- **npm** (comes with Node)

Check versions:

```bash
node -v
npm -v
```

If you are using `conda`, you can still manage Node via `nvm` or your system package manager. The blockchain part only needs Node, not Python.

### Install Dependencies

Clone the repository and install packages:

```bash
git clone https://github.com/CZA1006/HealthChain.git
cd HealthChain

# (Optional) If you use conda:
# conda activate healthchain-env

npm install
```

This installs Hardhat, the toolbox, OpenZeppelin contracts, etc.

---

## 5. Hardhat Usage

All commands below assume you are in the **project root (`HealthChain/`)**.

### Compile Contracts

```bash
npx hardhat compile
```

If everything is set up correctly, there should be no compilation errors.

### Run Tests

The repository includes an end‑to‑end test: `test/HealthChainFlow.js`.

Run:

```bash
npx hardhat test
```

Expected output (simplified):

```text
HealthChain end-to-end flow
  ✓ mints all initial HTC to deployer
  ✓ registers health data and lets a buyer purchase access via marketplace

2 passing (...)
```

This test automatically:

1. Deploys `HealthChainToken`, `DataRegistry`, `Marketplace`.
2. Registers a fake `"steps"` dataset.
3. Creates a listing.
4. Transfers HTC to a buyer.
5. Buyer approves & buys access.
6. Verifies balances and that `registry.canAccess(1, buyer)` is `true`.

### Start Local Node

To manually interact with contracts, start a persistent local blockchain:

```bash
npx hardhat node
```

- Runs a local JSON-RPC node at `http://127.0.0.1:8545/`.
- Prints 20 funded accounts (each with 10,000 ETH on the local chain).

Leave this terminal **running**.

### Deploy Contracts

Open a **new terminal** (with the node still running), go to the project directory, and run:

```bash
npx hardhat run scripts/deploy_with_marketplace.js --network localhost
```

You should see output like:

```text
HealthChainToken deployed to: 0x5FbDB2...
DataRegistry deployed to:     0xe7f1725...
Marketplace deployed to:      0x9fE4673...
Marketplace set in DataRegistry
```

These are the addresses you will use in the console or frontend.

---

## 6. End-to-End Demo Flow

This section shows the same logic as the test, but step-by-step in the **Hardhat console**, so you can see each transaction.

### Step 1 – Start Local Node

Terminal 1:

```bash
cd HealthChain
npx hardhat node
```

### Step 2 – Deploy Contracts

Terminal 2:

```bash
cd HealthChain
npx hardhat run scripts/deploy_with_marketplace.js --network localhost
```

Copy the printed addresses (HTC, DataRegistry, Marketplace).

### Step 3 – Interact via Hardhat Console

Terminal 3:

```bash
cd HealthChain
npx hardhat console --network localhost
```

Now run the following in the console:

#### 3.1 Get accounts and contract instances

```js
const [deployer, user1, user2] = await ethers.getSigners();

const htc = await ethers.getContractAt(
  "HealthChainToken",
  "0x...HTC_ADDRESS_FROM_DEPLOY..."
);

const registry = await ethers.getContractAt(
  "DataRegistry",
  "0x...REGISTRY_ADDRESS_FROM_DEPLOY..."
);

const market = await ethers.getContractAt(
  "Marketplace",
  "0x...MARKETPLACE_ADDRESS_FROM_DEPLOY..."
);

// quick sanity check
await htc.name();   // "HealthChain Token"
await htc.symbol(); // "HTC"
```

#### 3.2 Register a health data record

Pretend we have “wearable steps data for sale” stored off-chain:

```js
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
rec1.owner;    // = deployer.address
rec1.dataType; // "steps"
rec1.uri;      // "ipfs://steps-demo"
```

#### 3.3 Create a marketplace listing

```js
const price = ethers.parseUnits("100", 18); // 100 HTC

const tx2 = await market.createListing(1, price);
await tx2.wait();

const listing1 = await market.listings(1);
listing1;
// listing1.active === true
```

#### 3.4 Give buyer some HTC

```js
await htc.transfer(user1.address, ethers.parseUnits("500", 18));

ethers.formatUnits(await htc.balanceOf(user1.address), 18);   // "500.0"
ethers.formatUnits(await htc.balanceOf(deployer.address), 18); // 1,000,000 - 500
```

#### 3.5 Buyer approves marketplace and buys access

```js
const htcUser1 = htc.connect(user1);
const marketUser1 = market.connect(user1);

// Approve marketplace to spend 100 HTC
await (await htcUser1.approve(market.target, price)).wait();

// Buy access to listing 1
await (await marketUser1.buyAccess(1)).wait();
```

#### 3.6 Check balances and access rights

```js
// Deployer: totalSupply - 400 (sent 500, received 100)
ethers.formatUnits(await htc.balanceOf(deployer.address), 18);

// user1: 500 - 100 = 400
ethers.formatUnits(await htc.balanceOf(user1.address), 18);   // "400.0"

// Access check: user1 should now have access to dataId 1
await registry.canAccess(1, user1.address);  // true
```

You have now completed a full cycle:

1. Data registered.
2. Listing created.
3. Buyer purchases with HTC.
4. On-chain permission updated.

---

## 7. Design Decisions & Security Notes

- **Off-chain storage**:  
  Only hashes and URIs are stored on-chain. Raw health data **must not** be stored on-chain because:
  - It is public and immutable.
  - It cannot be easily removed to respect privacy regulations.

- **Registry / marketplace coupling**:  
  `DataRegistry` has a `setMarketplace` function. Only that marketplace is allowed to auto‑grant access after purchase. This avoids arbitrary external contracts manipulating permissions.

- **Simple pricing model**:  
  The current marketplace uses a fixed price per listing and a single buyer per listing. This keeps logic easy to verify.

- **No KYC / compliance logic**:  
  This prototype does **not** implement regulatory checks. In a real deployment, additional off-chain processes and/or smart contract layers would be needed.

- **Test coverage**:  
  `test/HealthChainFlow.js` covers the most important “happy path”. More tests (reverts, edge cases, multiple listings, revocations) can be added.

---

## 8. Future Work

Possible extensions for the full course project:

1. **Role-based access & organizations**
   - Support data consumers like hospitals, research labs, insurance companies.
   - Group permissions (e.g., allow a whole research group).

2. **Richer marketplace features**
   - Multiple buyers per listing.
   - Royalties or revenue sharing.
   - Time-limited access or subscription models.

3. **Frontend DApp**
   - React or Next.js interface:
     - Connect MetaMask.
     - Upload data & compute hash.
     - Register records and create listings via web UI.
     - Browse marketplace and buy access.

4. **Integration with real data & IPFS**
   - Connect to an actual IPFS pinning service.
   - Provide scripts to hash real wearable CSV / JSON files.

5. **Advanced tokenomics**
   - Reward long-term data contributors.
   - Staking mechanisms or governance for protocol parameters.

---

> This repository focuses on the **core smart contract logic and local prototype tooling** using Hardhat.  
> It is meant as a teaching / research prototype for MSBD5017, not as production code.  
