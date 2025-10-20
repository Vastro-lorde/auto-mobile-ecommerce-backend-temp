const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const env = require('./env');

const API_BASE_PATH = env.app.basePath || '/api';
const normalizeVersion = (version) => {
  if (!version) {
    return 'v1';
  }

  return version.toLowerCase().startsWith('v')
    ? version.toLowerCase()
    : `v${version}`.toLowerCase();
};

const API_VERSION = normalizeVersion(env.app.version || 'v1');

const getServerUrl = (baseUrl) => {
  const sanitizedBase = baseUrl.replace(/\/$/, '');
  const sanitizedPath = API_BASE_PATH.startsWith('/') ? API_BASE_PATH : `/${API_BASE_PATH}`;
    return `${sanitizedBase}${sanitizedPath}/${API_VERSION}`.replace(/([^:]\/)(\/+)/g, '$1');
};

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
  title: `${env.productName} API`,
      version: API_VERSION,
      description: 'Car Marketplace API built with Node.js, Express.js and MongoDB',
      contact: {
  name: `${env.productName} Team`,
  email: 'support@car-ecommerce.com'
      }
    },
    servers: [
      {
        url: getServerUrl(`http://localhost:${env.app.port}`),
        description: 'Development server'
      },
      {
        url: getServerUrl('https://api.car-ecommerce.com'),
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/models/*.js'
  ]
};

const specs = swaggerJSDoc(options);

const setupSwagger = (app) => {
  // Swagger UI options
  const swaggerUiOptions = {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: `${env.productName} API Documentation`
  };

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));
  
  // JSON endpoint for the spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log('📚 Swagger documentation available at /api-docs');
};

module.exports = { setupSwagger, specs };