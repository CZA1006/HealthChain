// frontend/src/components/MoveToEarnCard.jsx
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Card from './Card';
import Button from './Button';
import Badge from './Badge';
import './MoveToEarnCard.css';

function MoveToEarnCard({ 
  account, 
  moveToEarnContract, 
  htcContract,
  onRewardClaimed 
}) {
  const [loading, setLoading] = useState(false);
  const [userStats, setUserStats] = useState(null);
  const [canClaim, setCanClaim] = useState(false);
  const [claimReason, setClaimReason] = useState('');
  const [contractBalance, setContractBalance] = useState('0');

  // Load user stats
  useEffect(() => {
    if (account && moveToEarnContract) {
      loadUserStats();
      loadContractBalance();
    }
  }, [account, moveToEarnContract]);

  const loadUserStats = async () => {
    try {
      const stats = await moveToEarnContract.getUserStats(account);
      
      setUserStats({
        totalSteps: Number(stats.totalSteps),
        totalRewards: ethers.formatEther(stats.totalRewards),
        lastClaimTime: Number(stats.lastClaimTime),
        claimCount: Number(stats.claimCount),
        nextClaimTime: Number(stats.nextClaimTime),
      });

      // Check if can claim
      const claimStatus = await moveToEarnContract.canClaimReward(account);
      setCanClaim(claimStatus.canClaim);
      setClaimReason(claimStatus.reason);
    } catch (err) {
      console.error('Error loading user stats:', err);
    }
  };

  const loadContractBalance = async () => {
    try {
      const balance = await moveToEarnContract.getContractBalance();
      setContractBalance(ethers.formatEther(balance));
    } catch (err) {
      console.error('Error loading contract balance:', err);
    }
  };

  const handleClaimReward = async (dataId) => {
    setLoading(true);
    try {
      const tx = await moveToEarnContract.claimReward(dataId);
      await tx.wait();
      
      // Reload stats and balance
      await loadUserStats();
      
      if (htcContract && account) {
        const newBalance = await htcContract.balanceOf(account);
        if (onRewardClaimed) {
          onRewardClaimed(ethers.formatEther(newBalance));
        }
      }
    } catch (err) {
      console.error('Error claiming reward:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp || timestamp === 0) return 'Never';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeUntilNextClaim = () => {
    if (!userStats || userStats.lastClaimTime === 0) {
      return 'Ready to claim';
    }

    const now = Math.floor(Date.now() / 1000);
    const nextClaim = userStats.nextClaimTime;
    
    if (now >= nextClaim) {
      return 'Ready to claim';
    }

    const diff = nextClaim - now;
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card
      title="🏃 Move-to-Earn Rewards"
      subtitle="Earn HTC tokens by staying active"
      variant="elevated"
    >
      <div className="move-to-earn-content">
        {/* Reward Rules */}
        <div className="reward-rules">
          <h4>💡 Reward Rules</h4>
          <div className="rules-grid">
            <div className="rule-item">
              <span className="rule-icon">📊</span>
              <div>
                <p className="rule-label">Reward Rate</p>
                <p className="rule-value">10 HTC per 1000 steps</p>
              </div>
            </div>
            <div className="rule-item">
              <span className="rule-icon">🎯</span>
              <div>
                <p className="rule-label">Minimum Steps</p>
                <p className="rule-value">3,000 steps</p>
              </div>
            </div>
            <div className="rule-item">
              <span className="rule-icon">⏰</span>
              <div>
                <p className="rule-label">Claim Frequency</p>
                <p className="rule-value">Once per 24 hours</p>
              </div>
            </div>
            <div className="rule-item">
              <span className="rule-icon">🏆</span>
              <div>
                <p className="rule-label">Maximum Steps</p>
                <p className="rule-value">20,000 steps (capped)</p>
              </div>
            </div>
          </div>
        </div>

        {/* User Stats */}
        {userStats && (
          <div className="user-stats-section">
            <h4>📈 Your Statistics</h4>
            <div className="stats-grid">
              <div className="stat-card">
                <p className="stat-label">Total Steps</p>
                <p className="stat-value">{userStats.totalSteps.toLocaleString()}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Total Rewards</p>
                <p className="stat-value">{parseFloat(userStats.totalRewards).toFixed(2)} HTC</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Claims</p>
                <p className="stat-value">{userStats.claimCount}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Next Claim</p>
                <p className="stat-value">{getTimeUntilNextClaim()}</p>
              </div>
            </div>

            {userStats.lastClaimTime > 0 && (
              <p className="last-claim-info">
                Last claimed: {formatTime(userStats.lastClaimTime)}
              </p>
            )}
          </div>
        )}

        {/* Claim Status */}
        <div className={`claim-status ${canClaim ? 'can-claim' : 'cannot-claim'}`}>
          <span className="status-icon">{canClaim ? '✅' : '⏳'}</span>
          <span className="status-text">{claimReason}</span>
        </div>

        {/* Contract Balance */}
        <div className="contract-balance">
          <span>💰 Reward Pool:</span>
          <Badge variant="success">
            {parseFloat(contractBalance).toLocaleString()} HTC
          </Badge>
        </div>

        {/* Instructions */}
        <div className="instructions">
          <h4>📝 How to Earn</h4>
          <ol>
            <li>Register daily health data with your steps</li>
            <li>Wait 24 hours between claims</li>
            <li>Click "Claim Reward" button on your health data card</li>
            <li>Receive HTC tokens automatically!</li>
          </ol>
        </div>
      </div>
    </Card>
  );
}

export default MoveToEarnCard;
