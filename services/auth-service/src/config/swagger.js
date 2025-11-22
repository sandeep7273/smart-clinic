const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./index');
const { serve } = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: `${config.serviceName} API Documentation`,
            version: '1.0.0',
            description: `API documentation for ${config.serviceName}`,
            contact: {
                name: 'API Support Team',
                email: 'support@example.com'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT' 
            },
            servers: [
                {
                    url: `http://localhost:${config.port}/api`,
                    description: 'Local server'
                },
                {
                    url: `${config.baseUrl}/api`,
                    description: 'Production server'
                }
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                        description: 'Enter your JWT token in the format **Bearer &lt;token&gt;**'
                    }
                },
                screens: {
                    User : {
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                description: 'User Id',
                                example: '123e4567-e89b-12d3-a456-426614174000'
                            }
                        }
                    }
                }
            }
        }
    },
    apis: ['./src/routes/*.js', './src/controllers/*.js'],  // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;