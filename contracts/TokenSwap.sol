// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title TokenSwap - Exchange ETH for HTC tokens
/// @notice Allows users to buy HTC tokens with ETH at a fixed rate
contract TokenSwap is Ownable, ReentrancyGuard {
    IERC20 public immutable htcToken;

    // Exchange rate: 1 ETH = rate HTC tokens
    uint256 public exchangeRate; // HTC per ETH (with 18 decimals)

    // Minimum purchase amount in ETH
    uint256 public minPurchase;

    // Maximum purchase amount in ETH per transaction
    uint256 public maxPurchase;

    // Track total ETH collected and HTC sold
    uint256 public totalEthCollected;
    uint256 public totalHtcSold;

    // Events
    event TokensPurchased(
        address indexed buyer,
        uint256 ethAmount,
        uint256 htcAmount,
        uint256 timestamp
    );

    event ExchangeRateUpdated(
        uint256 oldRate,
        uint256 newRate,
        uint256 timestamp
    );

    event LimitsUpdated(
        uint256 minPurchase,
        uint256 maxPurchase,
        uint256 timestamp
    );

    event EthWithdrawn(
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );

    constructor(
        address _htcToken,
        uint256 _exchangeRate,
        uint256 _minPurchase,
        uint256 _maxPurchase
    ) Ownable(msg.sender) {
        require(_htcToken != address(0), "Invalid token address");
        require(_exchangeRate > 0, "Rate must be > 0");
        require(_maxPurchase >= _minPurchase, "Max must be >= min");

        htcToken = IERC20(_htcToken);
        exchangeRate = _exchangeRate;
        minPurchase = _minPurchase;
        maxPurchase = _maxPurchase;
    }

    /// @notice Buy HTC tokens with ETH
    /// @dev Calculates HTC amount based on ETH sent and exchange rate
    function buyTokens() external payable nonReentrant {
        require(msg.value >= minPurchase, "Below minimum purchase");
        require(msg.value <= maxPurchase, "Exceeds maximum purchase");

        // Calculate HTC amount to send
        uint256 htcAmount = (msg.value * exchangeRate) / 1 ether;

        // Check contract has enough tokens
        uint256 contractBalance = htcToken.balanceOf(address(this));
        require(contractBalance >= htcAmount, "Insufficient HTC in contract");

        // Update statistics
        totalEthCollected += msg.value;
        totalHtcSold += htcAmount;

        // Transfer HTC tokens to buyer
        bool success = htcToken.transfer(msg.sender, htcAmount);
        require(success, "Token transfer failed");

        emit TokensPurchased(msg.sender, msg.value, htcAmount, block.timestamp);
    }

    /// @notice Calculate how many HTC tokens can be bought with given ETH amount
    /// @param ethAmount Amount of ETH in wei
    /// @return htcAmount Amount of HTC tokens that will be received
    function calculateHtcAmount(uint256 ethAmount) external view returns (uint256) {
        return (ethAmount * exchangeRate) / 1 ether;
    }

    /// @notice Calculate how much ETH is needed to buy given HTC amount
    /// @param htcAmount Amount of HTC tokens desired
    /// @return ethAmount Amount of ETH in wei needed
    function calculateEthAmount(uint256 htcAmount) external view returns (uint256) {
        return (htcAmount * 1 ether) / exchangeRate;
    }

    /// @notice Get contract statistics
    function getStats() external view returns (
        uint256 contractHtcBalance,
        uint256 contractEthBalance,
        uint256 currentRate,
        uint256 totalEth,
        uint256 totalHtc,
        uint256 minBuy,
        uint256 maxBuy
    ) {
        return (
            htcToken.balanceOf(address(this)),
            address(this).balance,
            exchangeRate,
            totalEthCollected,
            totalHtcSold,
            minPurchase,
            maxPurchase
        );
    }

    // ========== OWNER FUNCTIONS ==========

    /// @notice Update exchange rate
    /// @param newRate New exchange rate (HTC per ETH with 18 decimals)
    function setExchangeRate(uint256 newRate) external onlyOwner {
        require(newRate > 0, "Rate must be > 0");
        uint256 oldRate = exchangeRate;
        exchangeRate = newRate;
        emit ExchangeRateUpdated(oldRate, newRate, block.timestamp);
    }

    /// @notice Update purchase limits
    /// @param _minPurchase New minimum purchase amount
    /// @param _maxPurchase New maximum purchase amount
    function setLimits(uint256 _minPurchase, uint256 _maxPurchase) external onlyOwner {
        require(_maxPurchase >= _minPurchase, "Max must be >= min");
        minPurchase = _minPurchase;
        maxPurchase = _maxPurchase;
        emit LimitsUpdated(_minPurchase, _maxPurchase, block.timestamp);
    }

    /// @notice Withdraw collected ETH
    /// @param to Address to send ETH to
    /// @param amount Amount of ETH to withdraw
    function withdrawEth(address payable to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid address");
        require(amount <= address(this).balance, "Insufficient balance");

        (bool success, ) = to.call{value: amount}("");
        require(success, "ETH transfer failed");

        emit EthWithdrawn(to, amount, block.timestamp);
    }

    /// @notice Withdraw HTC tokens (emergency or rebalancing)
    /// @param to Address to send tokens to
    /// @param amount Amount of tokens to withdraw
    function withdrawTokens(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");

        bool success = htcToken.transfer(to, amount);
        require(success, "Token transfer failed");

        emit TokensWithdrawn(to, amount, block.timestamp);
    }

    /// @notice Allow contract to receive ETH
    receive() external payable {
        // Can accept ETH directly but doesn't trigger token purchase
        // Use buyTokens() function instead
    }
}

