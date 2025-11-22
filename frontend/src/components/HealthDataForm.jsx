// frontend/src/components/HealthDataForm.jsx
import { useState } from 'react';
import { HealthDataSimulator } from '../utils/healthDataSimulator';
import './HealthDataForm.css';
import Button from './Button';
import Input from './Input';

function HealthDataForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    steps: '',
    heartRate: '',
    sleepMinutes: '',
    calories: '',
    distance: '',
    activeMinutes: '',
    metricType: 'daily',
  });

  const [errors, setErrors] = useState([]);

  // Handle form input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Quick generate random data
  const handleGenerate = (type) => {
    let generatedData;
    
    switch(type) {
      case 'healthy':
        generatedData = HealthDataSimulator.generateHealthyProfile();
        break;
      case 'athletic':
        generatedData = HealthDataSimulator.generateAthleticProfile();
        break;
      case 'sedentary':
        generatedData = HealthDataSimulator.generateSedentaryProfile();
        break;
      case 'weekly':
        generatedData = HealthDataSimulator.generateWeeklySummary();
        break;
      case 'monthly':
        generatedData = HealthDataSimulator.generateMonthlySummary();
        break;
      default:
        generatedData = HealthDataSimulator.generateDailyData();
    }

    setFormData({
      steps: generatedData.steps.toString(),
      heartRate: generatedData.heartRate.toString(),
      sleepMinutes: generatedData.sleepMinutes.toString(),
      calories: generatedData.calories.toString(),
      distance: generatedData.distance.toString(),
      activeMinutes: generatedData.activeMinutes.toString(),
      metricType: generatedData.metricType,
    });

    setErrors([]);
  };

  // Submit form
  const handleSubmit = (e) => {
    e.preventDefault();

    // Convert to numbers
    const healthData = {
      steps: parseInt(formData.steps) || 0,
      heartRate: parseInt(formData.heartRate) || 0,
      sleepMinutes: parseInt(formData.sleepMinutes) || 0,
      calories: parseInt(formData.calories) || 0,
      distance: parseInt(formData.distance) || 0,
      activeMinutes: parseInt(formData.activeMinutes) || 0,
      metricType: formData.metricType,
      timestamp: Math.floor(Date.now() / 1000),
    };

    // Validate data
    const validation = HealthDataSimulator.validateHealthData(healthData);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    // Generate dataHash and encryptedKey
    const timestamp = Date.now();
    const dataString = JSON.stringify({
      ...healthData,
      timestamp,
      account: window.ethereum?.selectedAddress
    });
    
    // Generate a unique data hash
    const dataHash = `health_data_${timestamp}_${Math.random().toString(36).substring(7)}`;
    
    // Simulate IPFS hash for encrypted key
    const encryptedKey = `ipfs://Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

    // Include all required fields
    const completeHealthData = {
      ...healthData,
      dataHash: dataHash,
      encryptedKey: encryptedKey,
    };

    console.log('Submitting health data:', completeHealthData);

    setErrors([]);
    onSubmit(completeHealthData);
  };

  return (
    <div className="health-data-form">
      <h3>📊 Enter Health Data</h3>

      {/* Quick generate buttons */}
      <div className="quick-generate">
        <p>🎲 Quick Generate Simulated Data:</p>
        <div className="generate-buttons">
          <button type="button" onClick={() => handleGenerate('daily')} className="btn-generate">
            Random Daily
          </button>
          <button type="button" onClick={() => handleGenerate('healthy')} className="btn-generate">
            Healthy Profile
          </button>
          <button type="button" onClick={() => handleGenerate('athletic')} className="btn-generate">
            Athletic Profile
          </button>
          <button type="button" onClick={() => handleGenerate('sedentary')} className="btn-generate">
            Sedentary Profile
          </button>
          <button type="button" onClick={() => handleGenerate('weekly')} className="btn-generate">
            Weekly Summary
          </button>
          <button type="button" onClick={() => handleGenerate('monthly')} className="btn-generate">
            Monthly Summary
          </button>
        </div>
      </div>

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="error-messages">
          {errors.map((error, index) => (
            <div key={index} className="error-message">❌ {error}</div>
          ))}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <Input
            label="🚶 Steps"
            type="number"
            name="steps"
            value={formData.steps}
            onChange={handleChange}
            placeholder="e.g. 8532"
            required
            fullWidth
          />

          <Input
            label="❤️ Heart Rate (bpm)"
            type="number"
            name="heartRate"
            value={formData.heartRate}
            onChange={handleChange}
            placeholder="e.g. 72"
            required
            fullWidth
          />

          <Input
            label="😴 Sleep (minutes)"
            type="number"
            name="sleepMinutes"
            value={formData.sleepMinutes}
            onChange={handleChange}
            placeholder="e.g. 450 (7.5 hrs)"
            required
            fullWidth
          />

          <Input
            label="🔥 Calories"
            type="number"
            name="calories"
            value={formData.calories}
            onChange={handleChange}
            placeholder="e.g. 2340"
            required
            fullWidth
          />

          <Input
            label="📏 Distance (meters)"
            type="number"
            name="distance"
            value={formData.distance}
            onChange={handleChange}
            placeholder="e.g. 6500"
            required
            fullWidth
          />

          <Input
            label="⏱️ Active Time (minutes)"
            type="number"
            name="activeMinutes"
            value={formData.activeMinutes}
            onChange={handleChange}
            placeholder="e.g. 90"
            required
            fullWidth
          />
        </div>

        <div className="form-field">
          <label>📅 Data Type</label>
          <select
            name="metricType"
            value={formData.metricType}
            onChange={handleChange}
            required
          >
            <option value="daily">Daily Report</option>
            <option value="weekly">Weekly Summary</option>
            <option value="monthly">Monthly Summary</option>
          </select>
        </div>

        <div className="form-actions">
          <Button type="submit" variant="primary">
            ✅ Register Health Data
          </Button>
          {onCancel && (
            <Button type="button" onClick={onCancel} variant="outline">
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

export default HealthDataForm;
