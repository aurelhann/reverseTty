/* eslint-disable no-undef */
const crypto = require('crypto');
const fs = require('fs');
const cryptoTools = require('./cryptoTools.js');

const PATH_TO_PUBK = '/etc/usb-agent/publicServer.pem';
// The Public server key encryption
// eslint-disable-next-line max-len
let IOT_PUBLIC_KEY_PEM = cryptoTools.getPublicPEMFormat('MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAu8oncMOOta2jdmFeYYKYloZif9f0elq7uDXTKfHLI3ll92Slo401T3uS4+EU/rZiaDRVlhXJYVNy97awxxH4A+RlvWZ/Ey71DBubvHtze7akvsSWEGqQEQMzvLmDgUEC+PLYbgMbvCN01VbnZHB3nF54fbQHBs6ojZyr4GW2roDohL/H3qFWRRD2Hszrj79U2K786ddMFYHaz+Ttu6ZJCdQafol0quyWh+wSlCQFnE8Zpejsq7LQEHDiaAJqFbUpTs5PjRyoYtyUE5OlEnFxxdBS+8UpP58Ry94ZbGh7jJGbua94W2HXVKrJ12dtmM6wsVhtzdJx+3wNnRIhequ/kyTeFgq9zTwzbHL90r1Wkgj4QE5zVso5fmri3A1MzXnkfGNaZkFLjLZ/4ncMuftqVx4p36X7dzcqj0STlcUmlL6F0wXFPhFpnS1Gj+L7V4/y679PV2jrmBsH2XYkPSbpKQ2hHH+jBwID4dVBywwSREzB8pxfW8CSnsXSZrH3uzZzKwfOaRiSKZHUrR6/79kDmBmHQy79CiQfsOKBUQxtSmN9Dd2HNpKyEpDhF6QsjJ+JYpHsNmfgXtipudpQW3NAt55KhLUC323FKfmXsQfLZAxqU6SVVZOHhsqNE/r6nP7wCEvtTjdvhnuQdotZ82QGzHTchpIR6IIf30riXMS2vccCAwEAAQ==');
try {
    IOT_PUBLIC_KEY_PEM = fs.readFileSync(PATH_TO_PUBK);
} catch (err) {
    // nothing to log here
}

const AES_ALGO = 'aes-256-ctr';
const AES_VECTOR = Buffer.from([
    0x03, 0xce, 0xc1, 0x26, 0x87, 0xf5, 0xa5, 0xa6, 0xa3, 0x30, 0xed, 0x2c, 0x5e, 0xad, 0x35, 0x86
]);
// const IV_LENGTH = 32; // For AES, this is always 16 for the vector and 32 for the key (secret)
const AES_SECRET = Buffer.from([
    0x63, 0x11, 0x56, 0xe4, 0xfd, 0x07, 0x7d, 0xd3, 0xb0, 0x53, 0xab, 0xb2, 0xcf, 0x4c, 0x33, 0xdc,
    0x0c, 0xf6, 0x39, 0x9f, 0xee, 0x03, 0xd9, 0x86, 0x35, 0x5b, 0x16, 0xb8, 0x50, 0xf2, 0x73, 0x46
]);

class CryptoEngine {
    /**
     * Own implementation of an RSA engine for decrypt/encrypt any buffer of any length
     * @param encrypt True if encrypt
     * @param keyPEM Private/Public key in PEM format
     * @param datas Buffer to encrypt/decrypt
     * @param keySize Size of the RSA key
     * @returns {Buffer} encrypted / decrypted buffer
     * @constructor
     */
    static MyHyperGrowthRSAEngine(encrypt, keyPEM = IOT_PUBLIC_KEY_PEM, datas, keySize = 4096) {
        const RsaBlockSize = keySize / 8;
        const RsaPayloadBlock = RsaBlockSize - 11;

        // Check if it's public or private key
        let isPublic = false;
        if (keyPEM.includes('PUBLIC')) {
            isPublic = true;
        }

        // Verify datas type beffor compute it
        if (!Buffer.isBuffer(datas)) {
            throw Error('Wrong data type for data encrypt/decrypt');
        }

        // set constants variable
        const CRYPTO_OPTIONS = { key: keyPEM, padding: crypto.constants.RSA_PKCS1_PADDING };
        const blockSize = (encrypt) ? RsaPayloadBlock : RsaBlockSize;
        const length = datas.length;
        let jsonBytes = Buffer.alloc(1);

        // we compute it by block size and fill output buffer
        for (var i = 0; i < length; i += blockSize) {
            var currentSize = Math.min(blockSize, length - i);
            let flagBuf;
            // choose the right interface to encrypt / decrypt
            if (isPublic && encrypt) {
                flagBuf = crypto.publicEncrypt(CRYPTO_OPTIONS, datas.slice(i, i + currentSize));
            } else if (!isPublic && encrypt) {
                flagBuf = crypto.privateEncrypt(CRYPTO_OPTIONS, datas.slice(i, i + currentSize));
            } else if (!isPublic && !encrypt) {
                flagBuf = crypto.privateDecrypt(CRYPTO_OPTIONS, datas.slice(i, i + currentSize));
            } else if (isPublic && !encrypt) {
                flagBuf = crypto.publicDecrypt(CRYPTO_OPTIONS, datas.slice(i, i + currentSize));
            } else {
                throw Error('Error in crypto engine');
            }
            jsonBytes = Buffer.concat([jsonBytes, flagBuf], flagBuf.length + jsonBytes.length);
        }
        return jsonBytes.slice(1, jsonBytes.length);
    }


    /**
     * @param {string} text - Content we want to encrypt (UTF-8)
     * @returns {string} - Content encrypted and hex-encoded
     */
    static encryptAES(text) {
        const cipher = crypto.createCipheriv(AES_ALGO, AES_SECRET, AES_VECTOR);
        let crypted = cipher.update(text, 'utf8', 'hex');
        crypted += cipher.final('hex');
        return crypted;
    }

    /**
     * @param {string} crypted - Content we want to decrypt (AES Hex-encoded)
     * @returns {string} - Decrypted content in UTF-8
     */
    static decryptAES(crypted) {
        const decipher = crypto.createDecipheriv(AES_ALGO, AES_SECRET, AES_VECTOR);
        let dec = decipher.update(crypted, 'hex', 'utf8');
        dec += decipher.final('utf8');
        return dec;
    }
}

module.exports = CryptoEngine;
