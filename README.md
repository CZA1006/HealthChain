# HealthChain: A Tokenized, Decentralized Marketplace for Wearable Health Data

> **Course project – MSBD5017 (RWA group G2)**  
> HealthChain is a teaching-oriented prototype that shows how **wearable health data**  
> (e.g., from Apple Watch / Fitbit) can be:
> - Registered on-chain as a **verifiable asset**  
> - Tokenized and priced using an **ERC-20 utility token (HTC)**  
> - Traded via a simple **decentralized marketplace**  
> - Access-controlled through a **data registry** that records who is allowed to read a given dataset.

The current implementation runs fully locally using:

- **Hardhat** (Solidity, local Ethereum node)
- **React + Vite + ethers** (frontend demo dApp)
- **MetaMask** (wallet, connected to the Hardhat `localhost` network)

---

## 1. High-Level Architecture

At a high level, HealthChain consists of three smart contracts plus a minimal web dApp:

1. **HealthChainToken (`HTC`)**
   - Standard ERC-20 token (18 decimals).
   - Used to pay for access to health datasets.

2. **DataRegistry**
   - On-chain registry of **hashed health data records**.
   - Records which Ethereum address **owns** a dataset.
   - Keeps track of which addresses are **authorized to access** each dataset.

3. **Marketplace**
   - Allows owners to **create listings** for their datasets with a price in HTC.
   - Allows buyers to **purchase access** if they have enough HTC and have approved the marketplace.
   - Automatically calls the registry to grant access on successful purchase.

4. **Frontend demo dApp (`frontend/` – Vite + React)**
   - Simple webpage that walks through the end-to-end flow:
     1. Connect MetaMask (Hardhat Localhost).
     2. Register wearable data (hash computed in the browser).
     3. Create a listing for that dataset.
     4. Switch to a second account, approve HTC, and buy access.
     5. Check whether the current account can access the dataset.

The entire system runs on a **local Hardhat node** and is intended as an easy-to-understand, inspectable prototype.

---

## 2. Smart Contracts

### 2.1 `HealthChainToken` (HTC)

- File: `contracts/HealthChainToken.sol`
- Based on OpenZeppelin’s `ERC20`.
- Key properties:
  - Name: `HealthChain Token`
  - Symbol: `HTC`
  - Decimals: 18
  - Initial supply: `1,000,000 HTC` minted to the **deployer**.

Used as the **medium of exchange** in the marketplace. Any ERC-20 compatible wallet (e.g. MetaMask) can track this token once you add the contract address.

---

### 2.2 `DataRegistry`

- File: `contracts/DataRegistry.sol`
- Purpose: keep track of **health data records** and **who can access them**.

Each record is stored as:

```solidity
struct DataRecord {
    address owner;
    bytes32 dataHash;  // hash of the off-chain data
    string  dataType;  // e.g., "steps", "heart_rate"
    string  uri;       // off-chain location, e.g. IPFS URL or HTTPS
    uint64  createdAt; // block timestamp
}
```

Important details:

- Records live in `mapping(uint256 => DataRecord) public records;`.
- `dataId` starts at **1** and increments by 1 each time `registerData` is called.
- `hasAccess[dataId][user]` is a mapping of who has access to which dataset.

Core functions:

- `registerData(bytes32 hash, string dataType, string uri) returns (uint256 dataId)`
  - Caller becomes the **owner** of the new data record.
  - Emits `DataRegistered`.
- `grantAccess(uint256 dataId, address grantee)`
  - Only **owner** or the configured **marketplace** can call this.
  - Emits `AccessGranted`.
- `revokeAccess(uint256 dataId, address grantee)`
  - Access revocation; emits `AccessRevoked`.
- `canAccess(uint256 dataId, address user) view returns (bool)`
  - `true` if `user` is owner **or** `hasAccess[dataId][user] == true`.
- `setMarketplace(address marketplace)`
  - Sets the **only marketplace** contract allowed to automatically grant access after purchases.

---

### 2.3 `Marketplace`

- File: `contracts/Marketplace.sol`

Represents a minimal listing & purchase market using HTC (ERC-20):

```solidity
struct Listing {
    uint256 id;      // listing ID
    uint256 dataId;  // which record in DataRegistry
    address seller;  // owner of the record
    uint256 price;   // price in HTC (18 decimals)
    bool    active;  // if false, listing is not purchasable
}
```

Key functions:

