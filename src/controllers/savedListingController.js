const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const { SavedListing, SavedListingGroup } = require('../models/SavedListing');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const savedListingPopulate = [
  {
    path: 'listing',
    match: { deletedAt: null },
    select: 'title slug price availabilityStatus status coverImage images owner category location year mileage bodyType fuelType transmission isFeatured createdAt updatedAt',
    populate: [
      { path: 'category', select: 'name slug' },
      { path: 'owner', select: 'displayName email role' }
    ]
  },
  { path: 'group', select: 'name createdAt updatedAt' }
];

const normalizeTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags.filter((tag) => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean);
  }
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
};

const findListingByIdentifier = async ({ slug, id }) => {
  const filter = { deletedAt: null };

  if (slug) {
    filter.slug = slug;
  } else if (id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    filter._id = id;
  } else {
    return null;
  }

  return Listing.findOne(filter)
    .populate({ path: 'category', select: 'name slug' })
    .populate({ path: 'owner', select: 'displayName email role' });
};

const formatSavedListingResponse = (doc) => {
  if (!doc) return null;
  const savedListing = doc.toJSON ? doc.toJSON() : doc;

  if (savedListing.tags && Array.isArray(savedListing.tags)) {
    savedListing.tags = savedListing.tags.filter(Boolean);
  }

  if (savedListing.listing) {
    const listing = savedListing.listing;
    savedListing.listingType = listing.category?.slug || 'listing';
  } else {
    savedListing.listing = null;
    savedListing.listingType = null;
  }

  return savedListing;
};

exports.getSavedListings = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };

  if (req.query.group) {
    if (!mongoose.Types.ObjectId.isValid(req.query.group)) {
      throw new AppError('Invalid group ID', 400);
    }
    filter.group = req.query.group;
  }

  const savedListings = await SavedListing.find(filter)
    .sort({ createdAt: -1 })
    .populate(savedListingPopulate);

  const results = savedListings
    .filter((doc) => doc.listing) // filter out where linked listing deleted
    .map(formatSavedListingResponse);

  res.json({
    success: true,
    total: results.length,
    savedListings: results
  });
});

exports.getSavedListing = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid saved listing ID', 400);
  }

  const savedListing = await SavedListing.findOne({ _id: id, user: req.user._id })
    .populate(savedListingPopulate);

  if (!savedListing || !savedListing.listing) {
    throw new AppError('Saved listing not found', 404);
  }

  res.json({
    success: true,
    savedListing: formatSavedListingResponse(savedListing)
  });
});

exports.createSavedListing = asyncHandler(async (req, res) => {
  const { listingSlug, listingId, group: groupId } = req.body;
  const tags = normalizeTags(req.body.tags);
  const note = typeof req.body.note === 'string' ? req.body.note.trim() : undefined;

  const listing = await findListingByIdentifier({ slug: listingSlug, id: listingId });
  if (!listing) {
    throw new AppError('Listing not found', 404);
  }

  let group = null;
  if (groupId) {
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw new AppError('Invalid group ID', 400);
    }
    group = await SavedListingGroup.findOne({ _id: groupId, user: req.user._id });
    if (!group) {
      throw new AppError('Group not found', 404);
    }
  }

  let savedListing = await SavedListing.findOne({ user: req.user._id, listing: listing._id });
  let wasNew = false;

  if (savedListing) {
    savedListing.tags = tags;
    if (note !== undefined) savedListing.note = note;
    savedListing.group = group ? group._id : null;
    await savedListing.save();
  } else {
    savedListing = await SavedListing.create({
      user: req.user._id,
      listing: listing._id,
      group: group ? group._id : null,
      tags,
      note: note || ''
    });
    wasNew = true;
  }

  const populated = await SavedListing.findById(savedListing._id).populate(savedListingPopulate);

  res.status(wasNew ? 201 : 200).json({
    success: true,
    savedListing: formatSavedListingResponse(populated)
  });
});

