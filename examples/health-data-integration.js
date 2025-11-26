// Health Data Integration Example
// 演示链上DataHash与离线SQLite存储的结合使用

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

    // 初始化以太坊连接
    async initializeEthereum(privateKey, rpcUrl = 'http://localhost:8545') {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.contract = new ethers.Contract(this.contractAddress, this.contractABI, this.wallet);
        console.log('✅ Ethereum connection initialized');
    }

    // 设置认证token
    setAuthToken(token) {
        this.authToken = token;
        console.log('✅ Authentication token set');
    }

    // 生成健康数据的DataHash（与后端保持一致）
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

    // 完整的数据存储流程：离线存储 + 链上注册
    async storeHealthDataWithBlockchain(healthData) {
        try {
            console.log('🚀 Starting health data storage process...');
            
            // 1. 生成DataHash
            const dataHash = this.generateDataHash(healthData);
            console.log('📊 Generated DataHash:', dataHash);

            // 2. 离线存储实际健康数据到SQLite
            const offlineResult = await this.storeOfflineHealthData({
                dataType: healthData.dataType,
                actualData: healthData.actualData,
                metadata: healthData.metadata
            });
            console.log('💾 Offline storage completed:', offlineResult.message);

            // 3. 链上注册DataHash
            const tx = await this.contract.registerData(
                '0x' + dataHash, // 转换为bytes32格式
                healthData.dataType,
                healthData.uri || ''
            );
            
            const receipt = await tx.wait();
            console.log('⛓️  Blockchain registration completed:', receipt.transactionHash);

            // 4. 从事件中提取dataId
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

    // 离线存储健康数据
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

    // 根据DataHash检索完整数据
    async retrieveHealthData(dataHash) {
        try {
            console.log('🔍 Retrieving health data for hash:', dataHash);
            
            // 1. 从链上获取数据记录
            const chainData = await this.contract.records(dataHash);
            console.log('⛓️  Chain data retrieved:', {
                provider: chainData.provider,
                dataType: chainData.dataType,
                uri: chainData.uri,
                createdAt: new Date(chainData.createdAt * 1000).toISOString()
            });

            // 2. 从离线存储获取实际数据
            const offlineData = await this.retrieveOfflineHealthData(dataHash);
            console.log('💾 Offline data retrieved:', {
                dataType: offlineData.dataType,
                actualData: offlineData.actualData,
                integrityValid: offlineData.integrityValid
            });

            // 3. 验证数据完整性
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

    // 从离线存储检索健康数据
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

    // 验证数据完整性
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

    // 获取用户的所有健康数据
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

    // 批量验证用户数据完整性
    async batchVerifyUserData() {
        try {
            console.log('🔍 Starting batch data verification...');
            
            // 获取用户的所有离线数据
            const userData = await this.getUserHealthData({ limit: 100 });
            console.log(`📊 Found ${userData.data.length} health data records`);

            const verificationResults = [];
            
            for (const data of userData.data) {
                try {
                    // 验证链上存在性
                    const chainData = await this.contract.records(data.dataHash);
                    const existsOnChain = chainData.provider !== ethers.ZeroAddress;
                    
                    // 验证数据完整性
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

// 使用示例
async function demonstrateIntegration() {
    console.log('🏥 Health Data Integration Demo\n');

    // 初始化集成实例
    const integration = new HealthDataIntegration(
        '0xYourContractAddress', // 替换为实际的合约地址
        require('../artifacts/contracts/DataRegistry.sol/DataRegistry.json').abi
    );

    // 设置认证token（需要先登录获取）
    integration.setAuthToken('your-jwt-token-here');

    // 初始化以太坊连接
    await integration.initializeEthereum('your-private-key-here');

    // 示例健康数据
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

    // 1. 存储健康数据
    console.log('\n1. Storing Health Data...');
    const storageResult = await integration.storeHealthDataWithBlockchain(sampleHealthData);
    console.log('Storage Result:', storageResult);

    if (storageResult.success) {
        // 2. 检索健康数据
        console.log('\n2. Retrieving Health Data...');
        const retrievedData = await integration.retrieveHealthData(storageResult.dataHash);
        console.log('Retrieved Data:', JSON.stringify(retrievedData, null, 2));

        // 3. 批量验证
        console.log('\n3. Batch Verification...');
        const batchResults = await integration.batchVerifyUserData();
        console.log('Batch Results:', batchResults);
    }

    console.log('\n🎉 Demo completed successfully!');
}

// 导出供其他模块使用
module.exports = HealthDataIntegration;

// 如果直接运行此文件，执行演示
if (require.main === module) {
    demonstrateIntegration().catch(console.error);
}