/* eslint-disable import/no-extraneous-dependencies */
import bunyan from 'bunyan'
import { createStream } from 'rotating-file-stream'
import format from 'date-fns/format/index.js'
const rotatingStream = createStream;
function logFormat(date, message, level) {
    return `${format(date, 'yyyy-MM-dd hh:mm:ss')} | [${level}] | ${message}\n`;
}

const mapLevel = {
    10: 'trace',
    20: 'debug',
    30: 'info ',
    40: 'warn ',
    50: 'error'
};

class ConsoleStream {
    write(msg) {
        let message = msg.msg;
        if (!message) {
            message = msg.message;
        }
        console.log(logFormat(message.time || new Date(), message, mapLevel[msg.level] || msg.level));
    }
}

/**
 * @description A wrapper class to have rotating filestream in bunyan
 * @class BunyanRotating
 */
class BunyanRotating {
    /**
     * Creates an instance of BunyanRotating.
     * @param {string | Generator} filename
     * @param {Object} options
     * @memberof BunyanRotating
     */
    constructor(filename, options) {
        if (!options.path) {
            delete options.path;
        }
        this._rotating = rotatingStream(filename, options);
        this._rotating.on('error', (err) => {
            this.handleError(err);
        });

        this.shouldEnd = false;
        this.pendingWrite = 0;
        this.endPromise = new Promise((res, rej) => {
            this.endResolve = res;
            this.endFail = rej;
        });
    }

    /**
     * @description Trigger a write in the underlying rotating-filestream
     * @param {Object} msg
     * @memberof BunyanRotating
     */
    write(msg) {
        try {
            this.pendingWrite++;

            let message = msg.msg;
            if (!message) {
                message = msg.message;
            }
            this._rotating.write(logFormat(msg.time, message, mapLevel[msg.level] || msg.level), () => {
                this.pendingWrite--;
                if (this.shouldEnd) {
                    if (this.pendingWrite === 0) {
                        this.endResolve();
                    }
                }
            });
        } catch (err) {
            this.handleError(err);
        }
    }


    /**
     * @description Gracefully stop the file logger, this is helpfull for process-end and crash related debugs
     * @returns {Promise}
     * @memberof BunyanRotating
     */
    terminate() {
        this.shouldEnd = true;
        // Wait for the end (for a maximum duration of 1000ms)
        return new Promise((res) => {
            setTimeout(() => res(), 1000);
        });
    }

    handleError(err) {
        console.log(err);
    }
}

function getLoggerStreams(settings = {}) {
    const logger = [];
    // Declare console log stream
    logger.push({
        name: 'console',
        type: 'raw',
        level: settings.consoleLevel || 'info',
        stream: new ConsoleStream()
    });
    // Declare file log stream (homemade)
    logger.push({
        name: 'file',
        type: 'raw',
        level: settings.fileLevel,
        stream: new BunyanRotating(
            (time, _id) => {
                let id = '.';
                if (_id) {
                    id = `_${_id}.`;
                }
                const out = settings.filename.replace('.', `${id}`);
                return out;
            },
            {
                path: settings.filePath,
                size: `${settings.fileSize || 20}M`,
                maxFiles: settings.fileNumberRotate || 5,
                maxSize: `${(settings.fileSize || 20) * (settings.fileNumberRotate || 5)}M`,
                interval: '1d',
                initialRotation: true, // Give ourselves a clean file when we start up, based on period
                compress: true // Compress the archive log files to save space
            }
        )
    });
    return logger;
}

/**
 * Bunyan logger creation and primitive settings
 * @param bunyanConfig
 * @return {bunyan.Logger}
 */
function giveMeALogger(config) {
    return bunyan.createLogger({
        name: 'servicex',
        streams: getLoggerStreams(config)
    });
}

export default giveMeALogger;
