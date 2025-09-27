const mongoose = require('mongoose');
const slugify = require('slugify');
const {
  LISTING_AVAILABILITY_STATUSES,
  LISTING_STATUSES
} = require('../utils/enums/listingEnums');

const imageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  key: {
    type: String
  },
  caption: {
    type: String,
    trim: true
  },
  order: {
    type: Number,
    default: 0
  }
}, { _id: false });

const locationSchema = new mongoose.Schema({
  country: {
    type: String,
    default: 'Nigeria'
  },
  state: {
    type: String,
    trim: true
  },
  stateCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  city: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  latitude: Number,
  longitude: Number
}, { _id: false });

const listingSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 180
  },
  slug: {
    type: String,
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0
  },
  currency: {
    type: String,
    default: 'NGN'
  },
  availabilityStatus: {
    type: String,
    enum: Object.values(LISTING_AVAILABILITY_STATUSES),
    default: LISTING_AVAILABILITY_STATUSES.AVAILABLE,
    index: true
  },
  status: {
    type: String,
    enum: Object.values(LISTING_STATUSES),
    default: LISTING_STATUSES.PENDING_REVIEW,
    index: true
  },
  publishedAt: {
    type: Date
  },
  specifications: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  features: {
    type: [String],
    default: []
  },
  financing: {
    type: Object,
    default: {}
  },
  location: {
    type: locationSchema,
    default: () => ({})
  },
  images: {
    type: [imageSchema],
    default: []
  },
  coverImage: {
    type: String
  },
  mileage: {
    type: Number,
    min: 0
  },
  year: {
    type: Number
  },
  bodyType: {
    type: String,
    trim: true
  },
  fuelType: {
    type: String,
    trim: true
  },
  transmission: {
    type: String,
    trim: true
  },
  condition: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    trim: true
  },
  driveType: {
    type: String,
    trim: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  reviewNotes: {
    type: String,
    trim: true
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date
  },
  deletedAt: {
    type: Date,
    default: null,
    index: true
  }
}, {
  timestamps: true
});

listingSchema.pre('save', async function(next) {
  if (!this.slug || this.isModified('title')) {
    const baseSlug = slugify(this.title, { lower: true, strict: true, trim: true });
    if (!baseSlug) {
      return next(new Error('Unable to generate listing slug'));
    }

    let slug = baseSlug;
    let counter = 1;

  const ListingModel = this.constructor;

  while (await ListingModel.exists({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    this.slug = slug;
  }

  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  next();
});

listingSchema.index({ title: 'text', description: 'text' });
listingSchema.index({ status: 1, createdAt: -1 });
listingSchema.index({ availabilityStatus: 1, status: 1 });
listingSchema.index({ isFeatured: 1, publishedAt: -1 });

listingSchema.methods.toJSON = function() {
  const listing = this.toObject({ virtuals: true });
  listing.id = listing._id;
  delete listing._id;
  delete listing.__v;
  return listing;
};

module.exports = mongoose.model('Listing', listingSchema);
