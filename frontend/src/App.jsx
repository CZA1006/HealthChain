// src/App.jsx - With Health Data Integration and Move-to-Earn
import { useState, useEffect } from "react";
import "./App.css";
import { ethers } from "ethers";

import {
  HTC_ADDRESS,
  REGISTRY_ADDRESS,
  MARKETPLACE_ADDRESS,
  MOVE_TO_EARN_ADDRESS,
} from "./contracts/addresses";

import HTC_ARTIFACT from "./contracts/HealthChainToken.json";
import REGISTRY_ARTIFACT from "./contracts/DataRegistry.json";
import MARKET_ARTIFACT from "./contracts/Marketplace.json";
import MOVE_TO_EARN_ARTIFACT from "./contracts/MoveToEarn.json";

// Import components
import Card from './components/Card';
import Button from './components/Button';
import Input from './components/Input';
import Textarea from './components/Textarea';
import Badge from './components/Badge';
import LoadingSpinner from './components/LoadingSpinner';
import HealthDataForm from './components/HealthDataForm';
import HealthDataCard from './components/HealthDataCard';
import MoveToEarnCard from './components/MoveToEarnCard';
import { ToastContainer } from './components/Toast';
import { useToast } from './hooks/useToast';
import { HealthDataSimulator } from './utils/healthDataSimulator';

// Helper function to extract user data index from dataAddr (low 96 bits)
const getUserDataIndex = (dataAddr) => {
  return Number(BigInt(dataAddr) & ((BigInt(1) << BigInt(96)) - BigInt(1)));
};

