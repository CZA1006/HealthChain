// frontend/src/contracts.js

export const HTC_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const REGISTRY_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
export const MARKETPLACE_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

export const HTC_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

export const REGISTRY_ABI = [
  // reads
  "function canAccess(uint256 dataId, address user) view returns (bool)",
  "function hasAccess(uint256 dataId, address user) view returns (bool)",
  "function marketplace() view returns (address)",
  "function nextDataId() view returns (uint256)",
  "function owner() view returns (address)",
  "function records(uint256 dataId) view returns (address owner, bytes32 dataHash, string dataType, string uri, uint64 createdAt)",

  // writes
  "function registerData(bytes32 dataHash, string dataType, string uri) returns (uint256)",
  "function grantAccess(uint256 dataId, address grantee)",
  "function revokeAccess(uint256 dataId, address grantee)",
  "function setMarketplace(address _marketplace)",
  "function transferOwnership(address newOwner)",
  "function renounceOwnership()",

  // events (optional, but nice if later you want to listen in the UI)
  "event AccessGranted(uint256 indexed dataId, address indexed owner, address indexed grantee)",
  "event AccessRevoked(uint256 indexed dataId, address indexed owner, address indexed grantee)",
  "event DataRegistered(uint256 indexed dataId, address indexed owner, bytes32 dataHash, string dataType, string uri)",
  "event MarketplaceSet(address indexed marketplace)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

export const MARKET_ABI = [
  "function createListing(uint256 dataId, uint256 price) returns (uint256)",
  "function listings(uint256 id) view returns (uint256 id_, uint256 dataId, address seller, uint256 price, bool active)",
  "function buyAccess(uint256 listingId)"
];
