import http from 'http';
import express from 'express';
import bodyParser from 'body-parser';
import cluster from 'cluster';
import os from 'os';
import Websocket from 'ws';
import Logger from '../logger.mjs';
import Ws from './ws/index.mjs';
import Settings from '../settings.mjs';

class Authenticator {
    constructor() {
        this.settings = Settings.getDefaultSettings();

        // inject global function for logging
        global.logger = Logger(this.settings.logger);

        global.app = this.app = express();
        this.workers = [];
        this.numCores = os.cpus().length;
    }
    start() {
        this.setupServer(false);
    }
    /**
     * Setup number of worker processes to share port which will be defined while setting up server
     */
    setupWorkerProcesses() {
        // to read number of cores on system
        logger.info('Master cluster setting up ' + this.numCores + ' workers');

        // iterate on number of cores need to be utilized by an application
        // current example will utilize all of them
        for(let i = 0; i < this.numCores; i++) {
            // creating workers and pushing reference in an array
            // these references can be used to receive messages from workers
            this.workers.push(cluster.fork());

            // to receive messages from worker process
            this.workers[i].on('message', function(message) {
                logger.debug(message);
            });
        }

        // process is clustered on a core and process id is assigned
        cluster.on('online', function(worker) {
            logger.info('Worker ' + worker.process.pid + ' is listening');
        });

        // if any of the worker process dies then start a new one by simply forking another one
        cluster.on('exit', function(worker, code, signal) {
            logger.info('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
            logger.info('Starting a new worker');
            cluster.fork();
            this.workers.push(cluster.fork());
            // to receive messages from worker process
            this.workers[this.workers.length-1].on('message', function(message) {
                logger.debug(message);
            });
        });
    };

    /**
     * Setup an express server and define port to listen all incoming requests for this application
     */
    setUpExpress() {
        // create server
        this.app.server = http.createServer(this.app);

        // Set websocket
        const wss = new Websocket.Server({ server: this.app.server });
        // broadcast
        wss.on('connection', function connection(ws) {
            ws.on('message', function incoming(data) {
                logger.debug(`message transit : ${data.toString('hex')}`)
                wss.clients.forEach(function each(client) {
                    if (client.readyState === 1 && ws !== client) {
                        client.send(data);
                    }
                });
            });
        });

        // parse application/json
        this.app.use(bodyParser.json({
            limit: '2000kb',
        }));
        this.app.disable('x-powered-by');

        // Declare all routes and api(s)
        Ws(this.app);

        // Declare local vars
        Settings.setExpressApp(app);

        // start server
        this.app.server.listen('8080', () => {
            logger.info(`Started server on => http://localhost:${this.app.server.address().port} for Process Id ${process.pid}`);
        });

        // in case of an error
        this.app.on('error', (appErr, appCtx) => {
            logger.error('app error', appErr.stack);
            logger.error('on url', appCtx.req.url);
            logger.error('with headers', appCtx.req.headers);
        });
    };

    /**
     * Setup server either with clustering or without it
     * @param isClusterRequired
     * @constructor
     */
    setupServer(isClusterRequired) {

        // if it is a master process then call setting up worker process
        if(isClusterRequired && cluster.isMaster) {
            this.setupWorkerProcesses();
        } else {
            // to setup server configurations and share port address for incoming requests
            this.setUpExpress();
        }
    };
}

export { Authenticator };
