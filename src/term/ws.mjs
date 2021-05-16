import https from'https';
import http from 'http';
// eslint-disable-next-line import/no-extraneous-dependencies
import httpsProxyAgent from 'https-proxy-agent';

let proxy;
if (process.env.http_proxy != null) {
    proxy = process.env.http_proxy;
}

if (process.env.HTTP_PROXY != null) {
    proxy = process.env.HTTP_PROXY;
}

class Ws {
    constructor(
        { type, user, password },
        logCallback
    ) {
        this.log = logCallback;
        if (type === 'basic') {
            this.auth = {
                type: type,
                user: user,
                password: password
            };
        } else {
            this.log(
                `Authentication type ${type} is actually unsupported. Now your are in anonymous authentication`,
                Ws.SEVERITY_LOG.warn
            );
        }
        this.authHeader = this.getAuthBasicHeader();
    }

    /**
     * Share the log level detail
     * @return {{warn: number, trace: number, debug: number, log: number, error: number}}
     * @constructor
     */
    static get SEVERITY_LOG() {
        return {
            trace: 0,
            debug: 1,
            info: 2,
            warn: 3,
            error: 4
        };
    }

    /**
     * Build the Authorization header for basic auth
     * @return {string}
     */
    getAuthBasicHeader() {

        if (!this.auth || !this.auth.password || !this.auth.user) { return ''; }

        return `Basic ${Buffer.from(`${this.auth.user}:${this.auth.password}`).toString('base64')}`;
    }

    /**
     * @param opts {{
     *    path: string, hostname: string, port: number | null, method: string, sendProtocol: string,
     *    headers: object | null, body: string | buffer | null, data: string | buffer | null,
     *    agent: object | null, cert: string | null, key: string | null
     * }}
     * @returns {Promise<{headers: Object, body: string, statusCode: number}>}
     */
    async request(opts) {
        const options = opts;
        this.log(`${options.method} ${options.hostname} ${options.path}`, Ws.SEVERITY_LOG.debug);

        options.headers = (options.headers || {});
        // For accept wrong certificate (like self generated)
        options.rejectUnauthorized = false;


        let body = options.body || options.data;
        if (body) {
            options.headers['Content-Type'] = 'application/json';
            options.headers['Content-Length'] = Buffer.byteLength(options.body, 'utf8');
        }

        if (this.auth && this.auth.type === 'basic') { options.headers.Authorization = this.authHeader; }

        if (proxy) {
            options.agent = httpsProxyAgent(process.env.HTTP_PROXY);
        }

        let base = https;
        if (options.protocol.includes('http:')) {
            base = http;
        }

        const result = {
            headers: {},
            statusCode: 500,
            body: null
        };

        this.log('Sending request: ' + JSON.stringify(options), Ws.SEVERITY_LOG.debug);
        return new Promise((resolve, reject) => {
            const req = base.request(options, (res) => {
                result.headers = res.headers;
                result.statusCode = res.statusCode;
                // Receiving chunk of data.
                const data = [];
                res.on('data', (chunk) => {
                    this.log(chunk, Ws.SEVERITY_LOG.trace);
                    data.push(Buffer.from(chunk));
                });
                // The whole response has been received.
                res.on('end', () => {
                    this.log(`While requesting : ${options.path} the response's status is ${result.statusCode}`,
                        Ws.SEVERITY_LOG.debug);
                    result.body = Buffer.concat(data).toString();
                    resolve(result);
                });
                res.on('error', (err) => {
                    reject(err);
                });
            }).on('error', (err) => {
                reject(err);
            });
            if (body) {
                const dataType = typeof body;
                if (dataType !== 'string' && !Buffer.isBuffer(body)) {
                    // not string nor buffer -> jsonify
                    body = JSON.stringify(body);
                }
                this.log(`The body sent was : ${body}`, Ws.SEVERITY_LOG.trace);
                req.write(body);
            }
            req.on('timeout', msg => {
                this.log(msg, Ws.SEVERITY_LOG.error);
                throw new Error(`Request timeout : ${msg}`);
            });
            req.end();

        }).catch((err) => {
            this.log(err, Ws.SEVERITY_LOG.error);
            throw new Error(err);
        });
    }
}

export default Ws;
