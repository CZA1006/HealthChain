// src/utils/crypto.js
// 加密工具：使用 Web Crypto PBKDF2 做密码派生（加盐哈希）
export async function generateSalt(length = 16) {
    const salt = crypto.getRandomValues(new Uint8Array(length));
    return bufferToBase64(salt);
}

async function importPasswordKey(password) {
    const enc = new TextEncoder();
    return crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );
}

function bufferToBase64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuffer(b64) {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

export async function hashPassword(password, saltBase64, iterations = 100000, keyLen = 32) {
    const salt = base64ToBuffer(saltBase64);
    const key = await importPasswordKey(password);
    const derived = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt,
            iterations,
            hash: 'SHA-256'
        },
        key,
        keyLen * 8
    );
    return bufferToBase64(derived);
}

export async function verifyPassword(password, saltBase64, expectedHashBase64, iterations = 100000, keyLen = 32) {
    const h = await hashPassword(password, saltBase64, iterations, keyLen);
    // 简单比较：基于字符串，时间恒定对比可在后端实现
    return h === expectedHashBase64;
}
