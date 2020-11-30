
export default (app) => {
    app.locals = {
        settings: {
            security: {
                authPk : '',
                authPubk: '',
            },
            defaultDomain: 'mybraincube.com'
        },
    }
}
