import swaggerJSDoc from 'swagger-jsdoc';

const PORT = process.env.PORT || 5000;

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CoSpace Asset Inventory Management API',
      version: '1.3.0',
      description: 'Advanced API documentation for CoSpace Coworking Equipment Inventory Management system with JWT authentication, custom AppErrors, and Global Exception Handler.',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development Server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ]
  },
  // Look for Swagger annotations in the routes directory
  apis: ['./routes/*.js']
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);
