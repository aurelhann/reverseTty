import Router from './auth.mjs';
import packageJSON from '../../../package.json';


function Ws(app){
    app.use('/auth', Router);

    /**
     * GET /healthcheck
     * @summary Returns a response if the application works
     * @description Give an healthCheck of the application
     * @response 200 - OK
     */
    app.get('/healthcheck', (req, res) => {
        res.send();
    })

    /**
     * GET /ready
     * @summary Returns an ok/ko response
     * @headerParam application/json
     * @description Get status of the application
     * @response 200 - OK
     * @responseContent {Ready} 200.application/json
     */
    app.get('/ready', (req, res) => {
        res.json({
            status: 'UP',
            'Iot Authenticator': {
                version: packageJSON.version,
                status: 'UP',
            }
        })
    })
}
export default Ws
