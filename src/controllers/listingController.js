const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const Category = require('../models/Category');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const buildListingFilters = (query = {}, opts = {}) => {
  const filters = { deletedAt: null };

  if (!opts.includeDrafts) {
    filters.status = 'published';
  }

  if (query.status) {
    filters.status = query.status;
  }

  if (query.availabilityStatus) {
    filters.availabilityStatus = query.availabilityStatus;
  }

  if (query.category) {
    if (mongoose.Types.ObjectId.isValid(query.category)) {
      filters.category = query.category;
    } else {
      filters.category = null;
    }
  }

  if (query.owner) {
    filters.owner = query.owner;
  }

  if (query.minPrice || query.maxPrice) {
    filters.price = {};
    if (query.minPrice) filters.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filters.price.$lte = Number(query.maxPrice);
  }

  if (query.state) {
    filters['location.state'] = query.state;
  }

  if (query.city) {
    filters['location.city'] = query.city;
  }

  if (query.year) {
    filters.year = Number(query.year);
  }

  if (query.isFeatured) {
    filters.isFeatured = query.isFeatured === 'true';
  }

  if (query.bodyType) {
    filters.bodyType = query.bodyType;
  }

  if (query.fuelType) {
    filters.fuelType = query.fuelType;
  }

  if (query.transmission) {
    filters.transmission = query.transmission;
  }

  return filters;
};

const applySearch = (query, keyword) => {
  if (!keyword) return query;
  return query.find({
    $text: {
      $search: keyword.trim()
    }
  });
};

const getSortOptions = (sortParam) => {
  switch (sortParam) {
  case 'price_asc':
    return { price: 1 };
  case 'price_desc':
    return { price: -1 };
  case 'oldest':
    return { createdAt: 1 };
  case 'recent':
    return { createdAt: -1 };
  case 'featured':
    return { isFeatured: -1, createdAt: -1 };
  default:
    return { createdAt: -1 };
  }
};

exports.getListings = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const limit = Number(req.query.limit) > 0 ? Math.min(Number(req.query.limit), 50) : 20;
  const skip = (page - 1) * limit;

  const includeDrafts = !!(req.user && ['agent', 'supervisor'].includes(req.user.role));

  if (req.query.category && !mongoose.Types.ObjectId.isValid(req.query.category)) {
    const categoryDoc = await Category.findOne({ slug: req.query.category }, '_id');
    req.query.category = categoryDoc ? String(categoryDoc._id) : null;
  }

  const filters = buildListingFilters(req.query, { includeDrafts });

  // If requesting own listings explicitly, allow drafts
  if (req.query.mine && req.user) {
    filters.owner = req.user._id;
    delete filters.status; // allow any status for own listings
  }

  const sort = getSortOptions(req.query.sort);

  let query = Listing.find(filters)
    .populate('category', 'name slug')
    .populate('owner', 'displayName email role')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  query = applySearch(query, req.query.search || req.query.q);

  const [total, listings] = await Promise.all([
    Listing.countDocuments(filters),
    query
  ]);

  res.json({
    success: true,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1
    },
    listings
  });
});

exports.getListing = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const filters = { deletedAt: null };

  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    filters._id = idOrSlug;
  } else {
    filters.slug = idOrSlug;
  }

  let includeDraft = false;
  if (req.user) {
    includeDraft = ['agent', 'supervisor'].includes(req.user.role);
  }

  if (!includeDraft) {
    filters.status = 'published';
  }

  const listing = await Listing.findOne(filters)
    .populate('category', 'name slug description')
    .populate('owner', 'displayName email phone role avatar');

  if (!listing) {
    throw new AppError('Listing not found', 404);
  }

  if (!includeDraft && listing.status !== 'published') {
    throw new AppError('Listing not available', 403);
  }

  // increment views asynchronously (don't await)
  Listing.findByIdAndUpdate(listing._id, { $inc: { views: 1 } }).catch(() => {});

  res.json({
    success: true,
    listing
  });
});

exports.getMyListings = asyncHandler(async (req, res) => {
  const listings = await Listing.find({
    owner: req.user._id,
    deletedAt: null
  })
    .populate('category', 'name slug')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    listings
  });
});

