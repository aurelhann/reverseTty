const crypto = require('crypto');
const fs = require('fs');

class CryptoTool {
    /**
     * Get the current SHA256 of a binary
     * @param path of the binary to hash
     * @returns {a|PromiseLike<ArrayBuffer>}
     */
    static getHashBinary(path) {
        const shasum = crypto.createHash('sha256');
        const binaryContent = fs.readFileSync(path);
        shasum.update(binaryContent);
        return shasum.digest('hex');
    }

    /**
     * Get the Public PEM format from a base64 key
     * @param base64Key the key encoded in base64
     * @returns {string} the PEM key
     */
    static getPublicPEMFormat(base64Key) {
        return `-----BEGIN PUBLIC KEY-----\n${base64Key}\n-----END PUBLIC KEY-----`;
    }

    /**
     * Get the Private PEM format from a base64 key
     * @param base64Key the key encoded in base64
     * @returns {string} the PEM key
     */
    static getPrivatePEMFormat(base64Key) {
        return `-----BEGIN PRIVATE KEY-----\n${base64Key}\n-----END PRIVATE KEY-----`;
    }
}

module.exports = CryptoTool;
