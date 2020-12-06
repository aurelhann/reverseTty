/* eslint-disable no-undef, import/no-extraneous-dependencies */
import WebSocket from 'ws';
import os from 'os';
import pty from 'node-pty';
import WebService from './ws.mjs';
import Settings from '../settings.mjs';
import Logger from'../logger.mjs';
import Auth from './Auth.mjs';

const randomUID = Math.floor(Math.random() * 1000000000);

class ReverseTtyClient {
    constructor(connectTimeout = 30000, testSettings) {
        this.connectTimeout = connectTimeout;
        this.settings = testSettings || Settings.getDefaultSettings();
        this.CONNECTION_CLOSE_CODE = 1000;
        this.HEARTBEAT_RATE = 40000;

        // inject global function for logging
        global.logger = Logger(this.settings.logger);

        this.auth = new Auth();

        this.rTtySettings = {
            name: Math.floor(Math.random() * 10000).toString(),
            url: 'ws://127.0.0.1:8080'
        }
        this.webRequest = new WebService({ type: 'none' }, (mess) => {
            logger.debug(`Error in webservice request : ${mess}`);
        });

        this.mainUrl = this.rTtySettings.url + '/' + this.rTtySettings.name;
    }

    async start() {
        this.startWatchDog();
        return this.createClient();
    }

    heartbeat() {
        clearTimeout(this.pingTimeout);

        this.pingTimeout = setTimeout(() => {
            try {
                //this.close();
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
        const self = this;

        this.closeWs();

        return new Promise((res, rej) => {
            this.ws = new WebSocket(this.mainUrl, [], {
                headers: {

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
                    process.stdout.write(data);
                    //logger.debug(data)
                    if (self.ws)
                        self.ws.send(data);
                });

                 ptyProcess.write('ls\r');
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
                 console.log(data)
                // ptyProcess.write(data);
            })

            this.ws.on('message', async (data) => {
                logger.debug(`A data has just received ${data}`);
                ptyProcess.write(data);
                // const resp = await this.receiveMessage(data).catch(err => logger.error(err));
                //
                // // for infinite loop command execution
                // // TODO find a better way to solve this pb
                // if (resp) {
                //     resp.sign = '';
                // }
                //
                // const message = JSON.stringify(resp);
                // this.ws.send(message);
            });
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