- `createListing(uint256 dataId, uint256 price) returns (uint256 listingId)`
  - Only the **owner of the `dataId` record** (from `DataRegistry`) can create a listing.
  - Stores the listing and marks it active.
- `buyAccess(uint256 listingId)`
  - Checks that:
    - Listing is active.
    - Buyer has enough HTC and has approved the marketplace for at least `price`.
  - On success:
    - Transfers `price` HTC from buyer → seller.
    - Calls `DataRegistry.grantAccess(dataId, buyer)`.
    - Marks listing as inactive.

---

## 3. Repository Structure

Current layout:

```text
HealthChain/
├── contracts/
│   ├── HealthChainToken.sol         # ERC-20 HTC
│   ├── DataRegistry.sol             # Health data registry & access control
│   └── Marketplace.sol              # Marketplace for data access
├── scripts/
│   ├── deploy.js                    # (legacy / optional)
│   ├── deploy_all.js                # deploy HTC + DataRegistry
│   └── deploy_with_marketplace.js   # deploy HTC + DataRegistry + Marketplace and wire them
├── test/
│   └── HealthChainFlow.js           # end-to-end tests
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx                 # Vite entry point
│       ├── App.jsx                  # React UI for the demo dApp
│       ├── App.css                  # Styling for the demo
│       └── contracts.js             # Contract addresses + ABIs used by the frontend
├── hardhat.config.js                # Hardhat configuration
├── package.json                     # Backend (Hardhat) dependencies & scripts
└── README.md                        # (this file)
```

---

## 4. Prerequisites & Environment Setup

### 4.1 Node.js & npm

You need:

- **Node.js ≥ 18** (project developed with Node 20.x)
- **npm** (comes with Node)

Check versions:

```bash
node -v
npm -v
```

If you use `conda`, that’s fine — Node is independent. You can keep your Python env (`healthchain-env`) for other tooling.

---

### 4.2 Clone & Install Backend Dependencies

```bash
git clone https://github.com/CZA1006/HealthChain.git
cd HealthChain

# (Optional) if you use conda:
# conda activate healthchain-env

npm install
```

This installs Hardhat, Hardhat Toolbox, OpenZeppelin contracts, etc.

---

## 5. Hardhat Backend Usage

All commands below assume **project root**: `HealthChain/`.

### 5.1 Compile Contracts

```bash
npx hardhat compile
```

You should see compilation succeed with no errors.

---

### 5.2 Run Tests

We have a full end-to-end test: `test/HealthChainFlow.js`.

```bash
npx hardhat test
```

You should see something like:

```text
HealthChain end-to-end flow
  ✓ mints all initial HTC to deployer
  ✓ registers health data and lets a buyer purchase access via marketplace

2 passing (...)
```

The test automatically:

1. Deploys `HealthChainToken`, `DataRegistry`, `Marketplace`.
2. Registers a mock `"steps"` dataset.
3. Creates a listing.
4. Transfers HTC to a buyer.
5. Buyer approves & buys access.
6. Checks that `registry.canAccess(1, buyer) == true`.

---

### 5.3 Start a Local Hardhat Node

Terminal **1**:

```bash
cd HealthChain
npx hardhat node
```

Notes:

- Runs a local JSON-RPC node at `http://127.0.0.1:8545/`.
- Prints 20 funded accounts, each with 10,000 test ETH.
- **Leave this terminal running** while interacting via console / frontend.

---

### 5.4 Deploy Contracts to `localhost`

Terminal **2** (keep node running in Terminal 1):

```bash
cd HealthChain
npx hardhat run scripts/deploy_with_marketplace.js --network localhost
```

Expected output (addresses are deterministic on Hardhat `localhost`):

```text
HealthChainToken deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
DataRegistry deployed to:     0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
Marketplace deployed to:      0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
Marketplace set in DataRegistry
```

These are exactly the addresses used in the frontend (`frontend/src/contracts.js`).  
If you ever change the deploy script or network, update that file accordingly.

---

### 5.5 (Optional) Manual Console Demo

If you want to reproduce the flow step-by-step in a Hardhat console:

Terminal **3**:

```bash
cd HealthChain
npx hardhat console --network localhost
```

Basic sequence (simplified):

