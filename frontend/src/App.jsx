// src/App.jsx - 优化版本
import { useState } from "react";
import "./App.css";
import { ethers } from "ethers";

import {
  HTC_ADDRESS,
  REGISTRY_ADDRESS,
  MARKETPLACE_ADDRESS,
} from "./contracts/addresses";

import HTC_ARTIFACT from "./contracts/HealthChainToken.json";
import REGISTRY_ARTIFACT from "./contracts/DataRegistry.json";
import MARKET_ARTIFACT from "./contracts/Marketplace.json";

// 导入新组件
import Card from './components/Card';
import Button from './components/Button';
import Input from './components/Input';
import Textarea from './components/Textarea';
import Badge from './components/Badge';
import LoadingSpinner from './components/LoadingSpinner';
import { ToastContainer } from './components/Toast';
import { useToast } from './hooks/useToast';

function App() {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [htcBalance, setHtcBalance] = useState("0");
  const [loading, setLoading] = useState(false);

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
  });

  // 使用 Toast Hook
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

      const bal = await htc.balanceOf(addr);

      setContracts({ provider, signer, htc, registry, marketplace });
      setAccount(addr);
      setChainId(net.chainId.toString());
      setHtcBalance(ethers.formatUnits(bal, 18));
      
      toast.success("Connected to MetaMask successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Error connecting: " + (err.reason || err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Register Data
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

  return (
    <div className="App">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <div className="container" style={{ maxWidth: 1000, paddingTop: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 'var(--font-size-4xl)', marginBottom: '0.5rem' }}>
            HealthChain Demo dApp
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Decentralized marketplace for wearable health data
          </p>
        </div>

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
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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

        {/* 2. Register Data Section */}
        <Card 
          title="2. Register Health Data"
          subtitle="Register your wearable health data on-chain"
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
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
            Register Data
          </Button>

          {lastDataId && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '1rem', 
              background: 'var(--color-success-light)',
              borderRadius: 'var(--border-radius-md)'
            }}>
              <strong>✓ Last registered dataId:</strong>{' '}
              <Badge variant="success">{lastDataId}</Badge>
            </div>
          )}
        </Card>

        {/* 3. Create Listing Section */}
        <Card 
          title="3. Create Marketplace Listing"
          subtitle="List your data for sale"
          variant="elevated"
        >
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
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
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: 'var(--font-size-sm)',
            marginBottom: '1rem'
          }}>
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

          <div style={{ display: 'flex', gap: '0.5rem' }}>
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
            <div style={{ 
              marginTop: '1rem',
              padding: '1rem',
              background: hasAccess ? 'var(--color-success-light)' : 'var(--color-warning-light)',
              borderRadius: 'var(--border-radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: 'var(--font-size-xl)' }}>
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
