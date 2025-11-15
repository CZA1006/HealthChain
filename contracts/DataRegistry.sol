// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract DataRegistry is Ownable {
    struct DataRecord {
        address owner;      // who controls this data
        bytes32 dataHash;   // hash / pointer to off-chain data
        string dataType;    // e.g. "steps", "heart_rate"
        string uri;         // optional pointer (ipfs://..., https://..., etc.)
        uint64 createdAt;   // timestamp
    }

    uint256 public nextDataId;
    mapping(uint256 => DataRecord) public records;
    mapping(uint256 => mapping(address => bool)) public hasAccess;

    // Address of Marketplace contract allowed to manage access on behalf of owners
    address public marketplace;

    event DataRegistered(
        uint256 indexed dataId,
        address indexed owner,
        bytes32 dataHash,
        string dataType,
        string uri
    );

    event AccessGranted(
        uint256 indexed dataId,
        address indexed owner,
        address indexed grantee
    );

    event AccessRevoked(
        uint256 indexed dataId,
        address indexed owner,
        address indexed grantee
    );

    event MarketplaceSet(address indexed marketplace);

    // Ownable in OZ v5 needs initial owner in constructor
    constructor() Ownable(msg.sender) {}

    /// @notice Set the marketplace contract allowed to call grantAccess / revokeAccess
    function setMarketplace(address _marketplace) external onlyOwner {
        require(_marketplace != address(0), "Invalid marketplace");
        marketplace = _marketplace;
        emit MarketplaceSet(_marketplace);
    }

    modifier onlyRecordController(uint256 dataId) {
        address owner = records[dataId].owner;
        require(
            msg.sender == owner || msg.sender == marketplace,
            "Not data owner"
        );
        _;
    }

    function registerData(
        bytes32 dataHash,
        string calldata dataType,
        string calldata uri
    ) external returns (uint256) {
        require(dataHash != bytes32(0), "Invalid data hash");

        uint256 dataId = ++nextDataId;

        records[dataId] = DataRecord({
            owner: msg.sender,
            dataHash: dataHash,
            dataType: dataType,
            uri: uri,
            createdAt: uint64(block.timestamp)
        });

        emit DataRegistered(dataId, msg.sender, dataHash, dataType, uri);
        return dataId;
    }

    function grantAccess(uint256 dataId, address grantee)
        external
        onlyRecordController(dataId)
    {
        require(grantee != address(0), "Invalid grantee");
        hasAccess[dataId][grantee] = true;
        emit AccessGranted(dataId, records[dataId].owner, grantee);
    }

    function revokeAccess(uint256 dataId, address grantee)
        external
        onlyRecordController(dataId)
    {
        require(hasAccess[dataId][grantee], "No access to revoke");
        hasAccess[dataId][grantee] = false;
        emit AccessRevoked(dataId, records[dataId].owner, grantee);
    }

    function canAccess(uint256 dataId, address user) external view returns (bool) {
        DataRecord memory rec = records[dataId];
        if (rec.owner == address(0)) return false;
        if (user == rec.owner) return true;
        return hasAccess[dataId][user];
    }
}
