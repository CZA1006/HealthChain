// frontend/src/components/HealthDataCard.jsx
import React from 'react';
import { HealthDataSimulator } from '../utils/healthDataSimulator';
import Badge from './Badge';
import './HealthDataCard.css';

function HealthDataCard({ 
  data, 
  dataId, 
  showActions = false, 
  onList, 
  onDelete,
  onClaimReward,
  canClaimReward = false,
  claimLoading = false,
  alreadyClaimed = false
}) {
  const formatted = HealthDataSimulator.formatHealthData(data);

  // Calculate potential reward based on steps
  const calculatePotentialReward = () => {
    const steps = parseInt(data.steps) || 0;
    
    if (steps < 3000) {
      return { amount: 0, message: 'Need 3,000+ steps' };
    }
    
    if (steps > 20000) {
      return { amount: 200, message: 'Max reward (20K steps)' };
    }
    
    const reward = Math.floor(steps / 1000) * 10;
    return { amount: reward, message: `${reward} HTC available` };
  };

  const potentialReward = calculatePotentialReward();

  // Get badge variant based on metric type
  const getTypeVariant = (type) => {
    switch (type) {
      case 'daily':
        return 'primary';
      case 'weekly':
        return 'success';
      case 'monthly':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Format timestamp
  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="health-data-card">
      <div className="health-card-header">
        <div className="health-card-title">
          <h4>Health Data #{dataId}</h4>
          <Badge variant={getTypeVariant(data.metricType)}>
            {data.metricType.toUpperCase()}
          </Badge>
        </div>
        {data.timestamp && (
          <p className="health-card-date">
            📅 {formatDate(data.timestamp)}
          </p>
        )}
      </div>

      {/* Potential Reward Display */}
      {showActions && potentialReward.amount > 0 && (
        <div className="potential-reward">
          <div className="reward-icon">🎁</div>
          <div className="reward-text">
            <p className="reward-label">Move-to-Earn Reward</p>
            <p className="reward-amount">{potentialReward.message}</p>
          </div>
        </div>
      )}

      <div className="health-metrics-grid">
        <div className="metric-item">
          <div className="metric-icon">🚶</div>
          <div className="metric-content">
            <p className="metric-label">Steps</p>
            <p className="metric-value">{formatted.stepsFormatted}</p>
          </div>
        </div>

        <div className="metric-item">
          <div className="metric-icon">❤️</div>
          <div className="metric-content">
            <p className="metric-label">Heart Rate</p>
            <p className="metric-value">{formatted.heartRateFormatted}</p>
          </div>
        </div>

        <div className="metric-item">
          <div className="metric-icon">😴</div>
          <div className="metric-content">
            <p className="metric-label">Sleep</p>
            <p className="metric-value">{formatted.sleepHoursFormatted}</p>
          </div>
        </div>

        <div className="metric-item">
          <div className="metric-icon">🔥</div>
          <div className="metric-content">
            <p className="metric-label">Calories</p>
            <p className="metric-value">{formatted.caloriesFormatted}</p>
          </div>
        </div>

        <div className="metric-item">
          <div className="metric-icon">📏</div>
          <div className="metric-content">
            <p className="metric-label">Distance</p>
            <p className="metric-value">{formatted.distanceFormatted}</p>
          </div>
        </div>

        <div className="metric-item">
          <div className="metric-icon">⏱️</div>
          <div className="metric-content">
            <p className="metric-label">Active Time</p>
            <p className="metric-value">{formatted.activeMinutesFormatted}</p>
          </div>
        </div>
      </div>

      {showActions && (
        <div className="health-card-actions">
          {/* Claim Reward Button */}
          {onClaimReward && potentialReward.amount > 0 && (
            <button 
              onClick={() => onClaimReward(dataId)} 
              className={`action-btn action-btn-reward ${!canClaimReward || claimLoading || alreadyClaimed ? 'disabled' : ''}`}
              disabled={!canClaimReward || claimLoading || alreadyClaimed}
            >
              {claimLoading ? (
                <>⏳ Claiming...</>
              ) : alreadyClaimed ? (
                <>✅ Claimed</>
              ) : canClaimReward ? (
                <>🎁 Claim Reward</>
              ) : (
                <>⏰ Cooldown Active</>
              )}
            </button>
          )}
          
          {onList && (
            <button onClick={() => onList(dataId)} className="action-btn action-btn-primary">
              📝 List on Marketplace
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(dataId)} className="action-btn action-btn-danger">
              🗑️ Delete Data
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default HealthDataCard;
