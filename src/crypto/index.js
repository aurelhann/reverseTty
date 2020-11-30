const cryptoEngines = require('./cryptoEngines.js');
const cryptoTools = require('./cryptoTools.js');


class Crypto {
    static get cryptoEngines() { return cryptoEngines; }

    static get cryptoTools() { return cryptoTools; }
}

module.exports = Crypto;