exports.updateSavedListing = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid saved listing ID', 400);
  }

  const savedListing = await SavedListing.findOne({ _id: id, user: req.user._id });
  if (!savedListing) {
    throw new AppError('Saved listing not found', 404);
  }

  if (req.body.group !== undefined || req.body.groupId !== undefined) {
    const groupId = req.body.group || req.body.groupId;
    if (groupId === null || groupId === '') {
      savedListing.group = null;
    } else {
      if (!mongoose.Types.ObjectId.isValid(groupId)) {
        throw new AppError('Invalid group ID', 400);
      }
      const group = await SavedListingGroup.findOne({ _id: groupId, user: req.user._id });
      if (!group) {
        throw new AppError('Group not found', 404);
      }
      savedListing.group = group._id;
    }
  }

  if (req.body.tags !== undefined) {
    savedListing.tags = normalizeTags(req.body.tags);
  }

  if (req.body.note !== undefined) {
    savedListing.note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
  }

  await savedListing.save();

  const populated = await SavedListing.findById(savedListing._id).populate(savedListingPopulate);

  res.json({
    success: true,
    savedListing: formatSavedListingResponse(populated)
  });
});

exports.deleteSavedListing = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid saved listing ID', 400);
  }

  const result = await SavedListing.deleteOne({ _id: id, user: req.user._id });
  if (!result.deletedCount) {
    throw new AppError('Saved listing not found', 404);
  }

  res.json({
    success: true,
    message: 'Saved listing removed'
  });
});

exports.mergeSavedListings = asyncHandler(async (req, res) => {
  const listingSlugs = Array.isArray(req.body.listingSlugs)
    ? req.body.listingSlugs
    : Array.isArray(req.body.listings)
      ? req.body.listings
      : [];

  if (!listingSlugs.length) {
    throw new AppError('listingSlugs array is required', 400);
  }

  const created = [];
  const failed = [];

  for (const slug of listingSlugs) {
    if (!slug || typeof slug !== 'string') {
      failed.push({ slug, error: 'Invalid slug' });
      continue;
    }

    const listing = await findListingByIdentifier({ slug });
    if (!listing) {
      failed.push({ slug, error: 'Listing not found' });
      continue;
    }

    try {
      const result = await SavedListing.updateOne(
        { user: req.user._id, listing: listing._id },
        {
          $setOnInsert: {
            user: req.user._id,
            listing: listing._id,
            tags: [],
            note: ''
          }
        },
        { upsert: true }
      );

      if (result.upsertedCount && result.upsertedCount > 0) {
        const upsertedId = result.upsertedId && (result.upsertedId._id || result.upsertedId);
        if (upsertedId) {
          created.push(upsertedId.toString());
        }
      }
    } catch (error) {
      failed.push({ slug, error: error.message });
    }
  }

  res.json({
    success: true,
    created,
    failed,
    totalProcessed: listingSlugs.length,
    successCount: created.length,
    failedCount: failed.length
  });
});

exports.getGroups = asyncHandler(async (req, res) => {
  const groups = await SavedListingGroup.find({ user: req.user._id })
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    total: groups.length,
    groups: groups.map((group) => group.toJSON())
  });
});

exports.createGroup = asyncHandler(async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!name) {
    throw new AppError('Group name is required', 400);
  }

  const group = await SavedListingGroup.create({
    user: req.user._id,
    name
  });

  res.status(201).json({
    success: true,
    group: group.toJSON()
  });
});

exports.updateGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid group ID', 400);
  }

  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!name) {
    throw new AppError('Group name is required', 400);
  }

  const group = await SavedListingGroup.findOneAndUpdate(
    { _id: id, user: req.user._id },
    { name },
    { new: true }
  );

  if (!group) {
    throw new AppError('Group not found', 404);
  }

  res.json({
    success: true,
    group: group.toJSON()
  });
});

exports.deleteGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid group ID', 400);
  }

  const group = await SavedListingGroup.findOneAndDelete({ _id: id, user: req.user._id });
  if (!group) {
    throw new AppError('Group not found', 404);
  }

  await SavedListing.updateMany({ user: req.user._id, group: group._id }, { $set: { group: null } });

  res.json({
    success: true,
    message: 'Group deleted and saved listings updated'
  });
});
