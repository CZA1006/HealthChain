// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IDataRegistry {
    struct HealthMetrics {
        uint256 steps;
        uint256 heartRate;
        uint256 sleepMinutes;
        uint256 calories;
        uint256 distance;
        uint256 activeMinutes;
        string metricType;
    }

    function records(uint256 dataId) external view returns (
        address provider,
        bytes32 dataHash,
        string memory dataType,
        string memory uri,
        uint64 createdAt,
        HealthMetrics memory metrics,
        bool hasMetrics
    );

    function getHealthMetrics(uint256 dataId) external view returns (
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

/// @title MoveToEarn - Reward users for health activities
contract MoveToEarn is Ownable {
    IERC20 public immutable htcToken;
    IDataRegistry public immutable dataRegistry;

    // Reward configuration
    uint256 public constant STEPS_PER_REWARD = 1000;      // 1000 steps = 10 HTC
    uint256 public constant REWARD_PER_THOUSAND = 10e18;  // 10 HTC (18 decimals)
    uint256 public constant MIN_STEPS = 3000;             // Minimum 3000 steps
    uint256 public constant MAX_STEPS = 20000;            // Maximum 20000 steps (cap)
    uint256 public constant DAILY_COOLDOWN = 24 hours;    // One claim per day

    // User tracking
    struct UserReward {
        uint256 totalSteps;
        uint256 totalRewards;
        uint256 lastClaimTime;
        uint256 claimCount;
    }

    mapping(address => UserReward) public userRewards;
    mapping(address => mapping(uint256 => bool)) public hasClaimedDataId;

    // Events
    event RewardClaimed(
        address indexed user,
        uint256 indexed dataId,
        uint256 steps,
        uint256 reward,
        uint256 timestamp
    );

    event RewardConfigUpdated(
        uint256 minSteps,
        uint256 maxSteps,
        uint256 cooldown
    );

    constructor(address tokenAddress, address registryAddress) Ownable(msg.sender) {
        require(tokenAddress != address(0), "Invalid token address");
        require(registryAddress != address(0), "Invalid registry address");
        
        htcToken = IERC20(tokenAddress);
        dataRegistry = IDataRegistry(registryAddress);
    }

    /// @notice Claim reward for registered health data
    /// @param dataId The ID of the registered health data
    function claimReward(uint256 dataId) external {
        // Get health metrics
        (
            uint256 steps,
            ,
            ,
            ,
            ,
            ,
            string memory metricType,
            bool hasMetrics
        ) = dataRegistry.getHealthMetrics(dataId);

        // Verify data owner
        (address provider,,,,,,) = dataRegistry.records(dataId);
        require(provider == msg.sender, "Not data owner");

        // Verify data has metrics
        require(hasMetrics, "No health metrics");

        // Only daily data can claim rewards
        require(
            keccak256(bytes(metricType)) == keccak256(bytes("daily")),
            "Only daily data eligible"
        );

        // Check if already claimed
        require(!hasClaimedDataId[msg.sender][dataId], "Already claimed");

        // Check cooldown
        UserReward storage user = userRewards[msg.sender];
        require(
            block.timestamp >= user.lastClaimTime + DAILY_COOLDOWN,
            "Cooldown not finished"
        );

        // Validate steps
        require(steps >= MIN_STEPS, "Steps below minimum");

        // Cap steps at maximum
        uint256 validSteps = steps > MAX_STEPS ? MAX_STEPS : steps;

        // Calculate reward
        uint256 reward = calculateReward(validSteps);

        // Check contract balance
        uint256 balance = htcToken.balanceOf(address(this));
        require(balance >= reward, "Insufficient contract balance");

        // Update user record
        user.totalSteps += validSteps;
        user.totalRewards += reward;
        user.lastClaimTime = block.timestamp;
        user.claimCount++;
        hasClaimedDataId[msg.sender][dataId] = true;

        // Transfer reward
        bool success = htcToken.transfer(msg.sender, reward);
        require(success, "Transfer failed");

        emit RewardClaimed(msg.sender, dataId, validSteps, reward, block.timestamp);
    }

    /// @notice Calculate reward based on steps
    /// @param steps Number of steps
    /// @return reward Amount of HTC tokens
    function calculateReward(uint256 steps) public pure returns (uint256) {
        // Reward = (steps / 1000) * 10 HTC
        return (steps / STEPS_PER_REWARD) * REWARD_PER_THOUSAND;
    }

    /// @notice Check if user can claim reward
    /// @param user User address
    /// @return canClaim Whether user can claim
    /// @return reason Reason if cannot claim
    function canClaimReward(address user) external view returns (bool canClaim, string memory reason) {
        UserReward memory userReward = userRewards[user];
        
        if (block.timestamp < userReward.lastClaimTime + DAILY_COOLDOWN) {
            uint256 timeLeft = (userReward.lastClaimTime + DAILY_COOLDOWN) - block.timestamp;
            return (false, string(abi.encodePacked("Cooldown: ", uintToString(timeLeft / 3600), " hours left")));
        }
        
        return (true, "Ready to claim");
    }

    /// @notice Get user reward statistics
    /// @param user User address
    function getUserStats(address user) external view returns (
        uint256 totalSteps,
        uint256 totalRewards,
        uint256 lastClaimTime,
        uint256 claimCount,
        uint256 nextClaimTime
    ) {
        UserReward memory userReward = userRewards[user];
        
        return (
            userReward.totalSteps,
            userReward.totalRewards,
            userReward.lastClaimTime,
            userReward.claimCount,
            userReward.lastClaimTime + DAILY_COOLDOWN
        );
    }

    /// @notice Owner can fund the contract with HTC tokens
    function fundContract(uint256 amount) external onlyOwner {
        bool success = htcToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");
    }

    /// @notice Owner can withdraw remaining tokens
    function withdrawTokens(uint256 amount) external onlyOwner {
        bool success = htcToken.transfer(msg.sender, amount);
        require(success, "Transfer failed");
    }

    /// @notice Get contract HTC balance
    function getContractBalance() external view returns (uint256) {
        return htcToken.balanceOf(address(this));
    }

    /// @notice Utility function to convert uint to string
    function uintToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}