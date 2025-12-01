# HealthChain: A Tokenized, Decentralized Marketplace for Wearable Health Data

> **Course project – MSBD5017 (RWA group 10)**  
> HealthChain is a comprehensive blockchain-based platform that demonstrates how **wearable health data**  
> (e.g., from Apple Watch / Fitbit) can be:
> - **Registered on-chain** as a verifiable asset with detailed health metrics (steps, heart rate, sleep, calories, distance, active minutes)
> - **Tokenized and priced** using an ERC-20 utility token (HTC - HealthChain Token)
> - **Traded via a decentralized marketplace** with access control and automated payment processing
> - **Rewarded through Move-to-Earn** mechanism that incentivizes healthy activities (10 HTC per 1000 steps)
> - **Exchanged through Token Swap** system for easy ETH to HTC conversion
> - **Managed through a full-stack web application** with user authentication, data persistence, and real-time updates

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (developed with Node 20.x)
- **npm** (comes with Node.js)
- **MetaMask** browser extension ([Install here](https://metamask.io/))
- **Git** for cloning the repository

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/CZA1006/HealthChain.git
cd HealthChain

# Run the automated setup script
chmod +x start-dev.sh
./start-dev.sh
```

The `start-dev.sh` script automatically:
1. ✅ Installs all dependencies (root, backend, frontend)
2. ✅ Starts the Hardhat blockchain node (port 8545)
3. ✅ Deploys all 5 smart contracts
4. ✅ Launches the backend API server (port 3001)
5. ✅ Starts the frontend development server (port 5173)
6. ✅ Displays all contract addresses and access URLs

### Option 2: Manual Setup

```bash
# 1. Install all dependencies
npm run install-all

# 2. Start all services concurrently
npm run dev
```

Or start services individually in separate terminals:

```bash
# Terminal 1: Start Hardhat node
npx hardhat node

# Terminal 2: Deploy contracts
npx hardhat run scripts/deploy_with_marketplace.js --network localhost

# Terminal 3: Start backend API
cd backend && npm run dev

# Terminal 4: Start frontend
cd frontend && npm run dev
```

### Technology Stack

The platform runs fully locally using:

- **Blockchain**: Hardhat (Solidity 0.8.20, local Ethereum node on port 8545)
- **Smart Contracts**: 5 interconnected contracts (HTC, DataRegistry, Marketplace, MoveToEarn, TokenSwap)
- **Frontend**: React 18 + Vite + ethers.js v6 (port 5173)
- **Backend**: Node.js + Express + SQLite (port 3001)
- **Wallet**: MetaMask (connected to Hardhat localhost network, Chain ID: 31337)

### Access Points

After successful setup:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Blockchain RPC**: http://127.0.0.1:8545
- **Chain ID**: 31337 (Hardhat localhost)

---

## 1. High-Level Architecture

HealthChain is a comprehensive blockchain-based health data platform consisting of **five interconnected smart contracts**, a **React-based web application**, and **Node.js backend services** with SQLite database:

### Smart Contracts (Solidity 0.8.20)

1. **HealthChainToken (HTC)** - `contracts/HealthChainToken.sol`
   - Standard ERC-20 token with 18 decimals
   - Initial supply: **1,000,000 HTC** minted to deployer
   - Used as the universal currency for:
     - Marketplace transactions (buying data access)
     - Move-to-Earn rewards (incentivizing healthy activities)
     - Token swap operations (ETH ↔ HTC exchange)

2. **DataRegistry** - `contracts/DataRegistry.sol`
   - On-chain registry of health data records with comprehensive metrics
   - **Health Metrics Structure**:
     - Steps count
     - Heart rate (bpm)
     - Sleep duration (minutes)
     - Calories burned
     - Distance traveled
     - Active minutes
     - Metric type ("daily", "weekly", "monthly")
   - **Features**:
     - Unique `dataAddr` generation for each record
     - Ownership tracking and access control
     - Support for both simple hash-based records and detailed metrics
     - Marketplace integration for automated access granting
     - Access permission management (grant/revoke)

3. **Marketplace** - `contracts/Marketplace.sol`
   - Decentralized marketplace for health data access rights
   - **Core Functions**:
     - Create listings with HTC pricing
     - Purchase access using HTC tokens
     - Automatic access granting upon successful purchase
     - Listing activation/deactivation
     - Batch retrieval of active listings
   - **Security**: Only data owners can create listings, buyers cannot purchase their own data

4. **MoveToEarn** - `contracts/MoveToEarn.sol`
   - Gamified reward system incentivizing healthy activities
   - **Reward Mechanism**:
     - **Rate**: 10 HTC per 1,000 steps
     - **Minimum**: 3,000 steps required to claim
     - **Maximum**: 20,000 steps cap per claim
     - **Cooldown**: 24 hours between claims
   - **Features**:
     - Only "daily" metric type eligible for rewards
     - Tracks total steps, rewards, and claim history per user
     - Prevents double-claiming for same data record
     - Owner-funded reward pool

5. **TokenSwap** - `contracts/TokenSwap.sol`
   - ETH to HTC token exchange service
   - **Features**:
     - Configurable exchange rate (HTC per ETH)
     - Minimum and maximum purchase limits
     - Real-time balance checking
     - Statistics tracking (total ETH collected, HTC sold)
     - Owner-controlled liquidity management
     - ReentrancyGuard protection
   - **Helper Functions**:
     - Calculate HTC amount for given ETH
     - Calculate ETH needed for desired HTC amount

### Frontend Application (`frontend/` – React 18 + Vite)

Modern, responsive single-page application with:

**Core Features**:
- **User Authentication**: 
  - Login/Register with username/email and password
  - Wallet-based authentication (MetaMask)
  - JWT token-based session management
  - Automatic session persistence and restoration

- **Health Data Management**:
  - Register health data with detailed metrics
  - View personal health data history
  - Data integrity verification
  - Health data simulator for testing

- **Marketplace Interface**:
  - Browse available health data listings
  - Create listings with custom HTC pricing
  - Purchase data access with HTC tokens
  - View owned and purchased data

- **Move-to-Earn Dashboard**:
  - Claim rewards for daily step counts
  - View reward statistics and history
  - Cooldown timer display
  - Real-time eligibility checking

- **Token Swap Interface**:
  - Exchange ETH for HTC tokens
  - Real-time exchange rate calculation
  - Balance checking and transaction status

- **Technical Stack**:
  - React 18 with hooks
  - Vite for fast development and building
  - ethers.js v6 for blockchain interaction
  - Custom UI components (Button, Card, Input, Badge, Toast, LoadingSpinner)
  - Responsive design with modern CSS

### Backend Services (`backend/` – Node.js + Express + SQLite)

**RESTful API Server** (Port 3001):

- **Authentication Endpoints**:
  - `POST /api/auth/register` - User registration
  - `POST /api/auth/login` - User login (username/email/wallet)
  - `POST /api/auth/logout` - User logout
  - `GET /api/user` - Get current user info

- **User Preferences**:
  - `PUT /api/user/preferences` - Update preferences
  - `GET /api/user/preferences` - Get preferences

- **Health Data Management**:
  - `POST /api/health-data/store` - Store health data offline
  - `GET /api/health-data/:dataHash` - Retrieve by DataHash
  - `GET /api/health-data` - List user's health data (paginated)
  - `POST /api/health-data/verify` - Verify data integrity
  - `DELETE /api/health-data/:dataHash` - Delete health data

- **Database Schema** (SQLite):
  - `users` - User accounts with bcrypt password hashing
  - `sessions` - JWT session management
  - `user_preferences` - User settings (JSON format)
  - `health_data` - Offline health data storage with DataHash indexing

- **Security Features**:
  - JWT authentication middleware
  - bcrypt password hashing
  - SQL injection prevention
  - CORS configuration
  - Automatic localStorage fallback for offline operation

**Architecture Benefits**:
- **Hybrid Storage**: On-chain DataHash + off-chain actual data
- **Data Privacy**: Sensitive health data stored offline, only hashes on-chain
- **Cost Efficiency**: Reduces blockchain storage costs
- **Performance**: Fast data retrieval from SQLite
- **Scalability**: Easy to migrate to PostgreSQL/MySQL for production

The entire system runs on a **local Hardhat node** (Chain ID: 31337) and provides a complete, production-ready prototype for blockchain-based health data management.

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
- Purpose: On-chain registry for **health data records** with detailed metrics and **access control**.

**Data Structures**:

```solidity
struct HealthMetrics {
    uint256 steps;
    uint256 heartRate;        // beats per minute
    uint256 sleepMinutes;
    uint256 calories;
    uint256 distance;         // in meters
    uint256 activeMinutes;
    string metricType;        // "daily", "weekly", "monthly"
}

struct DataRecord {
    address provider;         // data owner
    bytes32 dataHash;        // hash of off-chain data
    string dataType;         // e.g., "steps", "heart_rate", "sleep"
    string uri;              // off-chain location (IPFS/HTTPS)
    uint64 createdAt;        // block timestamp
    HealthMetrics metrics;   // detailed health metrics
    bool hasMetrics;         // whether metrics are included
}
```

**Key Features**:

- Records stored in `mapping(uint256 => DataRecord) public records;`
- Unique `dataAddr` generation using `keccak256(provider, dataHash, timestamp)`
- Access control via `mapping(uint256 => mapping(address => bool)) public hasAccess;`
- Supports both simple hash-based records and detailed health metrics

**Core Functions**:

- `registerData(bytes32 hash, string dataType, string uri) returns (uint256 dataAddr)`
  - Basic registration without metrics
  - Generates unique dataAddr
  - Caller becomes the owner
  - Emits `DataRegistered`

- `registerDataWithMetrics(bytes32 hash, string dataType, string uri, HealthMetrics metrics) returns (uint256 dataAddr)`
  - Registration with detailed health metrics
  - Required for Move-to-Earn eligibility
  - Emits `DataRegisteredWithMetrics`

- `grantAccess(uint256 dataAddr, address grantee)`
  - Only **owner** or **marketplace** can call
  - Grants data access to specified address
  - Emits `AccessGranted`

- `revokeAccess(uint256 dataAddr, address grantee)`
  - Only owner can revoke access
  - Emits `AccessRevoked`

- `canAccess(uint256 dataAddr, address user) view returns (bool)`
  - Returns `true` if user is owner OR has been granted access

- `getHealthMetrics(uint256 dataAddr) view returns (HealthMetrics, bool)`
  - Retrieves detailed health metrics for a record
  - Used by MoveToEarn contract for reward calculation

- `setMarketplace(address marketplace)`
  - Owner-only function
  - Sets the authorized marketplace contract

---

### 2.3 `Marketplace`

- File: `contracts/Marketplace.sol`
- Purpose: Decentralized marketplace for trading health data access rights using HTC tokens.

**Data Structure**:

```solidity
struct Listing {
    uint256 id;          // unique listing ID
    uint256 dataAddr;    // DataRegistry record address
    address seller;      // data owner
    uint256 price;       // price in HTC (18 decimals)
    bool active;         // listing status
    uint256 createdAt;   // creation timestamp
}
```

**Core Functions**:

- `createListing(uint256 dataAddr, uint256 price) returns (uint256 listingId)`
  - **Requirements**:
    - Caller must be the data owner (verified via DataRegistry)
    - Price must be greater than 0
  - Creates active listing with auto-incremented ID
  - Emits `ListingCreated`

- `buyAccess(uint256 listingId)`
  - **Requirements**:
    - Listing must be active
    - Buyer cannot be the seller
    - Buyer must have sufficient HTC balance
    - Buyer must have approved marketplace for the price amount
  - **Actions**:
    - Transfers HTC from buyer to seller
    - Grants data access via DataRegistry
    - Deactivates listing
  - Emits `AccessPurchased`

- `deactivateListing(uint256 listingId)`
  - Only seller can deactivate their own listing
  - Emits `ListingDeactivated`

- `getListingsByDataAddr(uint256 dataAddr) view returns (Listing[])`
  - Returns all listings for a specific data record

- `getAllActiveListings() view returns (Listing[])`
  - Returns all currently active listings
  - Useful for marketplace browsing

- `getHealthDataPreview(uint256 listingId) view returns (HealthMetrics, bool)`
  - Allows buyers to preview health metrics before purchase
  - Returns metrics and whether they exist

### 2.4 `MoveToEarn`

- File: `contracts/MoveToEarn.sol`
- Purpose: Gamified reward system that incentivizes healthy activities by rewarding users with HTC tokens.

**Reward Configuration**:
```solidity
STEPS_PER_REWARD = 1000        // 1000 steps = 10 HTC
REWARD_PER_THOUSAND = 10e18    // 10 HTC (18 decimals)
MIN_STEPS = 3000               // Minimum 3000 steps to claim
MAX_STEPS = 20000              // Maximum 20000 steps cap
DAILY_COOLDOWN = 24 hours      // One claim per day
```

**Data Structure**:
```solidity
struct UserReward {
    uint256 totalSteps;      // Cumulative steps across all claims
    uint256 totalRewards;    // Total HTC earned
    uint256 lastClaimTime;   // Timestamp of last claim
    uint256 claimCount;      // Number of successful claims
}
```

**Core Functions**:

- `claimReward(uint256 dataAddr)`
  - **Requirements**:
    - Caller must be the data owner
    - Data must have health metrics
    - Metric type must be "daily"
    - Steps must be ≥ 3,000
    - 24-hour cooldown must have passed
    - Cannot claim same dataAddr twice
  - **Reward Calculation**: `(steps / 1000) * 10 HTC` (capped at 20,000 steps)
  - **Actions**:
    - Updates user statistics
    - Transfers HTC reward to user
    - Marks dataAddr as claimed
  - Emits `RewardClaimed`

- `calculateReward(uint256 steps) pure returns (uint256)`
  - Calculates HTC reward for given step count
  - Formula: `(steps / 1000) * 10 HTC`

- `canClaimReward(address user) view returns (bool, string)`
  - Checks if user can claim reward
  - Returns eligibility status and reason

- `getUserStats(address user) view returns (totalSteps, totalRewards, lastClaimTime, claimCount, nextClaimTime)`
  - Retrieves comprehensive user statistics

- `fundContract(uint256 amount)` (Owner only)
  - Funds the contract with HTC for reward distribution

- `withdrawTokens(uint256 amount)` (Owner only)
  - Withdraws remaining HTC tokens

- `getContractBalance() view returns (uint256)`
  - Returns current HTC balance available for rewards

**Example Reward Calculation**:
- 5,000 steps → 50 HTC
- 10,000 steps → 100 HTC
- 15,000 steps → 150 HTC
- 25,000 steps → 200 HTC (capped at 20,000)

---

### 2.5 `TokenSwap`

- File: `contracts/TokenSwap.sol`
- Purpose: Enables users to exchange ETH for HTC tokens at a configurable rate.

**Configuration**:
```solidity
exchangeRate    // HTC per ETH (with 18 decimals)
minPurchase     // Minimum ETH amount per transaction
maxPurchase     // Maximum ETH amount per transaction
```

**Core Functions**:

- `buyTokens() payable`
  - **Requirements**:
    - ETH sent must be ≥ minPurchase
    - ETH sent must be ≤ maxPurchase
    - Contract must have sufficient HTC balance
  - **Actions**:
    - Calculates HTC amount: `(msg.value * exchangeRate) / 1 ether`
    - Transfers HTC to buyer
    - Updates statistics
  - Emits `TokensPurchased`
  - Protected by ReentrancyGuard

- `calculateHtcAmount(uint256 ethAmount) view returns (uint256)`
  - Calculates HTC tokens for given ETH amount
  - Useful for UI preview

- `calculateEthAmount(uint256 htcAmount) view returns (uint256)`
  - Calculates ETH needed for desired HTC amount
  - Useful for reverse calculation

- `getStats() view returns (contractHtcBalance, contractEthBalance, currentRate, totalEth, totalHtc, minBuy, maxBuy)`
  - Returns comprehensive contract statistics
  - Used for dashboard display

**Owner Functions**:

- `setExchangeRate(uint256 newRate)`
  - Updates the exchange rate
  - Emits `ExchangeRateUpdated`

- `setLimits(uint256 _minPurchase, uint256 _maxPurchase)`
  - Updates purchase limits
  - Emits `LimitsUpdated`

- `withdrawEth(address payable to, uint256 amount)`
  - Withdraws collected ETH
  - Protected by ReentrancyGuard
  - Emits `EthWithdrawn`

- `withdrawTokens(address to, uint256 amount)`
  - Withdraws HTC tokens (for rebalancing)
  - Emits `TokensWithdrawn`

**Example Exchange**:
- If exchange rate = 1000 HTC per ETH
- Sending 0.1 ETH → Receive 100 HTC
- Sending 1 ETH → Receive 1000 HTC

---

## 3. Repository Structure

```text
HealthChain/
├── contracts/                       # Smart contracts
│   ├── HealthChainToken.sol         # ERC-20 HTC token
│   ├── DataRegistry.sol             # Health data registry with metrics
│   ├── Marketplace.sol              # Data access marketplace
│   ├── MoveToEarn.sol               # Reward system for activities
│   └── TokenSwap.sol                # ETH to HTC exchange
├── backend/                         # Backend API service
│   ├── server.js                    # Express API server
│   ├── healthchain.db               # SQLite database
│   └── package.json                 # Backend dependencies
├── frontend/                        # React web application
│   ├── src/
│   │   ├── main.jsx                 # Application entry point
│   │   ├── App.jsx                  # Main application component
│   │   ├── components/              # Reusable UI components
│   │   │   ├── HealthDataForm.jsx   # Health data input form
│   │   │   ├── HealthDataCard.jsx   # Health data display card
│   │   │   ├── MoveToEarnCard.jsx   # Reward claiming interface
│   │   │   ├── Button.jsx           # Custom button component
│   │   │   ├── Card.jsx             # Card container component
│   │   │   ├── Input.jsx            # Form input component
│   │   │   ├── Badge.jsx            # Status badge component
│   │   │   ├── Toast.jsx            # Notification component
│   │   │   └── LoadingSpinner.jsx   # Loading indicator
│   │   ├── pages/
│   │   │   └── LoginPage.jsx        # Authentication page
│   │   ├── utils/
│   │   │   ├── api.js               # Backend API client
│   │   │   ├── crypto.js            # Encryption utilities
│   │   │   └── healthDataSimulator.js # Mock data generator
│   │   ├── contracts/               # Contract ABIs and addresses
│   │   │   ├── addresses.js         # Deployed contract addresses
│   │   │   ├── DataRegistry.json    # DataRegistry ABI
│   │   │   ├── HealthChainToken.json # HTC token ABI
│   │   │   ├── Marketplace.json     # Marketplace ABI
│   │   │   ├── MoveToEarn.json      # MoveToEarn ABI
│   │   │   └── TokenSwap.json       # TokenSwap ABI
│   │   └── styles/
│   │       └── theme.css            # Global theme variables
│   ├── index.html                   # HTML entry point
│   ├── vite.config.js               # Vite configuration
│   └── package.json                 # Frontend dependencies
├── scripts/                         # Deployment scripts
│   ├── deploy.js                    # Basic deployment
│   ├── deploy_all.js                # Deploy core contracts
│   └── deploy_with_marketplace.js   # Full deployment with wiring
├── test/                            # Test suites
│   └── HealthChainFlow.js           # End-to-end integration tests
├── examples/                        # Usage examples
│   └── health-data-integration.js   # Integration example
├── docs/                            # Documentation
│   └── health-data-storage-optimization.md
├── logs/                            # Application logs
│   ├── backend.log
│   ├── frontend.log
│   ├── hardhat.log
│   └── deploy.log
├── start-dev.sh                     # Development startup script
├── hardhat.config.js                # Hardhat configuration
├── package.json                     # Root dependencies & scripts
└── README.md                        # This file
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

## 5. Backend Services Setup

### 5.1 SQLite Backend API Setup

First, install and start the backend service:

```bash
# Install backend dependencies
cd backend
npm install

# Start the backend service (runs on port 3001)
npm run dev
```

Or use the convenience script from the project root:

```bash
# Install all dependencies (backend + frontend + blockchain)
npm run install-all

# Start both backend and frontend simultaneously
npm run dev
```

### 5.2 Hardhat Backend Usage

All commands below assume **project root**: `HealthChain/`.

### 5.3 Compile Contracts

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
Deploying HealthChain contracts...

HealthChainToken deployed to:  0x5FbDB2315678afecb367f032d93F642f64180aa3
DataRegistry deployed to:      0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
Marketplace deployed to:       0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
MoveToEarn deployed to:        0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
TokenSwap deployed to:         0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9

Marketplace set in DataRegistry ✓
MoveToEarn funded with 100,000 HTC ✓
TokenSwap funded with 500,000 HTC ✓

Deployment complete!
```

**Important Notes**:
- These addresses are **deterministic** on Hardhat localhost (same every time you restart the node)
- The frontend uses these addresses in `frontend/src/contracts/addresses.js`
- If you modify the deployment script or network, update the addresses file accordingly
- The deployer account (Account #0) receives 1,000,000 HTC initially
- MoveToEarn contract is pre-funded with 100,000 HTC for rewards
- TokenSwap contract is pre-funded with 500,000 HTC for exchanges

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

## 7. Completed Features & Capabilities

### 7.1 Smart Contract Layer (Solidity 0.8.20)

**✅ HealthChainToken (HTC)**
- ERC-20 standard implementation with 18 decimals
- Initial supply: 1,000,000 HTC minted to deployer
- Full OpenZeppelin compatibility
- Used across all platform features

**✅ DataRegistry**
- Comprehensive health data record management
- Detailed health metrics support (6 metrics + type classification)
- Unique dataAddr generation using keccak256
- Granular access control (grant/revoke)
- Marketplace integration for automated access granting
- Support for both simple and detailed health data records
- Event emission for all state changes

**✅ Marketplace**
- Decentralized listing and purchase system
- HTC-based pricing mechanism
- Atomic purchase transactions
- Automatic access granting via DataRegistry
- Listing management (create, deactivate)
- Batch listing retrieval
- Health data preview for buyers
- Seller protection (cannot buy own data)

**✅ MoveToEarn**
- Gamified reward system for healthy activities
- Configurable reward rates (10 HTC per 1000 steps)
- Step validation (min 3000, max 20000)
- 24-hour cooldown mechanism
- Comprehensive user statistics tracking
- Double-claim prevention
- Owner-funded reward pool
- Real-time eligibility checking

**✅ TokenSwap**
- ETH to HTC exchange functionality
- Configurable exchange rates
- Purchase limits (min/max)
- Statistics tracking (total ETH/HTC)
- ReentrancyGuard protection
- Owner liquidity management
- Helper calculation functions

### 7.2 Backend Services (Node.js + Express + SQLite)

**✅ RESTful API**
- Complete CRUD operations for users and health data
- JWT-based authentication
- Session management
- User preferences storage
- Health data offline storage
- Data integrity verification
- Pagination support

**✅ Database Schema**
- Users table with bcrypt password hashing
- Sessions table for JWT management
- User preferences (JSON format)
- Health data storage with DataHash indexing
- Proper foreign key relationships

**✅ Security Features**
- JWT authentication middleware
- bcrypt password hashing (10 rounds)
- SQL injection prevention
- CORS configuration
- Input validation
- Error handling

**✅ Hybrid Storage Architecture**
- On-chain: DataHash, ownership, access control
- Off-chain: Actual health data in SQLite
- Automatic localStorage fallback
- Data integrity verification via hash comparison

### 7.3 Frontend Application (React 18 + Vite)

**✅ User Interface**
- Modern, responsive design
- Custom component library (Button, Card, Input, Badge, Toast, LoadingSpinner)
- Real-time balance updates
- Transaction status notifications
- Loading states and error handling
- Intuitive navigation

**✅ Authentication System**
- User registration with validation
- Login with username/email/password
- Wallet-based authentication (MetaMask)
- Automatic session restoration
- Secure logout

**✅ Health Data Management**
- Comprehensive data registration form
- Health metrics input (6 different metrics)
- Data history viewing
- Health data simulator for testing
- Data integrity verification

**✅ Marketplace Interface**
- Browse active listings
- Create listings with custom pricing
- Purchase data access
- View owned and purchased data
- Health data preview
- Transaction confirmation

**✅ Move-to-Earn Dashboard**
- Reward claiming interface
- User statistics display
- Cooldown timer
- Eligibility checking
- Reward calculation preview

**✅ Token Swap Interface**
- ETH to HTC exchange
- Real-time rate calculation
- Balance checking
- Transaction status tracking

**✅ MetaMask Integration**
- Seamless wallet connection
- Network detection (Chain ID 31337)
- Account switching support
- Transaction signing
- Balance tracking
- Custom token addition

### 7.4 Development Tools & Infrastructure

**✅ Hardhat Configuration**
- Solidity 0.8.20 compiler
- Hardhat Toolbox integration
- Local network configuration
- Deployment scripts
- Testing framework

**✅ Deployment Scripts**
- Automated contract deployment
- Contract address management
- Initial funding (MoveToEarn, TokenSwap)
- Marketplace wiring to DataRegistry
- Deployment logging

**✅ Testing**
- End-to-end integration tests
- Contract interaction tests
- Flow validation tests

**✅ Documentation**
- Comprehensive README
- Code comments (English)
- API documentation
- Setup instructions
- Troubleshooting guide

**✅ Development Scripts**
- `npm run dev` - Start all services
- `npm run install-all` - Install all dependencies
- `./start-dev.sh` - Automated setup script
- Individual service scripts

### 7.5 Key Achievements

- **Complete Token Economy**: HTC token used across all features  
- **Hybrid Storage**: On-chain + off-chain data management  
- **Comprehensive Health Metrics**: 6 different health data points  
- **Gamification**: Move-to-Earn reward system  
- **Decentralized Marketplace**: P2P health data trading  
- **User Authentication**: Multiple authentication methods  
- **Data Privacy**: Hash-based on-chain storage  
- **Security**: ReentrancyGuard, access control, JWT auth  
- **Scalability**: Modular architecture, easy to extend  
- **User Experience**: Intuitive UI, real-time updates  
- **Developer Experience**: Automated setup, comprehensive docs
---

## 8. Technical Highlights & Innovations

### 8.1 Hybrid Storage Architecture
- **On-chain**: DataHash, ownership, access control, health metrics
- **Off-chain**: Actual detailed health data in SQLite
- **Benefits**: Cost-efficient, privacy-preserving, scalable

### 8.2 Comprehensive Health Metrics
- Support for 6 different health metrics (steps, heart rate, sleep, calories, distance, active minutes)
- Metric type classification (daily, weekly, monthly)
- Enables sophisticated reward mechanisms and data analysis

### 8.3 Integrated Token Economy
- **HTC Token**: Universal currency across all platform features
- **Multiple Use Cases**: Marketplace payments, Move-to-Earn rewards, Token Swap
- **Circular Economy**: Users earn HTC through activities, spend on data access

### 8.4 Security Features
- ReentrancyGuard on critical functions
- Access control with Ownable pattern
- JWT authentication for backend API
- bcrypt password hashing
- Approval-based token transfers

### 8.5 User Experience
- Automatic session management
- Real-time balance updates
- Transaction status notifications
- Responsive UI with loading states
- MetaMask integration for seamless wallet interaction

---

## 9. Future Enhancements

### 9.1 Advanced Features
- **Time-Limited Access**: Subscription-based data access with expiration
- **Data Encryption**: Client-side encryption for enhanced privacy
- **IPFS Integration**: Decentralized storage for health data
- **Multi-Signature Access**: Require multiple approvals for sensitive data
- **Data Aggregation**: Anonymous aggregated health statistics

### 9.2 Enhanced Economics
- **Dynamic Pricing**: Market-driven pricing based on demand
- **Staking Mechanism**: Stake HTC for premium features
- **Revenue Sharing**: Multi-party revenue distribution
- **Loyalty Rewards**: Bonus rewards for consistent activity

### 9.3 Compliance & Governance
- **HIPAA Compliance**: Healthcare data privacy standards
- **Consent Management**: Granular consent tracking
- **Audit Trails**: Comprehensive access logging
- **DAO Governance**: Community-driven platform decisions

### 9.4 Scalability
- **Layer 2 Integration**: Deploy on Polygon, Arbitrum, or Optimism
- **Cross-Chain Bridge**: Multi-chain HTC token support
- **Database Migration**: PostgreSQL for production scale
- **Caching Layer**: Redis for improved performance

### 9.5 Testing & Security
- **Comprehensive Test Suite**: Unit, integration, and E2E tests
- **Security Audits**: Professional smart contract audits
- **Fuzzing**: Automated vulnerability testing
- **Bug Bounty Program**: Community-driven security

### 9.6 Deployment
- **Public Testnet**: Deploy to Sepolia, Goerli, or Mumbai
- **Mainnet Launch**: Production deployment strategy
- **CI/CD Pipeline**: Automated testing and deployment
- **Monitoring**: Real-time system health monitoring
---

## 10. Complete Demo Walkthrough

### 10.1 Initial Setup

**Option 1: Automated (Recommended)**
```bash
./start-dev.sh
```

**Option 2: Manual**
```bash
# Terminal 1: Backend API
cd backend && npm run dev

# Terminal 2: Blockchain
npx hardhat node

# Terminal 3: Deploy contracts
npx hardhat run scripts/deploy_with_marketplace.js --network localhost

# Terminal 4: Frontend
cd frontend && npm run dev
```

### 10.2 MetaMask Configuration

1. **Add Hardhat Localhost Network**:
   - Network Name: `Hardhat Localhost`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

2. **Import Test Accounts**:
   - When you run `npx hardhat node`, it displays 20 accounts with private keys
   - Import at least 2 accounts:
     - **Account #0** (Deployer/Seller) - Has 1M HTC initially
     - **Account #1** (Buyer) - Needs HTC for purchases

3. **Add HTC Token to MetaMask**:
   - Click "Import tokens"
   - Token Address: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
   - Symbol: `HTC`
   - Decimals: `18`

### 10.3 Feature Demonstrations

#### A. User Authentication & Registration

1. Open `http://localhost:5173`
2. Click "Register" tab
3. Fill in:
   - Username: `alice`
   - Email: `alice@example.com`
   - Password: `password123`
4. Click "Register"
5. Login with credentials or connect MetaMask wallet

#### B. Health Data Registration

1. Connect MetaMask (Account #0)
2. Navigate to "Health Data" section
3. Fill in health metrics:
   - Steps: `10000`
   - Heart Rate: `75`
   - Sleep: `480` (8 hours in minutes)
   - Calories: `2500`
   - Distance: `8000` (meters)
   - Active Minutes: `60`
   - Metric Type: `daily`
4. Click "Register Data"
5. Confirm transaction in MetaMask
6. Note the `dataAddr` returned

#### C. Marketplace - Create Listing

1. Still as Account #0 (data owner)
2. Navigate to "Marketplace" section
3. Click "Create Listing"
4. Enter:
   - Data Address: `<your dataAddr from step B>`
   - Price: `100` HTC
5. Click "Create Listing"
6. Confirm transaction
7. Listing is now active and visible

#### D. Token Swap - Get HTC

1. Switch to Account #1 in MetaMask
2. Navigate to "Token Swap" section
3. Enter ETH amount: `0.1` ETH
4. View calculated HTC amount
5. Click "Buy HTC"
6. Confirm transaction
7. Check HTC balance in MetaMask

#### E. Marketplace - Purchase Data Access

1. Still as Account #1 (buyer)
2. Navigate to "Marketplace"
3. Browse active listings
4. Click on the listing created in step C
5. Click "Purchase Access"
6. Approve HTC spending (if not already approved)
7. Confirm purchase transaction
8. Access is granted automatically
9. Verify access in "My Data" section

#### F. Move-to-Earn - Claim Rewards

1. Switch back to Account #0
2. Ensure you have registered health data with:
   - Metric type: `daily`
   - Steps: ≥ 3000
3. Navigate to "Move-to-Earn" section
4. Click "Claim Reward"
5. Enter your `dataAddr`
6. Confirm transaction
7. Receive HTC reward (10 HTC per 1000 steps, max 200 HTC)
8. View updated statistics:
   - Total steps
   - Total rewards earned
   - Next claim time (24 hours later)

### 10.4 Testing Different Scenarios

**Scenario 1: Maximum Reward**
- Register data with 25,000 steps
- Claim reward → Receive 200 HTC (capped at 20,000 steps)

**Scenario 2: Minimum Requirement**
- Register data with 3,000 steps
- Claim reward → Receive 30 HTC

**Scenario 3: Below Minimum**
- Register data with 2,500 steps
- Attempt to claim → Transaction reverts with "Steps below minimum"

**Scenario 4: Cooldown Period**
- Claim reward successfully
- Try to claim again immediately → Transaction reverts with "Cooldown not finished"
- Wait 24 hours → Can claim again

**Scenario 5: Multiple Listings**
- Create multiple listings for different data records
- Browse all active listings
- Purchase multiple access rights
- View all owned and purchased data

### 10.5 Backend API Testing

Test the backend API directly using curl or Postman:

```bash
# Health check
curl http://localhost:3001/api/health

# Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"bob","email":"bob@example.com","password":"pass123"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"bob","password":"pass123"}'

# Store health data (requires JWT token)
curl -X POST http://localhost:3001/api/health-data/store \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{"dataType":"steps","actualData":{"steps":10000},"metadata":{}}'
```

### 10.6 Troubleshooting

**Issue**: "Insufficient HTC balance"
- **Solution**: Use Token Swap to get HTC, or transfer from Account #0

**Issue**: "Cooldown not finished"
- **Solution**: Wait 24 hours or use a different account

**Issue**: "Not data owner"
- **Solution**: Ensure you're using the account that registered the data

**Issue**: "Already claimed"
- **Solution**: Each dataAddr can only be claimed once

**Issue**: "MetaMask transaction failed"
- **Solution**: Check gas limits, ensure correct network (Chain ID 31337)

**Issue**: "Backend not available"
- **Solution**: Check if backend server is running on port 3001

That's the complete end-to-end demonstration of HealthChain's features!

---

## 11. Project Value Proposition

### 11.1 For Users
- **Data Ownership**: Full control over personal health data
- **Monetization**: Earn HTC by selling data access or staying active
- **Privacy**: Data stored off-chain, only hashes on blockchain
- **Transparency**: All transactions visible and verifiable
- **Incentives**: Rewarded for healthy activities (Move-to-Earn)
- **Easy Access**: Simple web interface, no technical knowledge required

### 11.2 For Data Buyers (Researchers, Healthcare Providers)
- **Verified Data**: Blockchain-verified data authenticity
- **Direct Access**: P2P marketplace, no intermediaries
- **Granular Control**: Purchase only needed data
- **Transparent Pricing**: Clear HTC-based pricing
- **Compliance**: Built-in access control and consent tracking

### 11.3 For Developers
- **Open Source**: Full codebase available for learning and extension
- **Modular Design**: Easy to add new features or modify existing ones
- **Well Documented**: Comprehensive README and code comments
- **Modern Stack**: React, Solidity, Node.js - industry-standard technologies
- **Testing Framework**: Built-in testing infrastructure

---

## 12. Technical Specifications

### Smart Contracts
- **Language**: Solidity 0.8.20
- **Framework**: Hardhat 2.27.0
- **Libraries**: OpenZeppelin Contracts 5.4.0
- **Network**: Hardhat Localhost (Chain ID: 31337)
- **Gas Optimization**: Efficient data structures, minimal storage

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Blockchain Library**: ethers.js 6.15.0
- **Styling**: Custom CSS with theme variables
- **State Management**: React hooks

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: SQLite 3
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **API Style**: RESTful

---

## 13. Security Considerations

### Smart Contract Security
✅ **ReentrancyGuard**: Protection against reentrancy attacks  
✅ **Access Control**: Ownable pattern for admin functions  
✅ **Input Validation**: Require statements for all inputs  
✅ **Integer Overflow**: Solidity 0.8.20 built-in protection  
✅ **Approval Pattern**: ERC-20 approve/transferFrom for safe token transfers  

### Backend Security
✅ **JWT Authentication**: Secure token-based sessions  
✅ **Password Hashing**: bcrypt with 10 rounds  
✅ **SQL Injection Prevention**: Parameterized queries  
✅ **CORS Configuration**: Controlled cross-origin requests  
✅ **Input Sanitization**: Validation on all endpoints  

### Frontend Security
✅ **MetaMask Integration**: Secure wallet connection  
✅ **Transaction Signing**: User confirmation required  
✅ **HTTPS Ready**: Production-ready security  
✅ **XSS Prevention**: React's built-in protection  

---

## 14. Contributing

We welcome contributions! Here's how you can help:

### Areas for Contribution
- 🐛 Bug fixes and issue reporting
- ✨ New features and enhancements
- 📝 Documentation improvements
- 🧪 Additional tests
- 🎨 UI/UX improvements
- 🔒 Security audits

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 15. License

This project is developed as a course project for **MSBD5017 (RWA group G10)** at HKUST.

---

## 16. Acknowledgments

- **OpenZeppelin**: For secure smart contract libraries
- **Hardhat**: For excellent development framework
- **React & Vite**: For modern frontend tooling
- **ethers.js**: For blockchain interaction library
- **MetaMask**: For wallet integration

---

## 17. Contact & Support

- **Course**: MSBD5017 - Real World Assets
- **Group**: G10
- **Members**: Zhuoang Cai, Jianyang Ye, Xiaoling Huang
- **Institution**: HKUST

For questions, issues, or suggestions, please open an issue on GitHub.

---

## 18. Conclusion

HealthChain demonstrates a complete, production-ready prototype for blockchain-based health data management. By combining:

- **5 interconnected smart contracts** for comprehensive functionality
- **Full-stack web application** with modern UI/UX
- **Hybrid storage architecture** for efficiency and privacy
- **Gamified incentives** for user engagement
- **Secure authentication** and data management

The platform showcases how blockchain technology can revolutionize personal health data ownership, monetization, and management while maintaining privacy and security.

The project serves as both a functional prototype and an educational resource for understanding blockchain-based health data systems.

---

**Built with ❤️ by MSBD5017 RWA Group G10**
