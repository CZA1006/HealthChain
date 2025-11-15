// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IDataRegistry {
    function records(uint256 dataId) external view returns (
        address owner,
        bytes32 dataHash,
        string memory dataType,
        string memory uri,
        uint64 createdAt
    );

    function grantAccess(uint256 dataId, address grantee) external;
}

/// @title Marketplace for selling access to health data using HTC
contract Marketplace {
    struct Listing {
        uint256 id;
        uint256 dataId;
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
        uint256 indexed dataId,
        address indexed seller,
        uint256 price
    );

    event ListingCancelled(uint256 indexed listingId);

    event AccessPurchased(
        uint256 indexed listingId,
        uint256 indexed dataId,
        address indexed buyer,
        uint256 price
    );

    constructor(address tokenAddress, address registryAddress) {
        require(tokenAddress != address(0), "Invalid token");
        require(registryAddress != address(0), "Invalid registry");
        htc = IERC20(tokenAddress);
        registry = IDataRegistry(registryAddress);
    }

    function createListing(uint256 dataId, uint256 price)
        external
        returns (uint256)
    {
        require(price > 0, "Price must be > 0");

        (address owner,,,,) = registry.records(dataId);
        require(owner != address(0), "Data not found");
        require(owner == msg.sender, "Not data owner");

        uint256 listingId = ++nextListingId;

        listings[listingId] = Listing({
            id: listingId,
            dataId: dataId,
            seller: msg.sender,
            price: price,
            active: true
        });

        emit ListingCreated(listingId, dataId, msg.sender, price);
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

        registry.grantAccess(l.dataId, msg.sender);

        emit AccessPurchased(listingId, l.dataId, msg.sender, price);

        // Listing stays active; multiple buyers can purchase access.
        // If you want one-time sale, you could also do: l.active = false;
    }
}
