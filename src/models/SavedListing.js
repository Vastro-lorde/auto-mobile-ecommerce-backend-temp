const mongoose = require('mongoose');

const savedListingGroupSchema = new mongoose.Schema({
  user: {
    type: String,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  }
}, {
  timestamps: true
});

savedListingGroupSchema.index({ user: 1, createdAt: -1 });
savedListingGroupSchema.index({ user: 1, name: 1 });

savedListingGroupSchema.methods.toJSON = function() {
  const group = this.toObject({ virtuals: true });
  group.id = group._id;
  delete group._id;
  delete group.__v;
  return group;
};

const savedListingSchema = new mongoose.Schema({
  user: {
    type: String,
    ref: 'User',
    required: true,
    index: true
  },
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true,
    index: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SavedListingGroup',
    default: null
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: (value) => Array.isArray(value) && value.every((tag) => typeof tag === 'string'),
      message: 'Tags must be an array of strings'
    }
  },
  note: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: ''
  }
}, {
  timestamps: true
});

savedListingSchema.index({ user: 1, listing: 1 }, { unique: true });

savedListingSchema.methods.toJSON = function() {
  const savedListing = this.toObject({ virtuals: true });
  savedListing.id = savedListing._id;
  delete savedListing._id;
  delete savedListing.__v;
  return savedListing;
};

const SavedListingGroup = mongoose.model('SavedListingGroup', savedListingGroupSchema);
const SavedListing = mongoose.model('SavedListing', savedListingSchema);

module.exports = {
  SavedListing,
  SavedListingGroup
};
