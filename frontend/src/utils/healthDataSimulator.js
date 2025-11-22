// frontend/src/utils/healthDataSimulator.js
// Health Data Simulator

export class HealthDataSimulator {
  // Generate random daily health data
  static generateDailyData(date = new Date()) {
    return {
      steps: this.randomInt(3000, 15000),
      heartRate: this.randomInt(60, 100),
      sleepMinutes: this.randomInt(360, 540), // 6-9 hours
      calories: this.randomInt(1800, 3500),
      distance: this.randomInt(2000, 12000), // meters
      activeMinutes: this.randomInt(30, 180),
      metricType: "daily",
      timestamp: Math.floor(date.getTime() / 1000),
    };
  }

  // Generate weekly data
  static generateWeeklyData() {
    const weekData = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      weekData.push(this.generateDailyData(date));
    }
    
    return weekData;
  }

  // Generate weekly summary
  static generateWeeklySummary() {
    const weekData = this.generateWeeklyData();
    
    return {
      steps: weekData.reduce((sum, day) => sum + day.steps, 0),
      heartRate: Math.round(weekData.reduce((sum, day) => sum + day.heartRate, 0) / 7),
      sleepMinutes: weekData.reduce((sum, day) => sum + day.sleepMinutes, 0),
      calories: weekData.reduce((sum, day) => sum + day.calories, 0),
      distance: weekData.reduce((sum, day) => sum + day.distance, 0),
      activeMinutes: weekData.reduce((sum, day) => sum + day.activeMinutes, 0),
      metricType: "weekly",
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  // Generate monthly summary
  static generateMonthlySummary() {
    const daysInMonth = 30;
    let totalSteps = 0;
    let totalHeartRate = 0;
    let totalSleep = 0;
    let totalCalories = 0;
    let totalDistance = 0;
    let totalActiveMinutes = 0;

    for (let i = 0; i < daysInMonth; i++) {
      const dayData = this.generateDailyData();
      totalSteps += dayData.steps;
      totalHeartRate += dayData.heartRate;
      totalSleep += dayData.sleepMinutes;
      totalCalories += dayData.calories;
      totalDistance += dayData.distance;
      totalActiveMinutes += dayData.activeMinutes;
    }

    return {
      steps: totalSteps,
      heartRate: Math.round(totalHeartRate / daysInMonth),
      sleepMinutes: totalSleep,
      calories: totalCalories,
      distance: totalDistance,
      activeMinutes: totalActiveMinutes,
      metricType: "monthly",
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  // Generate healthy profile
  static generateHealthyProfile() {
    return {
      steps: this.randomInt(10000, 15000),
      heartRate: this.randomInt(60, 75),
      sleepMinutes: this.randomInt(420, 540), // 7-9 hours
      calories: this.randomInt(2000, 2500),
      distance: this.randomInt(8000, 12000),
      activeMinutes: this.randomInt(60, 120),
      metricType: "daily",
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  // Generate athletic profile
  static generateAthleticProfile() {
    return {
      steps: this.randomInt(15000, 25000),
      heartRate: this.randomInt(50, 70),
      sleepMinutes: this.randomInt(480, 600), // 8-10 hours
      calories: this.randomInt(3000, 4500),
      distance: this.randomInt(12000, 20000),
      activeMinutes: this.randomInt(120, 240),
      metricType: "daily",
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  // Generate sedentary profile
  static generateSedentaryProfile() {
    return {
      steps: this.randomInt(1000, 5000),
      heartRate: this.randomInt(70, 90),
      sleepMinutes: this.randomInt(300, 420), // 5-7 hours
      calories: this.randomInt(1500, 2200),
      distance: this.randomInt(500, 3000),
      activeMinutes: this.randomInt(10, 60),
      metricType: "daily",
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  // Utility: generate random integer
  static randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Format health data for display
  static formatHealthData(data) {
    return {
      ...data,
      stepsFormatted: data.steps.toLocaleString(),
      heartRateFormatted: `${data.heartRate} bpm`,
      sleepHoursFormatted: `${(data.sleepMinutes / 60).toFixed(1)} hrs`,
      caloriesFormatted: data.calories.toLocaleString(),
      distanceFormatted: `${(data.distance / 1000).toFixed(2)} km`,
      activeMinutesFormatted: `${data.activeMinutes} min`,
    };
  }

  // Validate health data
  static validateHealthData(data) {
    const errors = [];

    if (data.steps < 0 || data.steps > 100000) {
      errors.push("Steps out of range (0-100,000)");
    }
    if (data.heartRate < 40 || data.heartRate > 200) {
      errors.push("Heart rate out of range (40-200 bpm)");
    }
    if (data.sleepMinutes < 0 || data.sleepMinutes > 1440) {
      errors.push("Sleep time out of range (0-24 hours)");
    }
    if (data.calories < 0 || data.calories > 10000) {
      errors.push("Calories out of range (0-10,000)");
    }
    if (data.distance < 0 || data.distance > 100000) {
      errors.push("Distance out of range (0-100 km)");
    }
    if (data.activeMinutes < 0 || data.activeMinutes > 1440) {
      errors.push("Active time out of range (0-24 hours)");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Generate data hash for blockchain
  static generateDataHash(data) {
    const dataString = JSON.stringify({
      steps: data.steps,
      heartRate: data.heartRate,
      sleepMinutes: data.sleepMinutes,
      calories: data.calories,
      distance: data.distance,
      activeMinutes: data.activeMinutes,
      metricType: data.metricType,
      timestamp: data.timestamp,
    });
    return dataString;
  }
}