```js
// 1. Get signers
const [deployer, user1] = await ethers.getSigners();

// 2. Get contract instances at the deployed addresses
const htc = await ethers.getContractAt(
  "HealthChainToken",
  "0x5FbDB2315678afecb367f032d93F642f64180aa3"
);
const registry = await ethers.getContractAt(
  "DataRegistry",
  "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
);
const market = await ethers.getContractAt(
  "Marketplace",
  "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
);

// 3. Register a dataset
const dataHash = ethers.keccak256(
  ethers.toUtf8Bytes("wearable steps data for sale")
);
await (await registry.registerData(dataHash, "steps", "ipfs://steps-demo")).wait();

// 4. Create a listing for dataId 1, price = 100 HTC
const price = ethers.parseUnits("100", 18);
await (await market.createListing(1, price)).wait();

// 5. Give user1 some HTC so they can buy
await (await htc.transfer(user1.address, ethers.parseUnits("500", 18))).wait();

// 6. Buyer approves + buys
const htcUser1 = htc.connect(user1);
const marketUser1 = market.connect(user1);
await (await htcUser1.approve(market.target, price)).wait();
await (await marketUser1.buyAccess(1)).wait();

// 7. Check access
await registry.canAccess(1, user1.address); // true
```

This mirrors what the web dApp does, but with explicit commands.

---

## 6. Web Demo dApp (React + Vite + MetaMask)

The frontend lives in the `frontend/` folder and provides a simple UI for the full flow.

### 6.1 One-Time Frontend Setup

In a **new terminal (Terminal 3 or 4)**:

```bash
cd HealthChain/frontend
npm install
```

This installs React, Vite, `ethers`, and related dependencies for the dApp.

---

### 6.2 Start the Frontend Dev Server

With the Hardhat node and deployed contracts already running:

```bash
cd HealthChain/frontend
npm run dev
```

Vite will print something like:

```text
VITE v7.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/   (or sometimes 5174)
```

Open that URL in your browser.

> We have used `http://localhost:5174/` in testing.  
> Use **whatever URL/port Vite prints** in the terminal.

---

### 6.3 Configure MetaMask (Hardhat Localhost)

1. Open MetaMask.
2. Add a **network**:

   - **Network Name**: `Hardhat Localhost`
   - **New RPC URL**: `http://127.0.0.1:8545/`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`
   - Leave block explorer blank.

3. Click **Save** and select `Hardhat Localhost` as the active network.

4. **Import accounts** from the Hardhat node:
   - When you run `npx hardhat node`, Hardhat prints 20 accounts and their private keys.
   - Import at least two of them into MetaMask:

     - **Seller account** – we usually use **Account #0** (deployer).
     - **Buyer account** – we usually use **Account #1**.

   - In MetaMask:
     - Click your account avatar → **Add account or hardware wallet** → **Import account**.
     - Paste the private key printed by Hardhat for that account.

5. (Optional) **Add the HTC token** so MetaMask shows balances:

   - In MetaMask, still on `Hardhat Localhost`, click **Import tokens**.
   - Token contract address = the `HealthChainToken` address from deployment:
     - `0x5FbDB2315678afecb367f032d93F642f64180aa3`
   - MetaMask should auto-fill symbol `HTC` and 18 decimals.

---

### 6.4 Frontend File: `frontend/src/contracts.js`

This file contains:

- The **contract addresses** for the local Hardhat deployment:

  ```js
  export const HTC_ADDRESS        = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  export const REGISTRY_ADDRESS   = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  export const MARKETPLACE_ADDRESS= "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  ```

- Minimal **ABIs** for `HealthChainToken`, `DataRegistry`, and `Marketplace` (only the functions used by the frontend).

If you ever change the network or modify the deployment script, update the addresses here accordingly.

---

### 6.5 Using the Demo Webpage (Step-by-Step)

Once everything is running:

