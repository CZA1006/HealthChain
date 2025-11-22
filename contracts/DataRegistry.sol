// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

uint256 constant NULL = 0;

contract DataRegistry is Ownable {
    // 🆕 健康数据指标结构
    struct HealthMetrics {
        uint256 steps;          // 步数
        uint256 heartRate;      // 心率 (bpm)
        uint256 sleepMinutes;   // 睡眠时间 (分钟)
        uint256 calories;       // 卡路里
        uint256 distance;       // 距离 (米)
        uint256 activeMinutes;  // 活动时间 (分钟)
        string metricType;      // 数据类型: "daily", "weekly", "monthly"
    }

    struct DataRecord {
        address provider;       // who provides this data
        bytes32 dataHash;       // hash / pointer to off-chain data
        string dataType;        // e.g. "steps", "heart_rate", "health_report"
        string uri;             // optional pointer (ipfs://..., https://..., etc.)
        uint64 createdAt;       // timestamp
        HealthMetrics metrics;  // 🆕 健康数据指标
        bool hasMetrics;        // 🆕 是否包含健康指标数据
    }

    uint256 public nextDataId;
    mapping(uint256 => DataRecord) public records;
    mapping(uint256 => mapping(address => bool)) public hasAccess;

    // Address of Marketplace contract allowed to manage access on behalf of owners
    address public marketplace;

    event DataRegistered(
        uint256 indexed dataId,
        address indexed provider,
        bytes32 dataHash,
        string dataType,
        string uri,
        bool hasMetrics  // 🆕 事件中添加 hasMetrics
    );

    event AccessGranted(
        uint256 indexed dataId,
        address indexed provider,
        address indexed grantee
    );

    event AccessRevoked(
        uint256 indexed dataId,
        address indexed provider,
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
        address owner = records[dataId].provider;
        require(
            msg.sender == owner || msg.sender == marketplace,
            "Not data owner"
        );
        _;
    }

    /// @notice 注册数据（不带健康指标，向后兼容）
    function registerData(
        bytes32 dataHash,
        string calldata dataType,
        string calldata uri
    ) external returns (uint256) {
        require(dataHash != bytes32(0), "Invalid data hash");

        uint256 dataId = ++nextDataId;

        // 创建空的健康指标
        HealthMetrics memory emptyMetrics;

        records[dataId] = DataRecord({
            provider: msg.sender,
            dataHash: dataHash,
            dataType: dataType,
            uri: uri,
            createdAt: uint64(block.timestamp),
            metrics: emptyMetrics,
            hasMetrics: false
        });

        emit DataRegistered(dataId, msg.sender, dataHash, dataType, uri, false);
        return dataId;
    }

    /// @notice 🆕 注册数据（带健康指标）
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

        uint256 dataId = ++nextDataId;

        records[dataId] = DataRecord({
            provider: msg.sender,
            dataHash: dataHash,
            dataType: dataType,
            uri: uri,
            createdAt: uint64(block.timestamp),
            metrics: metrics,
            hasMetrics: true
        });

        emit DataRegistered(dataId, msg.sender, dataHash, dataType, uri, true);
        return dataId;
    }

    /// @notice 🆕 获取健康数据指标
    function getHealthMetrics(uint256 dataId) external view returns (
        uint256 steps,
        uint256 heartRate,
        uint256 sleepMinutes,
        uint256 calories,
        uint256 distance,
        uint256 activeMinutes,
        string memory metricType,
        bool hasMetrics
    ) {
        DataRecord memory record = records[dataId];
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

    /// @notice 🆕 获取用户的所有数据 ID
    function getUserDataIds(address user) external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // 先计数
        for (uint256 i = 1; i <= nextDataId; i++) {
            if (records[i].provider == user) {
                count++;
            }
        }
        
        // 创建数组
        uint256[] memory userDataIds = new uint256[](count);
        uint256 index = 0;
        
        // 填充数组
        for (uint256 i = 1; i <= nextDataId; i++) {
            if (records[i].provider == user) {
                userDataIds[index] = i;
                index++;
            }
        }
        
        return userDataIds;
    }

    /// @notice 🆕 撤销数据（符合"被遗忘权"）
    function revokeData(uint256 dataId) external {
        require(records[dataId].provider == msg.sender, "Not data owner");
        require(records[dataId].provider != address(0), "Data not found");
        
        // 标记数据为已删除（不真正删除，保留历史记录）
        delete records[dataId];
    }

    function grantAccess(uint256 dataId, address grantee)
        external
        onlyRecordController(dataId)
    {
        require(grantee != address(0), "Invalid grantee");
        hasAccess[dataId][grantee] = true;
        emit AccessGranted(dataId, records[dataId].provider, grantee);
    }

    function revokeAccess(uint256 dataId, address grantee)
        external
        onlyRecordController(dataId)
    {
        require(hasAccess[dataId][grantee], "No access to revoke");
        hasAccess[dataId][grantee] = false;
        emit AccessRevoked(dataId, records[dataId].provider, grantee);
    }

    function canAccess(uint256 dataId, address user) external view returns (bool) {
        DataRecord memory rec = records[dataId];
        if (rec.provider == address(0)) return false;
        if (user == rec.provider) return true;
        return hasAccess[dataId][user];
    }
}