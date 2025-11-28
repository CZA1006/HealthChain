// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IDataRegistry {
    // 健康数据结构
    struct HealthMetrics {
        uint256 steps;
        uint256 heartRate;
        uint256 sleepMinutes;
        uint256 calories;
        uint256 distance;
        uint256 activeMinutes;
        string metricType;
    }

    function records(uint256 dataAddr) external view returns (
        address provider,
        bytes32 dataHash,
        string memory dataType,
        string memory uri,
        uint64 createdAt,
        HealthMetrics memory metrics,
        bool hasMetrics
    );

    function grantAccess(uint256 dataAddr, address grantee) external;

    function getHealthMetrics(uint256 dataAddr) external view returns (
        uint256 steps,
        uint256 heartRate,
        uint256 sleepMinutes,
        uint256 calories,
        uint256 distance,
        uint256 activeMinutes,
        string memory metricType,
        bool hasMetrics
    );
}

/// @title Marketplace for selling access to health data using HTC
contract Marketplace {
    struct Listing {
        uint256 id;
        uint256 dataAddr;
        address seller;
        uint256 price;  // in HTC (18 decimals)
        bool active;
    }

    IERC20 public immutable htc;
    IDataRegistry public immutable registry;

    uint256 public nextListingId;
    mapping(uint256 => Listing) public listings;

    event ListingCreated(
        uint256 indexed listingId,
        uint256 indexed dataAddr,
        address indexed seller,
        uint256 price
    );

    event ListingCancelled(uint256 indexed listingId);

    event AccessPurchased(
        uint256 indexed listingId,
        uint256 indexed dataAddr,
        address indexed buyer,
        uint256 price
    );

    constructor(address tokenAddress, address registryAddress) {
        require(tokenAddress != address(0), "Invalid token");
        require(registryAddress != address(0), "Invalid registry");
        htc = IERC20(tokenAddress);
        registry = IDataRegistry(registryAddress);
    }

    function createListing(uint256 dataAddr, uint256 price)
        external
        returns (uint256)
    {
        require(price > 0, "Price must be > 0");

        // ✅ 修复：现在是7个返回值
        (address owner,,,,,,) = registry.records(dataAddr);
        require(owner != address(0), "Data not found");
        require(owner == msg.sender, "Not data owner");

        uint256 listingId = ++nextListingId;

        listings[listingId] = Listing({
            id: listingId,
            dataAddr: dataAddr,
            seller: msg.sender,
            price: price,
            active: true
        });

        emit ListingCreated(listingId, dataAddr, msg.sender, price);
        return listingId;
    }

    function cancelListing(uint256 listingId) external {
        Listing storage l = listings[listingId];
        require(l.active, "Not active");
        require(l.seller == msg.sender, "Not seller");

        l.active = false;
        emit ListingCancelled(listingId);
    }

    function buyAccess(uint256 listingId) external {
        Listing storage l = listings[listingId];
        require(l.active, "Not active");
        require(l.seller != address(0), "Listing missing");
        require(msg.sender != l.seller, "Seller cannot buy");

        uint256 price = l.price;

        bool ok = htc.transferFrom(msg.sender, l.seller, price);
        require(ok, "HTC transfer failed");

        registry.grantAccess(l.dataAddr, msg.sender);

        emit AccessPurchased(listingId, l.dataAddr, msg.sender, price);

        // Listing stays active; multiple buyers can purchase access.
        // If you want one-time sale, you could also do: l.active = false;
    }

    /// @notice 获取 listing 的健康数据预览（用于前端展示）
    function getListingHealthPreview(uint256 listingId) external view returns (
        uint256 steps,
        uint256 heartRate,
        uint256 calories,
        string memory metricType,
        bool hasMetrics
    ) {
        Listing memory listing = listings[listingId];
        require(listing.seller != address(0), "Listing not found");

        (
            uint256 _steps,
            uint256 _heartRate,
            ,
            uint256 _calories,
            ,
            ,
            string memory _metricType,
            bool _hasMetrics
        ) = registry.getHealthMetrics(listing.dataAddr);

        return (_steps, _heartRate, _calories, _metricType, _hasMetrics);
    }

    /// @notice 批量获取所有活跃 listings
    function getActiveListings() external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // 先计数
        for (uint256 i = 1; i <= nextListingId; i++) {
            if (listings[i].active) {
                count++;
            }
        }
        
        // 创建数组
        uint256[] memory activeListings = new uint256[](count);
        uint256 index = 0;
        
        // 填充数组
        for (uint256 i = 1; i <= nextListingId; i++) {
            if (listings[i].active) {
                activeListings[index] = i;
                index++;
            }
        }
        
        return activeListings;
    }
}