// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

uint256 constant NULL = 0;

contract DataRegistry is Ownable {
    // Health data metrics structure
    struct HealthMetrics {
        uint256 steps;          // Step count
        uint256 heartRate;      // Heart rate (bpm)
        uint256 sleepMinutes;   // Sleep duration (minutes)
        uint256 calories;       // Calories burned
        uint256 distance;       // Distance (meters)
        uint256 activeMinutes;  // Active time (minutes)
        string metricType;      // Data type: "daily", "weekly", "monthly"
    }

    struct DataRecord {
        address provider;       // who provides this data
        bytes32 dataHash;       // hash / pointer to off-chain data
        string dataType;        // e.g. "steps", "heart_rate", "health_report"
        string uri;             // optional pointer (ipfs://..., https://..., etc.)
        uint64 createdAt;       // timestamp
        HealthMetrics metrics;  // Health data metrics
        bool hasMetrics;        // Whether contains health metrics
    }

    // User-based sharded ID design
    mapping(address => uint256) public userNextDataAddr;  // Independent counter per user
    mapping(uint256 => DataRecord) public records;
    mapping(uint256 => mapping(address => bool)) public hasAccess;

    // Address of Marketplace contract allowed to manage access on behalf of owners
    address public marketplace;

    event DataRegistered(
        uint256 indexed dataAddr,
        address indexed provider,
        bytes32 dataHash,
        string dataType,
        string uri,
        bool hasMetrics  // Whether has metrics
    );

    event AccessGranted(
        uint256 indexed dataAddr,
        address indexed provider,
        address indexed grantee
    );

    event AccessRevoked(
        uint256 indexed dataAddr,
        address indexed provider,
        address indexed grantee
    );

    event MarketplaceSet(address indexed marketplace);

    // Ownable in OZ v5 needs initial owner in constructor
    constructor() Ownable(msg.sender) {}

    /// @notice Generate globally unique dataAddr
    function _generateDataAddr(address user) internal returns (uint256) {
        uint256 userCounter = userNextDataAddr[user] + 1;
        userNextDataAddr[user] = userCounter;

        // dataAddr structure: high 160 bits = user address, low 96 bits = counter
        // Ensures global uniqueness and supports concurrent calls
        return (uint256(uint160(user)) << 96) | userCounter;
    }

    /// @notice Extract user address from dataAddr
    function getProviderFromDataAddr(uint256 dataAddr) public pure returns (address) {
        return address(uint160(dataAddr >> 96));
    }

    /// @notice Extract user data index from dataAddr
    function getUserDataIndex(uint256 dataAddr) public pure returns (uint256) {
        return dataAddr & ((1 << 96) - 1);
    }

    /// @notice Set the marketplace contract allowed to call grantAccess / revokeAccess
    function setMarketplace(address _marketplace) external onlyOwner {
        require(_marketplace != address(0), "Invalid marketplace");
        marketplace = _marketplace;
        emit MarketplaceSet(_marketplace);
    }

    modifier onlyRecordController(uint256 dataAddr) {
        address owner = getProviderFromDataAddr(dataAddr);
        require(
            msg.sender == owner || msg.sender == marketplace,
            "Not data owner"
        );
        _;
    }

    /// @notice Register data (without health metrics, backward compatible)
    function registerData(
        bytes32 dataHash,
        string calldata dataType,
        string calldata uri
    ) external returns (uint256) {
        require(dataHash != bytes32(0), "Invalid data hash");

        uint256 dataAddr = _generateDataAddr(msg.sender);

        // Create empty health metrics
        HealthMetrics memory emptyMetrics;

        records[dataAddr] = DataRecord({
            provider: msg.sender,
            dataHash: dataHash,
            dataType: dataType,
            uri: uri,
            createdAt: uint64(block.timestamp),
            metrics: emptyMetrics,
            hasMetrics: false
        });

        emit DataRegistered(dataAddr, msg.sender, dataHash, dataType, uri, false);
        return dataAddr;
    }

    /// @notice Register data with health metrics
    function registerDataWithMetrics(
        bytes32 dataHash,
        string calldata dataType,
        string calldata uri,
        HealthMetrics calldata metrics
    ) external returns (uint256) {
        require(dataHash != bytes32(0), "Invalid data hash");
        require(
            metrics.steps > 0 || metrics.heartRate > 0 || metrics.calories > 0,
            "Metrics cannot be all zero"
        );

        uint256 dataAddr = _generateDataAddr(msg.sender);

        records[dataAddr] = DataRecord({
            provider: msg.sender,
            dataHash: dataHash,
            dataType: dataType,
            uri: uri,
            createdAt: uint64(block.timestamp),
            metrics: metrics,
            hasMetrics: true
        });

        emit DataRegistered(dataAddr, msg.sender, dataHash, dataType, uri, true);
        return dataAddr;
    }

    /// @notice Get health data metrics
    function getHealthMetrics(uint256 dataAddr) external view returns (
        uint256 steps,
        uint256 heartRate,
        uint256 sleepMinutes,
        uint256 calories,
        uint256 distance,
        uint256 activeMinutes,
        string memory metricType,
        bool hasMetrics
    ) {
        DataRecord memory record = records[dataAddr];
        require(record.provider != address(0), "Data not found");

        return (
            record.metrics.steps,
            record.metrics.heartRate,
            record.metrics.sleepMinutes,
            record.metrics.calories,
            record.metrics.distance,
            record.metrics.activeMinutes,
            record.metrics.metricType,
            record.hasMetrics
        );
    }

    /// @notice Get all data addresses for a user
    function getUserDataAddrs(address user) external view returns (uint256[] memory) {
        uint256 userCounter = userNextDataAddr[user];
        if (userCounter == 0) {
            return new uint256[](0);
        }
        
        // Calculate valid data count first
        uint256 validCount = 0;
        for (uint256 i = 1; i <= userCounter; i++) {
            uint256 dataAddr = (uint256(uint160(user)) << 96) | i;
            if (records[dataAddr].provider != address(0)) {
                validCount++;
            }
        }
        
        if (validCount == 0) {
            return new uint256[](0);
        }
        
        // Create array with correct size
        uint256[] memory userDataAddrs = new uint256[](validCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= userCounter; i++) {
            uint256 dataAddr = (uint256(uint160(user)) << 96) | i;
            if (records[dataAddr].provider != address(0)) {
                userDataAddrs[index] = dataAddr;
                index++;
            }
        }
        
        return userDataAddrs;
    }

    /// @notice Get all data indices for a user (low 96-bit counter values)
    /// @param user User address
    /// @return Array containing all valid data indices
    function getUserIndices(address user) external view returns (uint256[] memory) {
        uint256 userCounter = userNextDataAddr[user];
        if (userCounter == 0) {
            return new uint256[](0);
        }

        // Calculate valid data count first
        uint256 validCount = 0;
        for (uint256 i = 1; i <= userCounter; i++) {
            uint256 dataAddr = (uint256(uint160(user)) << 96) | i;
            if (records[dataAddr].provider != address(0)) {
                validCount++;
            }
        }

        if (validCount == 0) {
            return new uint256[](0);
        }

        // Create array with correct size to store indices
        uint256[] memory userIndices = new uint256[](validCount);
        uint256 index = 0;

        for (uint256 i = 1; i <= userCounter; i++) {
            uint256 dataAddr = (uint256(uint160(user)) << 96) | i;
            if (records[dataAddr].provider != address(0)) {
                // Extract and store index value (low 96 bits)
                userIndices[index] = getUserDataIndex(dataAddr);
                index++;
            }
        }

        return userIndices;
    }

    /// @notice Revoke data (right to be forgotten)
    function revokeData(uint256 dataAddr) external {
        address provider = getProviderFromDataAddr(dataAddr);
        require(provider == msg.sender, "Not data owner");
        require(records[dataAddr].provider != address(0), "Data not found");

        // Mark data as deleted (preserves history)
        delete records[dataAddr];
    }

    function grantAccess(uint256 dataAddr, address grantee)
        external
        onlyRecordController(dataAddr)
    {
        require(grantee != address(0), "Invalid grantee");
        hasAccess[dataAddr][grantee] = true;
        emit AccessGranted(dataAddr, getProviderFromDataAddr(dataAddr), grantee);
    }

    function revokeAccess(uint256 dataAddr, address grantee)
        external
        onlyRecordController(dataAddr)
    {
        require(hasAccess[dataAddr][grantee], "No access to revoke");
        hasAccess[dataAddr][grantee] = false;
        emit AccessRevoked(dataAddr, getProviderFromDataAddr(dataAddr), grantee);
    }

    function canAccess(uint256 dataAddr, address user) external view returns (bool) {
        DataRecord memory rec = records[dataAddr];
        if (rec.provider == address(0)) return false;
        
        // Verify owner using new dataAddr structure
        address providerFromAddr = getProviderFromDataAddr(dataAddr);
        if (user == providerFromAddr) return true;

        return hasAccess[dataAddr][user];
    }
}