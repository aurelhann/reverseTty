import openapi from 'openapi-comment-parser';
import swaggerUi from 'swagger-ui-express';
import express from 'express';
const spec = openapi({
    cwd: process.cwd()
})

const app = express();
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
app.listen(8080)
