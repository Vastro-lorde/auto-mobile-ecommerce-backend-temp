const mongoose = require('mongoose');
const Category = require('../models/Category');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const buildCategoryTree = (categories, parentId = null) => {
  return categories
    .filter((cat) => String(cat.parent) === String(parentId))
    .map((cat) => ({
      id: cat._id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      isActive: cat.isActive,
      schema: cat.schema,
      filters: cat.filters,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
      children: buildCategoryTree(categories, cat._id)
    }));
};

exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true })
    .sort({ name: 1 })
    .lean();

  res.json({
    success: true,
    categories
  });
});

exports.getCategoryTree = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true })
    .sort({ name: 1 })
    .lean();

  const tree = buildCategoryTree(categories, null);

  res.json({
    success: true,
    categories: tree
  });
});

exports.getCategory = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;

  const filter = mongoose.Types.ObjectId.isValid(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: idOrSlug };

  const category = await Category.findOne(filter);
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  res.json({
    success: true,
    category
  });
});

exports.createCategory = asyncHandler(async (req, res) => {
  const { name, description, parent, schema, filters, isActive } = req.body;

  if (!name) {
    throw new AppError('Category name is required', 400);
  }

  let parentCategory = null;
  if (parent) {
    parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      throw new AppError('Parent category not found', 404);
    }
  }

  const category = await Category.create({
    name,
    description,
    parent: parentCategory ? parentCategory._id : null,
    schema,
    filters,
    isActive: isActive !== undefined ? isActive : true
  });

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    category
  });
});

exports.updateCategory = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;

  const filter = mongoose.Types.ObjectId.isValid(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: idOrSlug };

  const category = await Category.findOne(filter);
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  const updateFields = ['name', 'description', 'schema', 'filters', 'isActive'];

  updateFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      category[field] = req.body[field];
    }
  });

  if (req.body.parent !== undefined) {
    if (!req.body.parent) {
      category.parent = null;
    } else {
      if (req.body.parent === String(category._id)) {
        throw new AppError('Category cannot be its own parent', 400);
      }
      const parentCategory = await Category.findById(req.body.parent);
      if (!parentCategory) {
        throw new AppError('Parent category not found', 404);
      }
      category.parent = parentCategory._id;
    }
  }

  const savedCategory = await category.save();

  res.json({
    success: true,
    message: 'Category updated successfully',
    category: savedCategory
  });
});
