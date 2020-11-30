import express from 'express';
import Jwt from 'jsonwebtoken';

const auth = express.Router();

const MAX_TIME_TOKEN = 5; // in minutes
const JWT_DURATION = 5;

/**
 * GET /auth/token
 * @summary Return a valid jwt
 * @headerParam Box-authorization
 * @request
 * @description Get a valid jwt for a box authentication
 * @response 200 - OK
 * @responseContent {jwt} 200.application/json
 */
auth.post('/token', async (req, res) => {

    //TODO
    //* generate the new token

    // check right headers
    if(!req?.headers?.Box-authorization)
        res.status(400).send();

    //check the body content
    const jwtRequestBody = req.body.json;
    if (
        !jwtRequestBody?.date ||
        (!jwtRequestBody?.licenseCode || !jwtRequestBody?.signedIotServerId)
    )
        res.status(401).send();

    // check the date
    const unixDate = (new Date(jwtRequestBody.date)).getTime();
    if (unixDate > (Date.now() + (MAX_TIME_TOKEN * 60 * 1000 )))
        res.status(401).send();

    let boxId;

    // check the licenseCode authenticity (babou code)
    if (jwtRequestBody.licenseCode) {
        const response = await app.locals.braincubeReq.authenticatedRequest({
            hostname: `licence.${app.locals.settings.defaultDomain}`,
            path: `/licence/available?keyId=${jwtRequestBody?.licenseCode}`,
            method: 'GET',
            headers: {
                'content-type': 'application/json'
            }
        })

        if (response.status !== 200)
            res.status(401).send();

        // make a random id for first box creation
        boxId = Math.floor(Math.random() * 100000);
    }


    // check a signed content from a boarded iot-server
    if (jwtRequestBody.signedIotServerId) {

    }


    // finally return a valid jwt
    res.send(
        Jwt.sign(
            {
                iss: 'IoTAuthenticator',
                sub: boxId,
                type: 'accessToken',
                iat: Date.now() / 1000,
                exp: Math.floor((Date.now() + (60 * 1000 * JWT_DURATION)) / 1000)
            },
            app.locals.settings.authPk,
            { algorithm: 'ES512'}
        )
    );
})

export default auth;
