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

function App() {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [htcBalance, setHtcBalance] = useState("0");
  const [loading, setLoading] = useState(false);

  // Health data state
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [myHealthData, setMyHealthData] = useState([]);
  const [loadingMyData, setLoadingMyData] = useState(false);

  // Move-to-Earn state
  const [canClaimReward, setCanClaimReward] = useState({});
  const [claimLoading, setClaimLoading] = useState({});
  const [claimedDataIds, setClaimedDataIds] = useState(new Set());

  // Original data fields (for simple registration)
  const [dataContent, setDataContent] = useState("wearable steps data for sale");
  const [dataType, setDataType] = useState("steps");
  const [dataUri, setDataUri] = useState("ipfs://steps-demo");
  const [lastDataId, setLastDataId] = useState(null);

  const [listDataId, setListDataId] = useState("");
  const [listPrice, setListPrice] = useState("100");

  const [buyDataId, setBuyDataId] = useState("");
  const [hasAccess, setHasAccess] = useState(null);

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

      // Get user's data IDs
      const dataIds = await registry.getUserDataIds(addr);
      
      const healthDataList = [];
      
      for (let i = 0; i < dataIds.length; i++) {
        const dataId = Number(dataIds[i]);
        
        try {
          // Get health metrics
          const metrics = await registry.getHealthMetrics(dataId);
          
          // Only include data with health metrics
          if (metrics.hasMetrics) {
            healthDataList.push({
              dataId: dataId,
              steps: Number(metrics.steps),
              heartRate: Number(metrics.heartRate),
              sleepMinutes: Number(metrics.sleepMinutes),
              calories: Number(metrics.calories),
              distance: Number(metrics.distance),
              activeMinutes: Number(metrics.activeMinutes),
              metricType: metrics.metricType,
              timestamp: Number(metrics.timestamp),
            });
          }
        } catch (err) {
          console.error(`Error loading data ${dataId}:`, err);
        }
      }
      
      setMyHealthData(healthDataList);
      
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

      // Claim reward
      const tx = await moveToEarn.claimReward(dataId, data.steps);
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
      await tx.wait();
      console.log('Transaction confirmed!');

      let newId = 1;
      try {
        const nextId = await registry.nextDataId();
        newId = Number(nextId) - 1;
      } catch {
        // fallback
      }

      setLastDataId(newId);
      setListDataId(String(newId));
      setShowHealthForm(false);

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
      await tx.wait();

      let newId = 1;
      try {
        const nextId = await registry.nextDataId();
        newId = Number(nextId) - 1;
      } catch {
        // fallback
      }

      setLastDataId(newId);
      setListDataId(String(newId));

      toast.success(`Data registered successfully! DataId: ${newId}`);
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
      const { marketplace } = contracts;
      if (!marketplace) {
        toast.error("Connect wallet first");
        return;
      }

      const id = Number(listDataId);
      if (!id) {
        toast.error("Enter a valid dataId");
        return;
      }

      const priceWei = ethers.parseUnits(listPrice, 18);
      toast.info("Creating listing...");

      const tx = await marketplace.createListing(id, priceWei);
      await tx.wait();

      toast.success(`Listing created for dataId ${id} at ${listPrice} HTC`);
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

      const id = Number(buyDataId);
      if (!id) {
        toast.error("Enter a valid dataId");
        return;
      }

      toast.info("Reading listing...");
      const listing = await marketplace.listings(id);
      if (!listing.active) {
        toast.error("Listing is not active");
        return;
      }

      const price = listing.price;

      toast.info(`Approving ${ethers.formatUnits(price, 18)} HTC...`);
      const approveTx = await htc.approve(MARKETPLACE_ADDRESS, price);
      await approveTx.wait();

      toast.info("Buying access...");
      const buyTx = await marketplace.buyAccess(id);
      await buyTx.wait();

      const bal = await htc.balanceOf(account);
      setHtcBalance(ethers.formatUnits(bal, 18));

      toast.success(`Access purchased successfully for dataId ${id}!`);
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
      const { registry } = contracts;
      if (!registry) {
        toast.error("Connect wallet first");
        return;
      }

      const id = Number(buyDataId || listDataId || lastDataId);
      if (!id) {
        toast.error("Enter a dataId to check");
        return;
      }

      const ok = await registry.canAccess(id, account);
      setHasAccess(ok);
      
      if (ok) {
        toast.success(`You have access to dataId ${id}!`);
      } else {
        toast.warning(`You don't have access to dataId ${id}`);
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
          <div className="input-grid">
            <Input
              label="DataId to List"
              type="number"
              value={listDataId}
              onChange={(e) => setListDataId(e.target.value)}
              placeholder="Enter dataId"
              fullWidth
            />
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
            disabled={!account || !listDataId}
          >
            Create Listing
          </Button>
        </Card>

        {/* 4. Buy Access Section */}
        <Card 
          title="4. Buy Data Access"
          subtitle="Purchase access to health data"
          variant="elevated"
        >
          <p className="helper-text">
            Switch to a different MetaMask account to buy access to listed data
          </p>

          <Input
            label="DataId to Buy"
            type="number"
            value={buyDataId}
            onChange={(e) => setBuyDataId(e.target.value)}
            placeholder="Enter dataId"
            fullWidth
          />

          <div className="button-group">
            <Button 
              onClick={buyAccess}
              variant="primary"
              loading={loading}
              disabled={!account || !buyDataId}
            >
              Approve + Buy
            </Button>
            <Button 
              onClick={checkMyAccess}
              variant="outline"
              disabled={!account || !buyDataId}
            >
              Check Access
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
