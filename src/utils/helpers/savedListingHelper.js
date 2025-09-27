const normalizeTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags
      .filter((tag) => typeof tag === 'string')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
};

const formatSavedListing = (doc) => {
  if (!doc) return null;

  const savedListing = doc.toObject
    ? doc.toObject({ virtuals: true })
    : doc;

  const listing = savedListing.listing || null;

  return {
    id: savedListing._id?.toString?.() || savedListing.id,
    user: savedListing.user?.toString?.() || savedListing.user,
    listing: listing || null,
    listingType: listing?.category?.slug || null,
    group: savedListing.group || null,
    tags: Array.isArray(savedListing.tags) ? savedListing.tags.filter(Boolean) : [],
    note: savedListing.note || '',
    createdAt: savedListing.createdAt,
    updatedAt: savedListing.updatedAt
  };
};

module.exports = {
  normalizeTags,
  formatSavedListing
};