exports.createListing = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    price,
    category,
    availabilityStatus,
    specifications = {},
    features = [],
    financing = {},
    location = {},
    images = [],
    coverImage,
    mileage,
    year,
    bodyType,
    fuelType,
    transmission,
    condition,
    color,
    driveType
  } = req.body;

  if (!title || !price || !category) {
    throw new AppError('Title, price and category are required', 400);
  }

  const categoryDoc = await Category.findById(category);
  if (!categoryDoc || !categoryDoc.isActive) {
    throw new AppError('Selected category is not available', 400);
  }

  const listing = await Listing.create({
    owner: req.user._id,
    category,
    title,
    description,
    price,
    availabilityStatus: availabilityStatus || 'available',
    specifications,
    features,
    financing,
    location,
    images,
    coverImage: coverImage || (images[0] ? images[0].url : undefined),
    mileage,
    year,
    bodyType,
    fuelType,
    transmission,
    condition,
    color,
    driveType,
    status: ['agent', 'supervisor'].includes(req.user.role) ? 'published' : 'pending_review',
    publishedAt: ['agent', 'supervisor'].includes(req.user.role) ? new Date() : undefined
  });

  const populatedListing = await listing.populate([
    { path: 'category', select: 'name slug' },
    { path: 'owner', select: 'displayName email role' }
  ]);

  res.status(201).json({
    success: true,
    message: 'Listing created successfully',
    listing: populatedListing
  });
});

exports.updateListing = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const filters = { deletedAt: null };

  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    filters._id = idOrSlug;
  } else {
    filters.slug = idOrSlug;
  }

  const listing = await Listing.findOne(filters);
  if (!listing) {
    throw new AppError('Listing not found', 404);
  }

  const isOwner = listing.owner.toString() === req.user._id.toString();
  const isStaff = ['agent', 'supervisor'].includes(req.user.role);

  if (!isOwner && !isStaff) {
    throw new AppError('You do not have permission to update this listing', 403);
  }

  const updatableFields = [
    'title',
    'description',
    'price',
    'availabilityStatus',
    'specifications',
    'features',
    'financing',
    'location',
    'images',
    'coverImage',
    'mileage',
    'year',
    'bodyType',
    'fuelType',
    'transmission',
    'condition',
    'color',
    'driveType',
    'isFeatured'
  ];

  updatableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      listing[field] = req.body[field];
    }
  });

  if (req.body.category) {
    const categoryDoc = await Category.findById(req.body.category);
    if (!categoryDoc) {
      throw new AppError('Selected category does not exist', 400);
    }
    listing.category = req.body.category;
  }

  if (req.body.status && isStaff) {
    listing.status = req.body.status;
    if (req.body.status === 'published') {
      listing.publishedAt = new Date();
    }
  }

  const savedListing = await listing.save();
  const populatedListing = await savedListing.populate([
    { path: 'category', select: 'name slug' },
    { path: 'owner', select: 'displayName email role' }
  ]);

  res.json({
    success: true,
    message: 'Listing updated successfully',
    listing: populatedListing
  });
});

exports.updateListingStatus = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const { status, notes, rejectionReason } = req.body;

  if (!status) {
    throw new AppError('Status is required', 400);
  }

  const validStatuses = ['draft', 'pending_review', 'reviewing', 'published', 'rejected'];
  if (!validStatuses.includes(status)) {
    throw new AppError('Invalid status provided', 400);
  }

  const filters = { deletedAt: null };
  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    filters._id = idOrSlug;
  } else {
    filters.slug = idOrSlug;
  }

  const listing = await Listing.findOne(filters);
  if (!listing) {
    throw new AppError('Listing not found', 404);
  }

  listing.status = status;
  listing.reviewNotes = notes;
  listing.rejectionReason = status === 'rejected' ? rejectionReason : '';
  listing.reviewedBy = req.user._id;
  listing.reviewedAt = new Date();
  listing.publishedAt = status === 'published' ? new Date() : listing.publishedAt;

  const savedListing = await listing.save();
  const populatedListing = await savedListing.populate([
    { path: 'category', select: 'name slug' },
    { path: 'owner', select: 'displayName email role' },
    { path: 'reviewedBy', select: 'displayName email role' }
  ]);

  res.json({
    success: true,
    message: 'Listing status updated successfully',
    listing: populatedListing
  });
});

exports.deleteListing = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const filters = { deletedAt: null };

  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    filters._id = idOrSlug;
  } else {
    filters.slug = idOrSlug;
  }

  const listing = await Listing.findOne(filters);
  if (!listing) {
    throw new AppError('Listing not found', 404);
  }

  const isOwner = listing.owner.toString() === req.user._id.toString();
  const isStaff = ['agent', 'supervisor'].includes(req.user.role);

  if (!isOwner && !isStaff) {
    throw new AppError('You do not have permission to delete this listing', 403);
  }

  listing.deletedAt = new Date();
  await listing.save();

  res.json({
    success: true,
    message: 'Listing removed successfully'
  });
});
