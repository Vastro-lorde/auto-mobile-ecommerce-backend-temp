const LISTING_AVAILABILITY_STATUSES = Object.freeze({
  AVAILABLE: 'available',
  PENDING: 'pending',
  SOLD: 'sold',
  INACTIVE: 'inactive'
});

const LISTING_STATUSES = Object.freeze({
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  REVIEWING: 'reviewing',
  PUBLISHED: 'published',
  REJECTED: 'rejected'
});

module.exports = {
  LISTING_AVAILABILITY_STATUSES,
  LISTING_STATUSES
};