function App() {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [htcBalance, setHtcBalance] = useState("0");
  const [loading, setLoading] = useState(false);

  // Health data state
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [myHealthData, setMyHealthData] = useState([]);
  const [loadingMyData, setLoadingMyData] = useState(false);
  const [myDataIds, setMyDataIds] = useState([]); // All DataIDs owned by user (for listing)
  const [allUserData, setAllUserData] = useState([]); // All data including simple data

  // Move-to-Earn state
  const [canClaimReward, setCanClaimReward] = useState({});
  const [claimLoading, setClaimLoading] = useState({});
  const [claimedDataIds, setClaimedDataIds] = useState(new Set());

  // Original data fields (for simple registration)
  const [dataContent, setDataContent] = useState("wearable steps data for sale");
  const [dataType, setDataType] = useState("steps");
  const [dataUri, setDataUri] = useState("ipfs://steps-demo");
  const [lastDataId, setLastDataId] = useState(null);
  const [lastDataAddr, setLastDataAddr] = useState(null); // Store last full dataAddr

  const [listDataId, setListDataId] = useState("");
  const [listPrice, setListPrice] = useState("100");

  const [buyListingId, setBuyListingId] = useState("");
  const [hasAccess, setHasAccess] = useState(null);

  // Mapping from dataId (index) to full dataAddr for contract calls
  const [dataAddrMap, setDataAddrMap] = useState({});

  const [contracts, setContracts] = useState({
    provider: null,
    signer: null,
    htc: null,
    registry: null,
    marketplace: null,
    moveToEarn: null,
  });

  // Use Toast Hook
  const { toasts, toast, removeToast } = useToast();

  // Connect Wallet
  const connectWallet = async () => {
    setLoading(true);
    try {
      if (!window.ethereum) {
        toast.error("MetaMask not detected. Please install the extension.");
        return;
      }

      await window.ethereum.request({ method: "eth_requestAccounts" });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      const net = await provider.getNetwork();

      const htc = new ethers.Contract(
        HTC_ADDRESS,
        HTC_ARTIFACT.abi ?? HTC_ARTIFACT,
        signer
      );
      const registry = new ethers.Contract(
        REGISTRY_ADDRESS,
        REGISTRY_ARTIFACT.abi ?? REGISTRY_ARTIFACT,
        signer
      );
      const marketplace = new ethers.Contract(
        MARKETPLACE_ADDRESS,
        MARKET_ARTIFACT.abi ?? MARKET_ARTIFACT,
        signer
      );
      const moveToEarn = new ethers.Contract(
        MOVE_TO_EARN_ADDRESS,
        MOVE_TO_EARN_ARTIFACT.abi ?? MOVE_TO_EARN_ARTIFACT,
        signer
      );

      const bal = await htc.balanceOf(addr);

      setContracts({ provider, signer, htc, registry, marketplace, moveToEarn });
      setAccount(addr);
      setChainId(net.chainId.toString());
      setHtcBalance(ethers.formatUnits(bal, 18));
      
      toast.success("Connected to MetaMask successfully!");
      
      // Load user's health data
      loadMyHealthData(registry, addr, moveToEarn);
    } catch (err) {
      console.error(err);
      toast.error("Error connecting: " + (err.reason || err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Load user's health data
  const loadMyHealthData = async (registryContract, userAddress, moveToEarnContract) => {
    setLoadingMyData(true);
    try {
      const registry = registryContract || contracts.registry;
      const addr = userAddress || account;
      const moveToEarn = moveToEarnContract || contracts.moveToEarn;

      if (!registry || !addr) return;

      // Get user's next data counter to know how many data entries exist
      const userCounter = await registry.userNextDataAddr(addr);
      const maxIndex = Number(userCounter);

      console.log('=== Loading Health Data ===');
      console.log('User address:', addr);
      console.log('User counter (userNextDataAddr):', maxIndex);

      const healthDataList = [];
      const allDataList = []; // Track all data for listing
      const allDataIds = []; // Track all valid data IDs

      // Iterate through all possible indices from 1 to maxIndex
      for (let i = 1; i <= maxIndex; i++) {
        // Construct dataAddr: [160-bit address] + [96-bit index]
        const dataAddr = (BigInt(addr) << BigInt(96)) | BigInt(i);

        console.log(`Checking index ${i}:`, {
          dataAddr: dataAddr.toString(),
          dataAddrHex: '0x' + dataAddr.toString(16)
        });

        try {
          // Check if this data exists by trying to get the record
          const record = await registry.records(dataAddr);

          // Skip if record doesn't exist (provider is zero address)
          if (record.provider === ethers.ZeroAddress) {
            console.log(`Index ${i}: No record (zero address)`);
            continue;
          }

          // Add to all data list (for listing purposes)
          allDataList.push({
            dataId: i,
            dataAddr: dataAddr,
            dataType: record.dataType,
            dataHash: record.dataHash,
            uri: record.uri,
            createdAt: Number(record.createdAt),
            hasMetrics: false // Will be updated if metrics exist
          });

          allDataIds.push(i);

          // Get health metrics
          const metrics = await registry.getHealthMetrics(dataAddr);

          // Only include data with health metrics in healthDataList
          if (metrics.hasMetrics) {
            const healthData = {
              dataId: i,  // Use the counter index for display
              dataAddr: dataAddr, // Store as BigInt for contract calls
              steps: Number(metrics.steps),
              heartRate: Number(metrics.heartRate),
              sleepMinutes: Number(metrics.sleepMinutes),
              calories: Number(metrics.calories),
              distance: Number(metrics.distance),
              activeMinutes: Number(metrics.activeMinutes),
              metricType: metrics.metricType,
              timestamp: Number(metrics.timestamp),
            };
            healthDataList.push(healthData);

            // Update the allDataList entry to mark it has metrics
            allDataList[allDataList.length - 1].hasMetrics = true;

            console.log(`Added health data with dataId: ${i}, dataAddr: ${dataAddr.toString()}`);
          } else {
            console.log(`Index ${i}: Has record but no health metrics (simple data)`);
          }
        } catch (err) {
          console.error(`Error loading data at index ${i}:`, err);
        }
      }

      console.log('Final healthDataList:', healthDataList);
      console.log('All user data:', allDataList);
      console.log('All DataIds:', allDataIds);

      setMyHealthData(healthDataList);
      setAllUserData(allDataList);
      setMyDataIds(allDataIds); // All valid data IDs (both health and simple)

      // Build dataId -> dataAddr mapping for easy lookup
      const addrMap = {};
      allDataList.forEach(data => {
        addrMap[data.dataId] = data.dataAddr;
      });
      setDataAddrMap(addrMap);

      // Check claim eligibility for all data
      if (moveToEarn && healthDataList.length > 0) {
        await checkCanClaimAll(healthDataList, moveToEarn, addr);
      }
      
      if (healthDataList.length > 0) {
        toast.success(`Loaded ${healthDataList.length} health data records`);
      }
    } catch (err) {
      console.error("Error loading health data:", err);
    } finally {
      setLoadingMyData(false);
    }
  };

  // Check if user can claim rewards for all data
  const checkCanClaimAll = async (dataList, moveToEarnContract, userAddress) => {
    try {
      const moveToEarn = moveToEarnContract || contracts.moveToEarn;
      const addr = userAddress || account;
      
      if (!moveToEarn || !addr) return;

      const claimStatus = {};
      
      for (const data of dataList) {
        try {
          const canClaim = await moveToEarn.canClaimReward(addr, data.dataId);
          claimStatus[data.dataId] = canClaim;
        } catch (err) {
          console.error(`Error checking claim for data ${data.dataId}:`, err);
          claimStatus[data.dataId] = false;
        }
      }
      
      setCanClaimReward(claimStatus);
    } catch (err) {
      console.error('Error checking claim eligibility:', err);
    }
  };

  // Handle reward claim
  const handleClaimReward = async (dataId) => {
    const { moveToEarn, htc } = contracts;
    if (!moveToEarn || !account) {
      toast.error("Connect wallet first");
      return;
    }

    try {
      setClaimLoading(prev => ({ ...prev, [dataId]: true }));

      // Get the health data
      const data = myHealthData.find(d => d.dataId === dataId);
      if (!data) {
        throw new Error('Data not found');
      }

      toast.info("Claiming reward...");

      // Claim reward using dataAddr
      const tx = await moveToEarn.claimReward(data.dataAddr, data.steps);
      console.log('Claiming reward...', tx.hash);
      
      await tx.wait();
      console.log('Reward claimed successfully!');

      // Mark as claimed
      setClaimedDataIds(prev => new Set([...prev, dataId]));
      
      // Update balance
      const bal = await htc.balanceOf(account);
      setHtcBalance(ethers.formatUnits(bal, 18));

      // Update claim status
      setCanClaimReward(prev => ({ ...prev, [dataId]: false }));

      toast.success(`✅ Reward claimed successfully for Health Data #${dataId}!`);
    } catch (err) {
      console.error('Error claiming reward:', err);
      toast.error('Failed to claim reward: ' + (err.reason || err.message || String(err)));
    } finally {
      setClaimLoading(prev => ({ ...prev, [dataId]: false }));
    }
  };

  // Handle reward claimed from MoveToEarnCard
  const handleRewardClaimed = () => {
    loadMyHealthData();
  };

  // Logout
  const handleLogout = () => {
    setAccount(null);
    setChainId(null);
    setHtcBalance("0");
    setMyHealthData([]);
    setMyDataIds([]);
    setCanClaimReward({});
    setClaimLoading({});
    setClaimedDataIds(new Set());
    setContracts({
      provider: null,
      signer: null,
      htc: null,
      registry: null,
      marketplace: null,
      moveToEarn: null,
    });
    toast.info("Disconnected from wallet");
  };

  // Register Health Data
  const registerHealthData = async (healthData) => {
    setLoading(true);
    try {
      const { registry } = contracts;
      if (!registry) {
        toast.error("Connect wallet first");
        return;
      }

      console.log('=== Registering Health Data ===');
      console.log('Received healthData:', healthData);

      // Validate required fields
      if (!healthData.dataHash) {
        throw new Error('dataHash is required');
      }

      // Convert dataHash string to bytes32
      const dataHashBytes32 = ethers.id(healthData.dataHash);
      
      // Prepare HealthMetrics struct
      const metrics = {
        steps: BigInt(healthData.steps || 0),
        heartRate: BigInt(healthData.heartRate || 0),
        sleepMinutes: BigInt(healthData.sleepMinutes || 0),
        calories: BigInt(healthData.calories || 0),
        distance: BigInt(healthData.distance || 0),
        activeMinutes: BigInt(healthData.activeMinutes || 0),
        metricType: healthData.metricType || 'daily'
      };

      // Use provided encryptedKey or generate default
      const encryptedKey = healthData.encryptedKey || `ipfs://health_data_${Date.now()}`;
      const dataTypeStr = 'health_data';

      console.log('Calling contract with:', {
        dataHash: dataHashBytes32,
        dataType: dataTypeStr,
        uri: encryptedKey,
        metrics: metrics
      });

      toast.info("Registering health data on blockchain...");

      const tx = await registry.registerDataWithMetrics(
        dataHashBytes32,   // bytes32 dataHash
        dataTypeStr,       // string dataType
        encryptedKey,      // string uri
        metrics            // HealthMetrics struct
      );

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed!');

      // Get the returned dataAddr from the transaction
      let newDataAddr;
      let newId = 1;

      try {
        // The registerDataWithMetrics function returns the dataAddr
        // We can get it from the transaction receipt events
        const event = receipt.logs.find(log => {
          try {
            const parsed = registry.interface.parseLog(log);
            return parsed && parsed.name === 'DataRegistered';
          } catch {
            return false;
          }
        });

        if (event) {
          const parsed = registry.interface.parseLog(event);
          newDataAddr = parsed.args.dataAddr;
          newId = getUserDataIndex(newDataAddr);
          console.log('New dataAddr:', newDataAddr, 'Index:', newId);
        } else {
          // Fallback: get current counter for user
          const currentCounter = await registry.userNextDataAddr(account);
          newId = Number(currentCounter);
        }
      } catch (err) {
        console.error('Error extracting dataAddr:', err);
        // Last resort: use current counter
        try {
          const currentCounter = await registry.userNextDataAddr(account);
          newId = Number(currentCounter);
        } catch {
          // Ultimate fallback
          newId = 1;
        }
      }

      setLastDataId(newId);
      setLastDataAddr(newDataAddr);
      setListDataId(String(newId));
      setShowHealthForm(false);

      // Update dataAddrMap with new mapping
      if (newDataAddr) {
        setDataAddrMap(prev => ({
          ...prev,
          [newId]: newDataAddr
        }));
      }

      toast.success(`✅ Health data registered successfully! DataId: ${newId}`);
      
      // Reload health data
      await loadMyHealthData();
    } catch (err) {
      console.error(err);
      toast.error("Error registering health data: " + (err.reason || err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Register Simple Data (original method)
  const registerData = async () => {
    setLoading(true);
    try {
      const { registry } = contracts;
      if (!registry) {
        toast.error("Connect wallet first");
        return;
      }

      const dataHash = ethers.keccak256(ethers.toUtf8Bytes(dataContent));
      toast.info("Registering data...");

      const tx = await registry.registerData(dataHash, dataType, dataUri);
      const receipt = await tx.wait();

      // Get the returned dataAddr from the transaction
      let newDataAddr;
      let newId = 1;

      try {
        // Extract dataAddr from DataRegistered event
        const event = receipt.logs.find(log => {
          try {
            const parsed = registry.interface.parseLog(log);
            return parsed && parsed.name === 'DataRegistered';
          } catch {
            return false;
          }
        });

        if (event) {
          const parsed = registry.interface.parseLog(event);
          newDataAddr = parsed.args.dataAddr;
          newId = getUserDataIndex(newDataAddr);
          console.log('New dataAddr:', newDataAddr, 'Index:', newId);
        } else {
          // Fallback: get current counter for user
          const currentCounter = await registry.userNextDataAddr(account);
          newId = Number(currentCounter);
        }
      } catch (err) {
        console.error('Error extracting dataAddr:', err);
        // Last resort: use current counter
        try {
          const currentCounter = await registry.userNextDataAddr(account);
          newId = Number(currentCounter);
        } catch {
          newId = 1;
        }
      }

      setLastDataId(newId);
      setLastDataAddr(newDataAddr);
      setListDataId(String(newId));

      // Update dataAddrMap with new mapping
      if (newDataAddr) {
        setDataAddrMap(prev => ({
          ...prev,
          [newId]: newDataAddr
        }));
      }

      toast.success(`Data registered successfully! DataId: ${newId}`);

      // Reload all data (including simple data for listing)
      await loadMyHealthData();
    } catch (err) {
      console.error(err);
      toast.error("Error registering data: " + (err.reason || err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Create Listing
  const createListing = async () => {
    setLoading(true);
    try {
      const { marketplace, registry } = contracts;
      if (!marketplace || !registry) {
        toast.error("Connect wallet first");
        return;
      }

      const dataId = Number(listDataId);
      if (!dataId) {
        toast.error("Please select a DataID to list");
        return;
      }

      // Get the full dataAddr from the mapping
      const dataAddr = dataAddrMap[dataId];
      if (!dataAddr) {
        toast.error(`DataID #${dataId} not found. Please reload your data.`);
        return;
      }

      // Validate DataID ownership using dataAddr
      try {
        const record = await registry.records(dataAddr);

        if (record.provider === ethers.ZeroAddress) {
          toast.error(`DataID #${dataId} does not exist on-chain`);
          return;
        }

        if (record.provider !== account) {
          toast.error(`You don't own DataID #${dataId}`);
          return;
        }
      } catch (err) {
        toast.error("Failed to validate DataID: " + err.message);
        return;
      }

      const priceWei = ethers.parseUnits(listPrice, 18);
      toast.info(`Creating listing for DataID #${dataId}...`);

      // Use dataAddr for contract call
      const tx = await marketplace.createListing(dataAddr, priceWei);
      await tx.wait();

      toast.success(`✅ Listing created for DataID #${dataId} at ${listPrice} HTC`);
    } catch (err) {
      console.error(err);
      toast.error("Error creating listing: " + (err.reason || err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Buy Access
  const buyAccess = async () => {
    setLoading(true);
    try {
      const { htc, marketplace } = contracts;
      if (!htc || !marketplace) {
        toast.error("Connect wallet first");
        return;
      }

      const listingId = Number(buyListingId);
      if (!listingId) {
        toast.error("Enter a valid Listing ID");
        return;
      }

      toast.info(`Reading listing #${listingId}...`);
      const listing = await marketplace.listings(listingId);

      if (!listing.active) {
        toast.error(`Listing #${listingId} is not active`);
        return;
      }

      const price = listing.price;
      const dataAddr = listing.dataAddr;

      toast.info(`Approving ${ethers.formatUnits(price, 18)} HTC...`);
      const approveTx = await htc.approve(MARKETPLACE_ADDRESS, price);
      await approveTx.wait();

      toast.info("Buying access...");
      const buyTx = await marketplace.buyAccess(listingId);
      await buyTx.wait();

      const bal = await htc.balanceOf(account);
      setHtcBalance(ethers.formatUnits(bal, 18));

      toast.success(`✅ Access purchased successfully for Listing #${listingId}!`);

      // Store the dataAddr for checking access later
      setLastDataAddr(dataAddr);
    } catch (err) {
      console.error(err);
      toast.error("Error buying access: " + (err.reason || err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Check Access
  const checkMyAccess = async () => {
    try {
      const { registry, marketplace } = contracts;
      if (!registry) {
        toast.error("Connect wallet first");
        return;
      }

      let dataAddr;

      // If user provided a listing ID, get the dataAddr from the listing
      if (buyListingId) {
        const listingId = Number(buyListingId);
        toast.info(`Fetching data address from Listing #${listingId}...`);

        const listing = await marketplace.listings(listingId);
        if (!listing.active && listing.seller === ethers.ZeroAddress) {
          toast.error(`Listing #${listingId} not found`);
          return;
        }

        dataAddr = listing.dataAddr;
      } else if (lastDataAddr) {
        // Use the last purchased dataAddr
        dataAddr = lastDataAddr;
      } else {
        toast.error("Enter a Listing ID to check access");
        return;
      }

      const ok = await registry.canAccess(dataAddr, account);
      setHasAccess(ok);
      
      if (ok) {
        toast.success(`You have access to this data!`);
      } else {
        toast.warning(`You don't have access to this data`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error checking access: " + (err.reason || err.message || String(err)));
    }
  };

  // Handle list from health card
  const handleListHealthData = (dataId) => {
    setListDataId(String(dataId));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.info(`Ready to list Health Data #${dataId}. Set your price below.`);
  };

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          handleLogout();
          toast.info("Account changed. Please reconnect.");
        } else {
          handleLogout();
        }
      });
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
      }
    };
  }, []);

  return (
    <div className="App">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Top Navigation */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h2 className="app-title">🏥 HealthChain</h2>
            <Badge variant="success">v2.0</Badge>
          </div>
          <div className="header-right">
            {account ? (
              <>
                <div className="header-balance">
                  <span className="balance-label">Balance:</span>
                  <Badge variant="success">{parseFloat(htcBalance).toFixed(2)} HTC</Badge>
                </div>
                <span className="header-user">
                  <strong>{account.slice(0, 6)}...{account.slice(-4)}</strong>
                </span>
                <Button variant="outline" onClick={handleLogout} size="sm">
                  Logout
                </Button>
              </>
            ) : (
              <span className="header-status">Not connected</span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container">
        <div className="page-header">
          <h1>HealthChain Demo dApp</h1>
          <p>Decentralized marketplace for wearable health data with Move-to-Earn rewards</p>
        </div>

        {/* 0. Move-to-Earn Section */}
        {account && contracts.moveToEarn && (
          <MoveToEarnCard 
            moveToEarn={contracts.moveToEarn}
            account={account}
            htc={contracts.htc}
            onRewardClaimed={handleRewardClaimed}
          />
        )}

        {/* 1. Connect Section */}
        <Card 
          title="1. Connect Wallet"
          subtitle="Connect your MetaMask to get started"
          variant="elevated"
        >
          <Button 
            onClick={connectWallet} 
            variant="primary"
            loading={loading && !account}
            icon={!account && "🦊"}
          >
            {account ? "Connected" : "Connect MetaMask"}
          </Button>
          
          {account && (
            <div className="account-info">
              <div>
                <strong>Account:</strong>{' '}
                <Badge variant="primary">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </Badge>
              </div>
              <div>
                <strong>Chain ID:</strong>{' '}
                <Badge>{chainId}</Badge>
              </div>
              <div>
                <strong>HTC Balance:</strong>{' '}
                <Badge variant="success">{parseFloat(htcBalance).toFixed(2)} HTC</Badge>
              </div>
            </div>
          )}
        </Card>

        {/* 2. Register Health Data Section */}
        <Card 
          title="2. Register Health Data"
          subtitle="Register your wearable health data on-chain"
          variant="elevated"
        >
          {!showHealthForm ? (
            <>
              <p className="helper-text">
                📊 Register simulated wearable device data (steps, heart rate, sleep, calories, etc.)
              </p>
              <Button 
                onClick={() => setShowHealthForm(true)}
                variant="primary"
                disabled={!account}
                icon="➕"
              >
                Add Health Data
              </Button>
            </>
          ) : (
            <HealthDataForm
              onSubmit={registerHealthData}
              onCancel={() => setShowHealthForm(false)}
            />
          )}

          {lastDataId && (
            <div className="success-box">
              <strong>✓ Last registered dataId:</strong>{' '}
              <Badge variant="success">{lastDataId}</Badge>
            </div>
          )}

          {/* Display user's health data */}
          {myHealthData.length > 0 && (
            <div className="my-health-data-section">
              <h3 style={{ color: '#f1f5f9', marginTop: '2rem', marginBottom: '1rem' }}>
                📋 My Health Data Records ({myHealthData.length})
              </h3>
              <div className="health-data-grid">
                {myHealthData.map((data) => (
                  <HealthDataCard
                    key={data.dataId}
                    data={data}
                    dataId={data.dataId}
                    showActions={true}
                    onList={handleListHealthData}
                    onClaimReward={handleClaimReward}
                    canClaimReward={canClaimReward[data.dataId]}
                    claimLoading={claimLoading[data.dataId]}
                    alreadyClaimed={claimedDataIds.has(data.dataId)}
                  />
                ))}
              </div>
            </div>
          )}

          {loadingMyData && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <LoadingSpinner />
              <p style={{ color: '#cbd5e1', marginTop: '1rem' }}>Loading health data...</p>
            </div>
          )}
        </Card>

        {/* Alternative: Simple Data Registration */}
        <Card 
          title="2B. Register Simple Data (Alternative)"
          subtitle="Register generic data without health metrics"
          variant="elevated"
        >
          <Textarea
            label="Data Content"
            helperText="This will be hashed and stored on-chain"
            value={dataContent}
            onChange={(e) => setDataContent(e.target.value)}
            rows={3}
            fullWidth
          />
          
          <div className="input-grid">
            <Input
              label="Data Type"
              value={dataType}
              onChange={(e) => setDataType(e.target.value)}
              placeholder="e.g., steps, heart_rate"
              fullWidth
            />
            <Input
              label="Off-chain URI"
              value={dataUri}
              onChange={(e) => setDataUri(e.target.value)}
              placeholder="e.g., ipfs://..."
              fullWidth
            />
          </div>

          <Button 
            onClick={registerData} 
            variant="secondary"
            loading={loading}
            disabled={!account}
          >
            Register Simple Data
          </Button>
        </Card>

        {/* 3. Create Listing Section */}
        <Card 
          title="3. Create Marketplace Listing"
          subtitle="List your data for sale"
          variant="elevated"
        >
          {/* Display user's DataIDs */}
          {myDataIds.length > 0 && (
            <div className="my-data-ids-section">
              <h3 style={{ color: '#f1f5f9', marginBottom: '1rem', fontSize: '1rem' }}>
                📋 My Registered DataIDs ({myDataIds.length})
              </h3>
              <div className="data-id-grid">
                {myDataIds.map(id => {
                  const dataInfo = allUserData.find(d => d.dataId === id);
                  const isHealthData = dataInfo?.hasMetrics;
                  return (
                    <div
                      key={id}
                      className={`data-id-card ${isHealthData ? 'health-data' : 'simple-data'}`}
                      onClick={() => setListDataId(String(id))}
                      title={isHealthData ? 'Health Data' : `Simple Data (${dataInfo?.dataType || 'unknown'})`}
                    >
                      <span className="data-id-badge">#{id}</span>
                      <small className="data-type-label">
                        {isHealthData ? '🏥 Health' : '📄 Simple'}
                      </small>
                      <button
                        className="data-id-use-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setListDataId(String(id));
                          const type = isHealthData ? 'Health Data' : 'Simple Data';
                          toast.info(`Selected ${type} #${id} for listing`);
                        }}
                      >
                        Select
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="input-grid">
            <div className="form-group">
              <label className="input-label">
                DataID to List (Health or Simple Data)
                {myDataIds.length === 0 && <span style={{ color: '#ef4444' }}>*</span>}
              </label>
              <select
                className="select-input"
                value={listDataId}
                onChange={(e) => setListDataId(e.target.value)}
                disabled={myDataIds.length === 0}
              >
                <option value="">-- Select DataID --</option>
                {myDataIds.map(id => {
                  const dataInfo = allUserData.find(d => d.dataId === id);
                  const isHealthData = dataInfo?.hasMetrics;
                  const dataTypeLabel = isHealthData ? '🏥 Health' : `📄 ${dataInfo?.dataType || 'Simple'}`;
                  const latestLabel = id === lastDataId ? ' (Latest)' : '';
                  return (
                    <option key={id} value={id}>
                      DataID #{id} - {dataTypeLabel}{latestLabel}
                    </option>
                  );
                })}
              </select>
              {myDataIds.length === 0 && (
                <small className="input-helper-text" style={{ color: '#ef4444' }}>
                  Register data first to enable listing
                </small>
              )}
            </div>
            <Input
              label="Price (HTC)"
              type="number"
              value={listPrice}
              onChange={(e) => setListPrice(e.target.value)}
              placeholder="100"
              fullWidth
            />
          </div>

          <Button 
            onClick={createListing}
            variant="primary"
            loading={loading}
            disabled={!account || !listDataId || myDataIds.length === 0}
          >
            Create Listing
          </Button>
        </Card>

        {/* 4. Buy Access Section */}
        <Card 
          title="4. Buy Data Access"
          subtitle="Purchase access to health data from marketplace"
          variant="elevated"
        >
          <p className="helper-text">
            💡 Enter a <strong>Listing ID</strong> from the marketplace to purchase access. Each listing has a unique global ID assigned when created.
          </p>

          <Input
            label="Listing ID"
            type="number"
            value={buyListingId}
            onChange={(e) => setBuyListingId(e.target.value)}
            placeholder="Enter listing ID (e.g., 1, 2, 3...)"
            fullWidth
          />

          <div className="button-group">
            <Button 
              onClick={buyAccess}
              variant="primary"
              loading={loading}
              disabled={!account || !buyListingId}
            >
              💳 Approve + Buy
            </Button>
            <Button 
              onClick={checkMyAccess}
              variant="outline"
              disabled={!account || !buyListingId}
            >
              🔍 Check Access
            </Button>
          </div>

          {hasAccess !== null && (
            <div className={hasAccess ? 'success-box' : 'warning-box'}>
              <span style={{ fontSize: '1.5rem' }}>
                {hasAccess ? '✓' : '✕'}
              </span>
              <span>
                <strong>Access Status:</strong>{' '}
                <Badge variant={hasAccess ? 'success' : 'warning'}>
                  {hasAccess ? 'GRANTED' : 'DENIED'}
                </Badge>
              </span>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default App;
