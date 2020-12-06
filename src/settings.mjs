
class Settings{
    constructor() {
    }

    static getDefaultSettings(){
        return {
            settings: {
                security: {
                    authPk : '',
                        authPubk: '',
                },
                defaultDomain: 'mybraincube.com'
            },
            logger: {
                consoleLevel: process.env.SERVICEX_CONSOLE_LOG_LEVEL || 'debug',
                fileLevel: process.env.SERVICEX_FILE_LOG_LEVEL || 'debug',
                filename: process.env.SERVICEX_FILENAME_LOG || '/tmp/iotAuthenticator_.log',
            }
        }
    }

    static setExpressApp(app) {
        app.locals = this.getDefaultSettings()
    }
}


export default Settings;
