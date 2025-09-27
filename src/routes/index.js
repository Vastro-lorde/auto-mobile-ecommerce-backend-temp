const express = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const listingRoutes = require('./listings');
const categoryRoutes = require('./categories');
const conversationRoutes = require('./conversations');
const notificationRoutes = require('./notifications');
const savedListingRoutes = require('./savedListings');
const savedListingGroupRoutes = require('./savedListingGroups');

const API_BASE_PATH = process.env.API_BASE_PATH || '/api';
const DEFAULT_API_VERSION = process.env.API_VERSION || 'v1';

const normalizeVersion = (version) => {
  if (!version) {
    return 'v1';
  }

  if (version.startsWith('v')) {
    return version.toLowerCase();
  }

  return `v${version}`.toLowerCase();
};

const ROUTES = [
  { path: '/auth', router: authRoutes },
  { path: '/users', router: userRoutes },
  { path: '/listings', router: listingRoutes },
  { path: '/categories', router: categoryRoutes },
  { path: '/conversations', router: conversationRoutes },
  { path: '/notifications', router: notificationRoutes },
  { path: '/saved-listings', router: savedListingRoutes },
  { path: '/saved-listing-groups', router: savedListingGroupRoutes }
];

const createVersionedRouter = () => {
  const versionedRouter = express.Router();

  ROUTES.forEach(({ path, router }) => {
    versionedRouter.use(path, router);
  });

  return versionedRouter;
};

const registerRoutes = (app, options = {}) => {
  if (!app || typeof app.use !== 'function') {
    throw new Error('An Express app instance is required to register routes');
  }

  const version = normalizeVersion(options.version || DEFAULT_API_VERSION);
  const apiRouter = express.Router();
  const versionedRouter = createVersionedRouter();

  apiRouter.get('/', (req, res) => {
    const endpoints = ROUTES.map(({ path }) => `${API_BASE_PATH}/${version}${path}`);

    res.json({
      success: true,
      version,
      endpoints
    });
  });

  apiRouter.use(`/${version}`, versionedRouter);

  app.use(API_BASE_PATH, apiRouter);
};

module.exports = {
  registerRoutes,
  ROUTES,
  API_BASE_PATH,
  DEFAULT_API_VERSION
};