1. **Open the dApp**

   - Visit `http://localhost:5173/` (or the port Vite printed).
   - You should see the **“HealthChain Demo dApp”** with four main sections:
     1. Connect
     2. Register wearable data
     3. Create listing
     4. Buy access (use Account #1 in MetaMask)

---

#### Step 1 – Connect MetaMask

1. In MetaMask, make sure you are on:
   - Network: `Hardhat Localhost`
   - Account: **Seller** (imported Hardhat Account #0).

2. On the webpage, in section **1. Connect**, click **“Connect MetaMask”**.
3. Approve the connection in the MetaMask popup.

You should now see:

- **Account**: your seller address (e.g. `0xf39F...`).
- **Chain ID**: `31337`.
- **HTC balance**: `1000000.0 HTC` (all initial HTC minted to deployer).

---

#### Step 2 – Register Wearable Data (Seller)

Still using the **seller account**:

1. In section **2. Register wearable data**:

   - **Data content (we hash this)**:  
     Example: `wearable steps data for sale`
   - **Data type**: `steps`
   - **Off-chain URI**: e.g. `ipfs://steps-demo` (placeholder).

2. Click **“Register data”**.
3. MetaMask pops up a **contract interaction**; confirm it.
4. Wait a few seconds for the transaction to be mined.

- The **status area** at the bottom of the page should say something like:

  > `Registered dataId: 1`

- The “Last registered dataId” line in section 2 should also show `1`.

> Note: internally, the contract’s `nextDataId` starts from `1`, so the first record gets `dataId = 1`.

---

#### Step 3 – Create a Listing (Seller)

Still as the **seller**:

1. In section **3. Create listing**:

   - **DataId to list**: `1`  
     (Use the ID you just registered.)
   - **Price (HTC)**: `100`

2. Click **“Create listing”**.
3. Confirm the transaction in MetaMask and wait for it to be mined.

The status text should show something like:

> `Created listing 1 for dataId 1 at price 100 HTC`

At this point, the marketplace has an active listing with:

- `listingId = 1`
- `dataId = 1`
- `price = 100 HTC`

---

#### Step 4 – Give the Buyer Some HTC (Hardhat console)

Right now, **only the seller** (deployer) has HTC. The buyer account in MetaMask needs some HTC to pay for the dataset.

In a Hardhat console (Terminal 3, connected to `localhost`):

```bash
cd HealthChain
npx hardhat console --network localhost
```

In the console:

```js
const [deployer, user1] = await ethers.getSigners();

const htc = await ethers.getContractAt(
  "HealthChainToken",
  "0x5FbDB2315678afecb367f032d93F642f64180aa3"
);

// Transfer 500 HTC from deployer to user1 (the buyer)
await (await htc.transfer(user1.address, ethers.parseUnits("500", 18))).wait();

// Optional: check balances
ethers.formatUnits(await htc.balanceOf(deployer.address), 18);
ethers.formatUnits(await htc.balanceOf(user1.address), 18); // should be 500
```

After this, if you added the HTC token to MetaMask for account #1, you should see a **500 HTC** balance.

> In future we can add a small “faucet” or “airdrop” button in the UI so this step can be done directly from the dApp.

---

#### Step 5 – Buy Access (Buyer, Account #1)

Now switch to the **buyer account** in MetaMask:

1. In MetaMask:
   - Switch account to the imported **Hardhat Account #1**.
   - Stay on network `Hardhat Localhost`.

2. Back on the webpage:
   - Click **“Connect MetaMask”** again in section 1 so the dApp now connects to the buyer.
   - You should see the HTC balance for this account (e.g., `500.0 HTC`).

3. In section **4. Buy access (use Account #1 in MetaMask)**:

   - **DataId to buy**: `1`  
     (This corresponds to `listingId = 1` in the marketplace.)

4. Click **“Approve + Buy”**.

   - First, the dApp calls `htc.approve(marketplace, price)`.
   - Then it calls `marketplace.buyAccess(listingId)`.

5. Approve the transaction(s) in MetaMask.

After confirmation, the status area should show something like:

> `Buyer purchased access to listing 1 (dataId 1)`

To double-check:

- Click **“Check my access”** in section 4.
- It should display:

  > `Can current account access this data? YES ✅`

This calls `DataRegistry.canAccess(dataId, currentAddress)` and confirms that the buyer now has access.

---

### 6.6 Common Frontend Issues / Troubleshooting

- **“Seller cannot buy” error**
  - This happens when you try to call “Approve + Buy” with the **seller account**, because the marketplace prevents the owner from buying their own data.
  - Fix: switch MetaMask to the **buyer account (Account #1)** and reconnect.

- **Transaction reverted without reason (front-end spam of `eth_call` with `<unrecognized-selector>`):**
  - This was caused by an ABI mismatch earlier; the `REGISTRY_ABI.records(...)` output order now matches the actual contract.
  - If you change the Solidity struct, make sure to update `frontend/src/contracts.js`.

- **Insufficient HTC balance**
  - Make sure you performed the **“Give buyer some HTC”** step in the Hardhat console.
  - Use `ethers.formatUnits(await htc.balanceOf(user1.address), 18)` to check.

- **MetaMask not connected to the correct network**
  - Confirm the top-left network in MetaMask is **Hardhat Localhost** with chain ID `31337`.

---

## 7. What We’ve Completed So Far

**Smart contract layer**

- Implemented `HealthChainToken` ERC-20 with 1,000,000 HTC initial supply to deployer.
- Implemented `DataRegistry` with:
  - On-chain data record metadata (hash, type, URI, timestamp).
  - Ownership tracking.
  - Access control (`grantAccess`, `revokeAccess`, `canAccess`).
  - Integration point for one authorized marketplace.
- Implemented `Marketplace` with:
  - Listing creation restricted to data owners.
  - HTC-based pricing and payment.
  - Buyer approval via `HTC.approve`.
  - Atomic purchase flow that grants access and deactivates listing.

**Backend tooling**

- Hardhat project set up with:
  - Robust config.
  - Deployment scripts (`deploy_with_marketplace.js`).
  - End-to-end tests (`test/HealthChainFlow.js`) that validate the complete flow.

**Frontend demo**

- Created a **React + Vite** dApp (`frontend/`) that:
  - Connects to MetaMask on Hardhat Localhost.
  - Reads HTC balance for the connected account.
  - Lets the seller:
    - Register health data (hash computed client-side).
    - Create a listing for a given `dataId` and HTC price.
  - Lets the buyer:
    - Approve HTC spending for the marketplace.
    - Buy access to the listing.
    - Check whether they already have access to a given dataId.

**Developer documentation**

- This README explaining:
  - Concept & architecture.
  - Contract behavior.
  - How to run tests.
  - How to start a local node, deploy contracts, and run the web demo.
  - Step-by-step instructions for the exact actions performed during testing (including MetaMask setup).

---

## 8. Next Steps / Future Work

Some tasks we can work on next:

1. **Richer Frontend UX**
   - Show a list of all registered datasets and listings (via events or view functions).
   - Display current HTC balances and recent activity.
   - Add a simple **“faucet” button** that sends some HTC from deployer to the current account.

2. **Realistic Off-Chain Storage**
   - Integrate IPFS or another decentralized storage backend.
   - Encrypt health data client-side so the contract only ever sees hashes and URIs.
   - Consider how data owners can revoke or rotate off-chain encryption keys.

3. **Permissions & Compliance**
   - Extend `DataRegistry` to support:
     - Time-limited access.
     - Consent logging.
     - Roles (e.g., patient, doctor, insurer).

4. **Advanced Economics**
   - Experiment with different pricing models (e.g., dynamic pricing, subscriptions).
   - Revenue sharing among multiple stakeholders (patient, clinic, app developer).

5. **Security & Testing**
   - Add more unit tests (edge cases, failure paths).
   - Integrate linting & static analysis (Slither, MythX-like tools).
   - Add automated Hardhat scripts to re-deploy and snapshot state for demos.

6. **Deployment to Public Testnets**
   - Deploy the contracts to a public testnet (e.g., Sepolia, Linea, Base testnet).
   - Configure the frontend to switch between `localhost` and testnet via environment variables.

---

## 9. Quick Summary: How to Run the Full Demo

For convenience, here’s the minimal checklist:

1. **Backend**
   1. `cd HealthChain`
   2. `npx hardhat node`  *(Terminal 1 — keep running)*
   3. `npx hardhat run scripts/deploy_with_marketplace.js --network localhost`  *(Terminal 2)*

2. **MetaMask**
   1. Add network:
      - RPC: `http://127.0.0.1:8545/`
      - Chain ID: `31337`
   2. Import Hardhat Account #0 (seller) & Account #1 (buyer) using their private keys from the node logs.
   3. Add custom token `HTC` with contract address  
      `0x5FbDB2315678afecb367f032d93F642f64180aa3`.

3. **Frontend**
   1. `cd HealthChain/frontend`
   2. `npm install`  *(first time only)*
   3. `npm run dev`
   4. Open the printed URL (e.g. `http://localhost:5173/`).

4. **Demo Flow**
   1. In MetaMask, select **seller (Account #0)** → connect in Step 1.
   2. In Step 2, register data (content + type + URI).
   3. In Step 3, create listing for `dataId = 1`, price = `100 HTC`.
   4. In Hardhat console, transfer e.g. `500 HTC` from seller → buyer.
   5. Switch MetaMask to **buyer (Account #1)**, reconnect in Step 1.
   6. In Step 4:
      - Enter `dataId = 1`.
      - Click **Approve + Buy**.
      - Confirm transactions.
   7. Click **Check my access** → should show `YES ✅`.

That’s the current end-to-end story of HealthChain.
