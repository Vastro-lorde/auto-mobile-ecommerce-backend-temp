const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const categoryController = require('../controllers/categoryController');

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Manage listing categories and category tree representation.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "64f9bcf2a9e75c001a3c9ba2"
 *         name:
 *           type: string
 *           example: "Sedans"
 *         slug:
 *           type: string
 *           example: "sedans"
 *         description:
 *           type: string
 *         parent:
 *           type: string
 *           nullable: true
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CategoryRequest:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           example: "SUV"
 *         description:
 *           type: string
 *         parent:
 *           type: string
 *           nullable: true
 *         isActive:
 *           type: boolean
 *           default: true
 */

/**
 * @swagger
 * /api/v1/categories:
 *   get:
 *     summary: List available categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Category list retrieved.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 categories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 */
router.get('/', categoryController.getCategories);
/**
 * @swagger
 * /api/v1/categories/tree:
 *   get:
 *     summary: Get hierarchical category tree
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Category tree retrieved.
 */
router.get('/tree', categoryController.getCategoryTree);
/**
 * @swagger
 * /api/v1/categories/{idOrSlug}:
 *   get:
 *     summary: Get a single category by ID or slug
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: idOrSlug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category retrieved.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 category:
 *                   $ref: '#/components/schemas/Category'
 *       404:
 *         description: Category not found.
 */
router.get('/:idOrSlug', categoryController.getCategory);

router.post(
  '/',
  auth.required,
  auth.role('supervisor'),
  categoryController.createCategory
);

/**
 * @swagger
 * /api/v1/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryRequest'
 *     responses:
 *       201:
 *         description: Category created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 category:
 *                   $ref: '#/components/schemas/Category'
 */

router.put(
  '/:idOrSlug',
  auth.required,
  auth.role('supervisor'),
  categoryController.updateCategory
);

/**
 * @swagger
 * /api/v1/categories/{idOrSlug}:
 *   put:
 *     summary: Update an existing category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idOrSlug
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryRequest'
 *     responses:
 *       200:
 *         description: Category updated successfully.
 *       404:
 *         description: Category not found.
 */

module.exports = router;