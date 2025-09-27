const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const listingController = require('../controllers/listingController');

/**
 * @swagger
 * tags:
 *   name: Listings
 *   description: Manage vehicle listings, including creation, updates, search, and moderation workflows.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Listing:
 *       type: object
 *       description: A vehicle listing that can be published to the marketplace.
 *       properties:
 *         id:
 *           type: string
 *           description: Listing identifier.
 *           example: "64f9bd4ea9e75c001a3c9bb1"
 *         title:
 *           type: string
 *           example: "2018 Toyota Corolla LE"
 *         slug:
 *           type: string
 *           example: "2018-toyota-corolla-le"
 *         description:
 *           type: string
 *         price:
 *           type: number
 *           format: double
 *           example: 4500000
 *         currency:
 *           type: string
 *           example: "NGN"
 *         availabilityStatus:
 *           type: string
 *           example: "available"
 *         status:
 *           type: string
 *           example: "published"
 *         owner:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             displayName:
 *               type: string
 *             email:
 *               type: string
 *         category:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             slug:
 *               type: string
 *         location:
 *           type: object
 *           properties:
 *             state:
 *               type: string
 *               example: "Lagos"
 *             city:
 *               type: string
 *               example: "Ikeja"
 *         images:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *               caption:
 *                 type: string
 *         isFeatured:
 *           type: boolean
 *         publishedAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ListingRequest:
 *       type: object
 *       required:
 *         - title
 *         - price
 *         - category
 *       properties:
 *         title:
 *           type: string
 *           example: "2018 Toyota Corolla LE"
 *         description:
 *           type: string
 *         price:
 *           type: number
 *           example: 4500000
 *         currency:
 *           type: string
 *           example: "NGN"
 *         category:
 *           type: string
 *           description: Category ID.
 *           example: "64f9bcf2a9e75c001a3c9ba2"
 *         availabilityStatus:
 *           type: string
 *           enum: [available, sold, reserved]
 *         specifications:
 *           type: object
 *           additionalProperties: true
 *           example:
 *             year: 2018
 *             mileage: 56000
 *             fuelType: "petrol"
 *         location:
 *           type: object
 *           properties:
 *             state:
 *               type: string
 *             city:
 *               type: string
 *             address:
 *               type: string
 *     ListingStatusUpdate:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           description: Updated moderation status.
 *           example: "published"
 */

/**
 * @swagger
 * /api/v1/listings:
 *   get:
 *     summary: Search or browse vehicle listings
 *     description: Returns a paginated list of listings. Agents and supervisors automatically see draft listings when authenticated.
 *     tags: [Listings]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number to retrieve.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Number of items per page.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Full-text search against listing titles and descriptions.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by listing moderation status (e.g. published, pending_review).
 *       - in: query
 *         name: availabilityStatus
 *         schema:
 *           type: string
 *         description: Filter by availability status (e.g. available, sold).
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category ID or slug.
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           format: double
 *         description: Minimum price filter.
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           format: double
 *         description: Maximum price filter.
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [recent, oldest, price_asc, price_desc, featured]
 *           default: recent
 *         description: Sort results by recency, price, or featured flag.
 *     responses:
 *       200:
 *         description: Listings retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                 listings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Listing'
 */
router.get('/', auth.optional, listingController.getListings);
/**
 * @swagger
 * /api/v1/listings/mine:
 *   get:
 *     summary: Get listings created by the authenticated user
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of listings owned by the authenticated user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 listings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Listing'
 */
router.get('/mine', auth.required, listingController.getMyListings);
/**
 * @swagger
 * /api/v1/listings/{idOrSlug}:
 *   get:
 *     summary: Get a single listing by ID or slug
 *     tags: [Listings]
 *     parameters:
 *       - in: path
 *         name: idOrSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing MongoDB ID or slug.
 *     responses:
 *       200:
 *         description: Listing retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 listing:
 *                   $ref: '#/components/schemas/Listing'
 *       404:
 *         description: Listing not found.
 */
router.get('/:idOrSlug', auth.optional, listingController.getListing);

router.post(
  '/',
  auth.required,
  auth.requireVerification,
  auth.requireWriteAccess,
  listingController.createListing
);

/**
 * @swagger
 * /api/v1/listings:
 *   post:
 *     summary: Create a new vehicle listing
 *     description: Creates a new listing for the authenticated user. Email verification and write access are required.
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ListingRequest'
 *           example:
 *             title: "2018 Toyota Corolla LE"
 *             description: "Clean Nigerian used sedan with full service history."
 *             price: 4500000
 *             currency: "NGN"
 *             category: "64f9bcf2a9e75c001a3c9ba2"
 *             availabilityStatus: "available"
 *             specifications:
 *               year: 2018
 *               mileage: 56000
 *               transmission: "automatic"
 *             location:
 *               state: "Lagos"
 *               city: "Ikeja"
 *     responses:
 *       201:
 *         description: Listing created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 listing:
 *                   $ref: '#/components/schemas/Listing'
 *       400:
 *         description: Validation error.
 */

router.put(
  '/:idOrSlug',
  auth.required,
  auth.requireVerification,
  auth.requireWriteAccess,
  listingController.updateListing
);

/**
 * @swagger
 * /api/v1/listings/{idOrSlug}:
 *   put:
 *     summary: Update an existing listing
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idOrSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing ID or slug.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ListingRequest'
 *     responses:
 *       200:
 *         description: Listing updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 listing:
 *                   $ref: '#/components/schemas/Listing'
 *       404:
 *         description: Listing not found.
 */

router.patch(
  '/:idOrSlug/status',
  auth.required,
  auth.role('agent', 'supervisor'),
  listingController.updateListingStatus
);

/**
 * @swagger
 * /api/v1/listings/{idOrSlug}/status:
 *   patch:
 *     summary: Update listing moderation status
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idOrSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing ID or slug.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ListingStatusUpdate'
 *           example:
 *             status: "published"
 *     responses:
 *       200:
 *         description: Listing status updated.
 *       403:
 *         description: Forbidden.
 */

router.delete(
  '/:idOrSlug',
  auth.required,
  auth.requireVerification,
  auth.requireWriteAccess,
  listingController.deleteListing
);

/**
 * @swagger
 * /api/v1/listings/{idOrSlug}:
 *   delete:
 *     summary: Soft delete a listing
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idOrSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing ID or slug.
 *     responses:
 *       200:
 *         description: Listing marked as deleted.
 *       404:
 *         description: Listing not found.
 */

module.exports = router;