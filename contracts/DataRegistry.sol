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

    // 🆕 改进：使用基于用户地址的分片ID设计
    mapping(address => uint256) public userNextDataAddr;  // 每个用户独立的计数器
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
        bool hasMetrics  // 🆕 事件中添加 hasMetrics
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

    /// @notice 🆕 生成全局唯一的dataAddr
    function _generateDataAddr(address user) internal returns (uint256) {
        uint256 userCounter = userNextDataAddr[user] + 1;
        userNextDataAddr[user] = userCounter;

        // dataAddr结构：高160位为用户地址，低96位为用户数据计数器
        // 这样可以确保全局唯一性，同时支持并发调用
        return (uint256(uint160(user)) << 96) | userCounter;
    }

    /// @notice 🆕 从dataAddr中提取用户地址
    function getProviderFromDataAddr(uint256 dataAddr) public pure returns (address) {
        return address(uint160(dataAddr >> 96));
    }

    /// @notice 🆕 从dataAddr中提取用户数据序号
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

    /// @notice 注册数据（不带健康指标，向后兼容）
    function registerData(
        bytes32 dataHash,
        string calldata dataType,
        string calldata uri
    ) external returns (uint256) {
        require(dataHash != bytes32(0), "Invalid data hash");

        uint256 dataAddr = _generateDataAddr(msg.sender);

        // 创建空的健康指标
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

    /// @notice 🆕 获取健康数据指标
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

    /// @notice 🆕 获取用户的所有数据 Addr
    function getUserDataAddrs(address user) external view returns (uint256[] memory) {
        uint256 userCounter = userNextDataAddr[user];
        if (userCounter == 0) {
            return new uint256[](0);
        }
        
        // 先计算有效数据数量
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
        
        // 创建正确大小的数组
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

    /// @notice 🆕 获取用户的所有数据索引（低96位计数器值）
    /// @param user 用户地址
    /// @return 包含所有有效数据索引的数组
    function getUserIndices(address user) external view returns (uint256[] memory) {
        uint256 userCounter = userNextDataAddr[user];
        if (userCounter == 0) {
            return new uint256[](0);
        }

        // 先计算有效数据数量
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

        // 创建正确大小的数组，存储索引值
        uint256[] memory userIndices = new uint256[](validCount);
        uint256 index = 0;

        for (uint256 i = 1; i <= userCounter; i++) {
            uint256 dataAddr = (uint256(uint160(user)) << 96) | i;
            if (records[dataAddr].provider != address(0)) {
                // 提取并存储索引值（低96位）
                userIndices[index] = getUserDataIndex(dataAddr);
                index++;
            }
        }

        return userIndices;
    }

    /// @notice 🆕 撤销数据（符合"被遗忘权"）
    function revokeData(uint256 dataAddr) external {
        address provider = getProviderFromDataAddr(dataAddr);
        require(provider == msg.sender, "Not data owner");
        require(records[dataAddr].provider != address(0), "Data not found");

        // 标记数据为已删除（不真正删除，保留历史记录）
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
        
        // 使用新的dataAddr结构验证所有者
        address providerFromAddr = getProviderFromDataAddr(dataAddr);
        if (user == providerFromAddr) return true;

        return hasAccess[dataAddr][user];
    }
}