// frontend/src/App.jsx
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

function App() {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [htcBalance, setHtcBalance] = useState("0");

  const [status, setStatus] = useState("");

  const [dataContent, setDataContent] = useState(
    "wearable steps data for sale"
  );
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

  // --- helper: connect wallet + create contract instances ---
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("MetaMask not detected. Please install the extension.");
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
      setStatus("Connected to MetaMask and HealthChain contracts ✅");
    } catch (err) {
      console.error(err);
      setStatus("Error connecting: " + (err.reason || err.message || String(err)));
    }
  };

  // --- 2. Register data ---
  const registerData = async () => {
    try {
      const { registry } = contracts;
      if (!registry) return alert("Connect wallet first");

      const dataHash = ethers.keccak256(ethers.toUtf8Bytes(dataContent));
      setStatus("Registering data...");

      const tx = await registry.registerData(dataHash, dataType, dataUri);
      const receipt = await tx.wait();

      // our contract has `uint256 public nextDataId`
      let newId = 1;
      try {
        const nextId = await registry.nextDataId();
        newId = Number(nextId) - 1;
      } catch {
        // fallback for safety
      }

      setLastDataId(newId);
      setListDataId(String(newId));

      setStatus(
        `Data registered (dataId = ${newId}). Hash = ${dataHash.slice(0, 10)}...`
      );
    } catch (err) {
      console.error(err);
      setStatus("Error registering data: " + (err.reason || err.message || String(err)));
    }
  };

  // --- 3. Create marketplace listing ---
  const createListing = async () => {
    try {
      const { marketplace } = contracts;
      if (!marketplace) return alert("Connect wallet first");

      const id = Number(listDataId);
      if (!id) return alert("Enter a valid dataId");

      const priceWei = ethers.parseUnits(listPrice, 18);
      setStatus("Creating listing...");

      const tx = await marketplace.createListing(id, priceWei);
      await tx.wait();

      setStatus(`Listing created for dataId ${id} at price ${listPrice} HTC.`);
    } catch (err) {
      console.error(err);
      setStatus("Error creating listing: " + (err.reason || err.message || String(err)));
    }
  };

  // --- 4. Buyer: approve + buy access ---
  const buyAccess = async () => {
    try {
      const { htc, marketplace } = contracts;
      if (!htc || !marketplace) return alert("Connect wallet first");

      const id = Number(buyDataId);
      if (!id) return alert("Enter a valid dataId");

      setStatus("Reading listing...");
      const listing = await marketplace.listings(id);
      if (!listing.active) {
        setStatus("Listing is not active.");
        return;
      }

      const price = listing.price;

      setStatus(
        `Approving ${ethers.formatUnits(price, 18)} HTC for marketplace...`
      );
      const approveTx = await htc.approve(MARKETPLACE_ADDRESS, price);
      await approveTx.wait();

      setStatus("Buying access via marketplace...");
      const buyTx = await marketplace.buyAccess(id);
      await buyTx.wait();

      const bal = await htc.balanceOf(account);
      setHtcBalance(ethers.formatUnits(bal, 18));

      setStatus(`Access purchased for dataId ${id} ✅`);
    } catch (err) {
      console.error(err);
      setStatus("Error buying access: " + (err.reason || err.message || String(err)));
    }
  };

  const checkMyAccess = async () => {
    try {
      const { registry } = contracts;
      if (!registry) return alert("Connect wallet first");

      const id = Number(buyDataId || listDataId || lastDataId);
      if (!id) return alert("Enter a dataId to check");

      const ok = await registry.canAccess(id, account);
      setHasAccess(ok);
      setStatus(`Access check for dataId ${id}: ${ok ? "YES" : "NO"}`);
    } catch (err) {
      console.error(err);
      setStatus("Error checking access: " + (err.reason || err.message || String(err)));
    }
  };

  return (
    <div className="App">
      <h1>HealthChain Demo dApp</h1>

      <section className="card">
        <h2>1. Connect</h2>
        <button onClick={connectWallet}>Connect MetaMask</button>
        <p><strong>Account:</strong> {account || "-"}</p>
        <p><strong>Chain ID:</strong> {chainId || "-"}</p>
        <p><strong>HTC balance:</strong> {htcBalance} HTC</p>
      </section>

      <section className="card">
        <h2>2. Register wearable data</h2>
        <label>
          Data content (we hash this):
          <textarea
            rows={2}
            value={dataContent}
            onChange={(e) => setDataContent(e.target.value)}
          />
        </label>
        <label>
          Data type:
          <input
            value={dataType}
            onChange={(e) => setDataType(e.target.value)}
          />
        </label>
        <label>
          Off-chain URI:
          <input
            value={dataUri}
            onChange={(e) => setDataUri(e.target.value)}
          />
        </label>
        <button onClick={registerData}>Register data</button>
        {lastDataId && <p>Last registered dataId: {lastDataId}</p>}
      </section>

      <section className="card">
        <h2>3. Create listing</h2>
        <label>
          DataId to list:
          <input
            value={listDataId}
            onChange={(e) => setListDataId(e.target.value)}
          />
        </label>
        <label>
          Price (HTC):
          <input
            value={listPrice}
            onChange={(e) => setListPrice(e.target.value)}
          />
        </label>
        <button onClick={createListing}>Create listing</button>
      </section>

      <section className="card">
        <h2>4. Buy access (use Account #1 in MetaMask)</h2>
        <p>
          In MetaMask, switch to your imported Hardhat Account #1, then click
          Connect again and use this section.
        </p>
        <label>
          DataId to buy:
          <input
            value={buyDataId}
            onChange={(e) => setBuyDataId(e.target.value)}
          />
        </label>
        <button onClick={buyAccess}>Approve + Buy</button>
        <button onClick={checkMyAccess}>Check my access</button>
        {hasAccess !== null && (
          <p>
            Can current account access this data?{" "}
            <strong>{hasAccess ? "YES ✅" : "NO ❌"}</strong>
          </p>
        )}
      </section>

      <section className="card">
        <h3>Status</h3>
        <pre>{status}</pre>
      </section>
    </div>
  );
}

export default App;
