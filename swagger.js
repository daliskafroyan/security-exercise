const swaggerJsdoc = require('swagger-jsdoc');
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'E-commerce Security Simulation API',
            version: '1.0.0',
            description: 'API documentation for the E-commerce security simulation platform with deliberate vulnerabilities for red team/blue team exercises',
        },
        servers: [
            {
                url: 'http://localhost:3001',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'connect.sid'
                }
            }
        }
    },
    apis: ['./routes/*.js'],
};
const specs = swaggerJsdoc(options);
module.exports = specs; 