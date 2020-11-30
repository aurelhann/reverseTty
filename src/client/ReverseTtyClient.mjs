/* eslint-disable no-undef, import/no-extraneous-dependencies */
import WebSocket from 'ws';
import os from 'os';
import pty from 'node-pty';
import WebService from './ws';
import Settings from '../settings.js';
import Logger from'../logger.js';
import Auth from './Auth.mjs';

const randomUID = Math.floor(Math.random() * 1000000000);

class ReverseTtyClient {
    constructor(connectTimeout = 30000, testSettings) {
        this.connectTimeout = connectTimeout;
        this.settings = testSettings || new Settings().tryReadSettings();
        this.CONNECTION_CLOSE_CODE = 1000;
        this.HEARTBEAT_RATE = 40000;

        // inject global function for logging
        global.logger = Logger(this.settings.winston);

        this.auth = new Auth();

        this.edgeSettings = this.readEdgeSettings();
        this.webRequest = new WebService({ type: 'none' }, (mess) => {
            logger.debug(`Error in webservice request : ${mess}`);
        });

        this.mainUrl = this.settings.client.url + '/' + this.edgeSettings.productId;
    }

    async start() {
        this.startWatchDog();
        return this.createClient();
    }

    heartbeat() {
        clearTimeout(this.pingTimeout);

        this.pingTimeout = setTimeout(() => {
            try {
                this.close();
            } catch (err) {
                logger.error(err);
            }
        }, this.HEARTBEAT_RATE);
    }

    closeWs() {
        if (this.ws) {
            this.ws.close();
            this.ws.terminate();
            this.ws = undefined;
        }
    }

    async createClient() {
        await this.auth.getJWTToken();

        this.closeWs();

        return new Promise((res, rej) => {
            this.ws = new WebSocket(this.mainUrl, [], {
                headers: {
                    'Authorization': `Bearer ${this.auth.JWT}`
                }
            });
            let ptyProcess;

            this.ws.on('open', () => {
                logger.info(`Connected to ${this.mainUrl}`);
                this.heartbeat();

                // now pipe to a new tty
                const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

                ptyProcess = pty.spawn(shell, [], {
                    name: 'xterm-color',
                    cols: 80,
                    rows: 30,
                    cwd: process.env.HOME,
                    env: process.env
                });

                ptyProcess.on('data', function(data) {
                    //process.stdout.write(data);
                    this.ws.send(data);
                });

                // ptyProcess.write('ls\r');
                // ptyProcess.resize(100, 40);
                // ptyProcess.write('ls\r');

                res();
            });

            this.ws.on('error', (err) => {
                logger.error(`Error ${err}`);
            });


            this.ws.on('ping', () => {
                this.heartbeat();
                logger.trace('Ping received');
            });

            this.ws.on('close', (code) => {
                logger.warn(`Web socket close ${code}`);
                clearTimeout(this.pingTimeout);
                this.closeWs();
                if (code !== this.CONNECTION_CLOSE_CODE) this.setReconnection();
                rej(code);
            });

            this.ws.on('data', async (data) =>{
                ptyProcess.write(data);
            })

            // this.ws.on('message', async (data) => {
            //     logger.debug(`A data has just received ${data}`);
            //     const resp = await this.receiveMessage(data).catch(err => logger.error(err));
            //
            //     // for infinite loop command execution
            //     // TODO find a better way to solve this pb
            //     if (resp) {
            //         resp.sign = '';
            //     }
            //
            //     const message = JSON.stringify(resp);
            //     this.ws.send(message);
            // });
        }).catch(err => {
            logger.error(`Error to connect websocket ${err} trying rescue mode`);
        });
    }

    startWatchDog() {
        this.connectionWatchDog = setInterval(() => {
            try {
                if (
                    (!this.watchDog)
                    && (!this.ws || this.ws.readyState === WebSocket.CLOSED)
                ) {
                    logger.debug('Restart websocket');
                    this.createClient().catch(err => {
                        logger.error(err);
                    });
                }
            } catch (err) {
                logger.error(err);
            }
        }, 30000);
    }

    /**
     * @description Read IoT-Server settings.js file
     * @returns {Object.<string:any>}
     * @memberof BraincubeConnection
     */
    readEdgeSettings() {
        let tempSetting;
        try {
            const filePath = this.settings.commands.edgeFileLocation;
            this.cleanRequire(filePath);
            // eslint-disable-next-line import/no-dynamic-require
            tempSetting = require(filePath);
        } catch (err) {
            logger.error(err);
        }
        return this.getUsedPlatformSettings(tempSetting);
    }

    async setReconnection() {
        clearTimeout(this.watchDog);
        this.watchDog = setTimeout(() => {
            this.createClient().catch(err => {
                logger.error(err);
            });
        }, this.connectTimeout);
    }

    async close() {
        // we close gently the connection with a custom return code
        return new Promise((res, rej) => {
            clearTimeout(this.pingTimeout);
            clearTimeout(this.watchDog);
            clearInterval(this.connectionWatchDog);
            if (this.ws) {
                this.ws.close(this.CONNECTION_CLOSE_CODE);
            }
            setTimeout(() => {
                try {
                    clearTimeout(this.pingTimeout);
                    clearTimeout(this.watchDog);
                    clearInterval(this.connectionWatchDog);
                    if (this.ws && this.ws.readyState === 3) {
                        res();
                    } else if (this.ws) {
                        logger.error('Abnormal closing ws. Now we kill him!');
                        this.closeWs();
                        res();
                    } else {
                        this.closeWs();
                        res();
                    }
                } catch (err) {
                    this.ws = null;
                    logger.error(err);
                    rej(err);
                }
            }, 3000);
        });
    }
}


export default ReverseTtyClient;
