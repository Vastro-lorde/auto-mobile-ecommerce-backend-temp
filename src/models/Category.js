const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: 120
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  schema: {
    type: Object,
    default: {}
  },
  filters: {
    type: Object,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

categorySchema.pre('save', function(next) {
  if (!this.slug || this.isModified('name')) {
    const baseSlug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true
    });

    if (!baseSlug) {
      return next(new Error('Unable to generate category slug'));
    }

    this.slug = baseSlug;
  }
  next();
});

categorySchema.index({ name: 1 });
categorySchema.index({ parent: 1 });

categorySchema.methods.toJSON = function() {
  const category = this.toObject({ virtuals: true });
  category.id = category._id;
  delete category._id;
  delete category.__v;
  return category;
};

module.exports = mongoose.model('Category', categorySchema);
