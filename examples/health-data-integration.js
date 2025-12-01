// Health Data Integration Example
// Demonstrates combining on-chain DataHash with offline SQLite storage

const { ethers } = require('ethers');
const axios = require('axios');

class HealthDataIntegration {
    constructor(contractAddress, contractABI, backendUrl = 'http://localhost:3001/api') {
        this.backendUrl = backendUrl;
        this.contractAddress = contractAddress;
        this.contractABI = contractABI;
        this.provider = null;
        this.contract = null;
        this.wallet = null;
    }

    // Initialize Ethereum connection
    async initializeEthereum(privateKey, rpcUrl = 'http://localhost:8545') {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.contract = new ethers.Contract(this.contractAddress, this.contractABI, this.wallet);
        console.log('✅ Ethereum connection initialized');
    }

    // Set authentication token
    setAuthToken(token) {
        this.authToken = token;
        console.log('✅ Authentication token set');
    }

    // Generate DataHash for health data (consistent with backend)
    generateDataHash(healthData) {
        const crypto = require('crypto');
        return crypto.createHash('sha256')
            .update(JSON.stringify({
                userId: healthData.userId,
                dataType: healthData.dataType,
                actualData: healthData.actualData,
                timestamp: healthData.timestamp || Date.now()
            }))
            .digest('hex');
    }

