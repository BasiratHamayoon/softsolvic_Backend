const mongoose = require("mongoose");
const slugify = require("slugify");

const portfolioSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [300, "Short description cannot exceed 300 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: [
          "web-development",
          "mobile-app",
          "ui-ux",
          "e-commerce",
          "custom-software",
          "other",
        ],
        message: "{VALUE} is not a valid category",
      },
    },
    technologies: [
      {
        type: String,
        trim: true,
      },
    ],
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          required: true,
        },
        alt: {
          type: String,
          default: "",
        },
        isThumbnail: {
          type: Boolean,
          default: false,
        },
      },
    ],
    liveUrl: {
      type: String,
      trim: true,
    },
    githubUrl: {
      type: String,
      trim: true,
    },
    clientName: {
      type: String,
      trim: true,
      maxlength: [100, "Client name cannot exceed 100 characters"],
    },
    completionDate: {
      type: Date,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

portfolioSchema.index({ slug: 1 });
portfolioSchema.index({ category: 1 });
portfolioSchema.index({ isFeatured: 1 });
portfolioSchema.index({ isPublished: 1 });
portfolioSchema.index({ order: 1 });

portfolioSchema.virtual("thumbnail").get(function () {
  const thumb = this.images.find((img) => img.isThumbnail);
  return thumb ? thumb.url : this.images[0]?.url || null;
});

portfolioSchema.pre("save", function () {
  if (this.isModified("title")) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
      trim: true,
    });
  }
});

const Portfolio = mongoose.model("Portfolio", portfolioSchema);
module.exports = Portfolio;