    // Complete data storage flow: offline storage + on-chain registration
    async storeHealthDataWithBlockchain(healthData) {
        try {
            console.log('🚀 Starting health data storage process...');
            
            // 1. Generate DataHash
            const dataHash = this.generateDataHash(healthData);
            console.log('📊 Generated DataHash:', dataHash);

            // 2. Store actual health data offline to SQLite
            const offlineResult = await this.storeOfflineHealthData({
                dataType: healthData.dataType,
                actualData: healthData.actualData,
                metadata: healthData.metadata
            });
            console.log('💾 Offline storage completed:', offlineResult.message);

            // 3. Register DataHash on-chain
            const tx = await this.contract.registerData(
                '0x' + dataHash, // Convert to bytes32 format
                healthData.dataType,
                healthData.uri || ''
            );
            
            const receipt = await tx.wait();
            console.log('⛓️  Blockchain registration completed:', receipt.transactionHash);

            // 4. Extract dataId from event
            const dataRegisteredEvent = receipt.logs.find(log => 
                log.fragment && log.fragment.name === 'DataRegistered'
            );
            
            const dataId = dataRegisteredEvent ? dataRegisteredEvent.args[0] : null;
            
            return {
                success: true,
                dataHash: dataHash,
                dataId: dataId.toString(),
                transactionHash: receipt.transactionHash,
                offlineStorageId: offlineResult.dataId
            };
            
        } catch (error) {
            console.error('❌ Health data storage failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Store health data offline
    async storeOfflineHealthData(healthData) {
        const response = await axios.post(
            `${this.backendUrl}/health-data/store`,
            healthData,
            {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    }

    // Retrieve complete data by DataHash
    async retrieveHealthData(dataHash) {
        try {
            console.log('🔍 Retrieving health data for hash:', dataHash);
            
            // 1. Get data record from chain
            const chainData = await this.contract.records(dataHash);
            console.log('⛓️  Chain data retrieved:', {
                provider: chainData.provider,
                dataType: chainData.dataType,
                uri: chainData.uri,
                createdAt: new Date(chainData.createdAt * 1000).toISOString()
            });

            // 2. Get actual data from offline storage
            const offlineData = await this.retrieveOfflineHealthData(dataHash);
            console.log('💾 Offline data retrieved:', {
                dataType: offlineData.dataType,
                actualData: offlineData.actualData,
                integrityValid: offlineData.integrityValid
            });

            // 3. Verify data integrity
            const verification = await this.verifyHealthDataIntegrity({
                dataHash: dataHash,
                dataType: offlineData.dataType,
                actualData: offlineData.actualData
            });
            console.log('✅ Data integrity verification:', verification.integrityValid);

            return {
                chainData: {
                    provider: chainData.provider,
                    dataHash: dataHash,
                    dataType: chainData.dataType,
                    uri: chainData.uri,
                    createdAt: chainData.createdAt
                },
                offlineData: offlineData,
                verification: verification,
                isComplete: chainData.provider !== ethers.ZeroAddress && verification.integrityValid
            };
            
        } catch (error) {
            console.error('❌ Health data retrieval failed:', error);
            throw error;
        }
    }

    // Retrieve health data from offline storage
    async retrieveOfflineHealthData(dataHash) {
        const response = await axios.get(
            `${this.backendUrl}/health-data/${dataHash}`,
            {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            }
        );
        return response.data;
    }

    // Verify data integrity
    async verifyHealthDataIntegrity(verificationData) {
        const response = await axios.post(
            `${this.backendUrl}/health-data/verify`,
            verificationData,
            {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    }

    // Get all user health data
    async getUserHealthData(options = {}) {
        const params = new URLSearchParams({
            page: options.page || '1',
            limit: options.limit || '20'
        });
        
        if (options.dataType) {
            params.append('dataType', options.dataType);
        }

        const response = await axios.get(
            `${this.backendUrl}/health-data?${params.toString()}`,
            {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            }
        );
        return response.data;
    }

    // Batch verify user data integrity
    async batchVerifyUserData() {
        try {
            console.log('🔍 Starting batch data verification...');
            
            // Get all user offline data
            const userData = await this.getUserHealthData({ limit: 100 });
            console.log(`📊 Found ${userData.data.length} health data records`);

            const verificationResults = [];
            
            for (const data of userData.data) {
                try {
                    // Verify on-chain existence
                    const chainData = await this.contract.records(data.dataHash);
                    const existsOnChain = chainData.provider !== ethers.ZeroAddress;
                    
                    // Verify data integrity
                    const integrityCheck = await this.verifyHealthDataIntegrity({
                        dataHash: data.dataHash,
                        dataType: data.dataType,
                        actualData: data.actualData
                    });

                    verificationResults.push({
                        dataHash: data.dataHash,
                        dataType: data.dataType,
                        existsOnChain: existsOnChain,
                        integrityValid: integrityCheck.integrityValid,
                        timestamp: data.createdAt
                    });
                    
                } catch (error) {
                    console.error(`❌ Verification failed for ${data.dataHash}:`, error.message);
                    verificationResults.push({
                        dataHash: data.dataHash,
                        dataType: data.dataType,
                        existsOnChain: false,
                        integrityValid: false,
                        error: error.message
                    });
                }
            }

            const validCount = verificationResults.filter(r => r.existsOnChain && r.integrityValid).length;
            console.log(`✅ Batch verification completed: ${validCount}/${verificationResults.length} records valid`);

            return verificationResults;
            
        } catch (error) {
            console.error('❌ Batch verification failed:', error);
            throw error;
        }
    }
}

// Usage example
async function demonstrateIntegration() {
    console.log('🏥 Health Data Integration Demo\n');

    // Initialize integration instance
    const integration = new HealthDataIntegration(
        '0xYourContractAddress', // Replace with actual contract address
        require('../artifacts/contracts/DataRegistry.sol/DataRegistry.json').abi
    );

    // Set authentication token (need to login first)
    integration.setAuthToken('your-jwt-token-here');

    // Initialize Ethereum connection
    await integration.initializeEthereum('your-private-key-here');

    // Sample health data
    const sampleHealthData = {
        userId: 1,
        dataType: 'daily_metrics',
        actualData: {
            steps: 8532,
            heartRate: 72,
            sleepMinutes: 420,
            calories: 2150,
            distance: 6.8,
            activeMinutes: 65
        },
        metadata: {
            device: 'Fitbit Charge 5',
            syncTime: new Date().toISOString(),
            qualityScore: 95
        },
        uri: 'ipfs://QmExampleHealthData'
    };

    // 1. Store health data
    console.log('\n1. Storing Health Data...');
    const storageResult = await integration.storeHealthDataWithBlockchain(sampleHealthData);
    console.log('Storage Result:', storageResult);

    if (storageResult.success) {
        // 2. Retrieve health data
        console.log('\n2. Retrieving Health Data...');
        const retrievedData = await integration.retrieveHealthData(storageResult.dataHash);
        console.log('Retrieved Data:', JSON.stringify(retrievedData, null, 2));

        // 3. Batch verification
        console.log('\n3. Batch Verification...');
        const batchResults = await integration.batchVerifyUserData();
        console.log('Batch Results:', batchResults);
    }

    console.log('\n🎉 Demo completed successfully!');
}

// Export for use by other modules
module.exports = HealthDataIntegration;

// If running this file directly, execute demo
if (require.main === module) {
    demonstrateIntegration().catch(console.error);
}