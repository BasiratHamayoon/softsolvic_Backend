const Portfolio = require("../models/Portfolio");
const cloudinary = require("../config/cloudinary");
const ApiResponse = require("../utils/ApiResponse");
const slugify = require("slugify");

const uploadImageToCloudinary = async (fileBuffer, folder, filename) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `softsalovic/${folder}`,
        public_id: filename,
        transformation: [
          { width: 1920, height: 1080, crop: "limit" },
          { quality: "auto:good" },
          { fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

const deleteImageFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(`Failed to delete image ${publicId} from Cloudinary:`, error.message);
  }
};

const generateUniqueSlug = async (title, excludeId = null) => {
  let slug = slugify(title, { lower: true, strict: true, trim: true });
  let counter = 0;
  let isUnique = false;

  while (!isUnique) {
    const query = { slug: counter === 0 ? slug : `${slug}-${counter}` };
    if (excludeId) query._id = { $ne: excludeId };

    const existing = await Portfolio.findOne(query);
    if (!existing) {
      isUnique = true;
      slug = counter === 0 ? slug : `${slug}-${counter}`;
    } else {
      counter++;
    }
  }

  return slug;
};

const getAllPortfolios = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      isFeatured,
      isPublished,
      search,
      sortBy = "order",
      sortOrder = "asc",
    } = req.query;

    const query = {};

    if (category && category !== "all") query.category = category;
    if (isFeatured !== undefined) query.isFeatured = isFeatured === "true";
    if (isPublished !== undefined) query.isPublished = isPublished === "true";

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { technologies: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const sortOptions = {};
    const validSortFields = ["order", "createdAt", "title", "completionDate"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "order";
    sortOptions[sortField] = sortOrder === "desc" ? -1 : 1;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [portfolios, totalCount] = await Promise.all([
      Portfolio.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate("createdBy", "name email")
        .lean(),
      Portfolio.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    return ApiResponse.success(
      res,
      200,
      "Portfolios retrieved successfully",
      portfolios,
      {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      }
    );
  } catch (error) {
    next(error);
  }
};

const getPublicPortfolios = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 9,
      category,
      isFeatured,
      search,
    } = req.query;

    const query = { isPublished: true };

    if (category && category !== "all") query.category = category;
    if (isFeatured !== undefined) query.isFeatured = isFeatured === "true";

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { technologies: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [portfolios, totalCount] = await Promise.all([
      Portfolio.find(query)
        .sort({ isFeatured: -1, order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select("-createdBy -__v")
        .lean(),
      Portfolio.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    return ApiResponse.success(
      res,
      200,
      "Portfolios retrieved successfully",
      portfolios,
      {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      }
    );
  } catch (error) {
    next(error);
  }
};

const getFeaturedPortfolios = async (req, res, next) => {
  try {
    const limit = Math.min(20, parseInt(req.query.limit) || 6);

    const portfolios = await Portfolio.find({
      isFeatured: true,
      isPublished: true,
    })
      .sort({ order: 1, createdAt: -1 })
      .limit(limit)
      .select("-createdBy -__v")
      .lean();

    return ApiResponse.success(
      res,
      200,
      "Featured portfolios retrieved successfully",
      portfolios
    );
  } catch (error) {
    next(error);
  }
};

const getPortfolioById = async (req, res, next) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id)
      .populate("createdBy", "name email")
      .lean();

    if (!portfolio) {
      return ApiResponse.error(res, 404, "Portfolio not found.");
    }

    return ApiResponse.success(res, 200, "Portfolio retrieved successfully", portfolio);
  } catch (error) {
    next(error);
  }
};

const getPortfolioBySlug = async (req, res, next) => {
  try {
    const portfolio = await Portfolio.findOne({
      slug: req.params.slug,
      isPublished: true,
    })
      .select("-createdBy -__v")
      .lean();

    if (!portfolio) {
      return ApiResponse.error(res, 404, "Portfolio not found.");
    }

    return ApiResponse.success(res, 200, "Portfolio retrieved successfully", portfolio);
  } catch (error) {
    next(error);
  }
};

const createPortfolio = async (req, res, next) => {
  try {
    const {
      title,
      description,
      shortDescription,
      category,
      technologies,
      liveUrl,
      githubUrl,
      clientName,
      completionDate,
      isFeatured,
      isPublished,
      order,
    } = req.body;

    let technologiesArray = [];
    if (technologies) {
      if (Array.isArray(technologies)) {
        technologiesArray = technologies;
      } else if (typeof technologies === "string") {
        technologiesArray = technologies.split(",").map((t) => t.trim()).filter(Boolean);
      }
    }

    const slug = await generateUniqueSlug(title);

    let imagesData = [];

    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(async (file, index) => {
        const filename = `portfolio_${slug}_${Date.now()}_${index}`;
        const result = await uploadImageToCloudinary(
          file.buffer,
          "portfolios",
          filename
        );
        return {
          url: result.secure_url,
          publicId: result.public_id,
          alt: title,
          isThumbnail: index === 0,
        };
      });

      imagesData = await Promise.all(uploadPromises);
    }

    const portfolio = await Portfolio.create({
      title,
      slug,
      description,
      shortDescription,
      category,
      technologies: technologiesArray,
      images: imagesData,
      liveUrl,
      githubUrl,
      clientName,
      completionDate,
      isFeatured: isFeatured === "true" || isFeatured === true,
      isPublished:
        isPublished !== undefined
          ? isPublished === "true" || isPublished === true
          : true,
      order: order ? parseInt(order) : 0,
      createdBy: req.admin._id,
    });

    return ApiResponse.success(res, 201, "Portfolio created successfully", portfolio);
  } catch (error) {
    next(error);
  }
};

const updatePortfolio = async (req, res, next) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);

    if (!portfolio) {
      return ApiResponse.error(res, 404, "Portfolio not found.");
    }

    const updateFields = {};
    const allowedFields = [
      "title",
      "description",
      "shortDescription",
      "category",
      "liveUrl",
      "githubUrl",
      "clientName",
      "completionDate",
      "isFeatured",
      "isPublished",
      "order",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "isFeatured" || field === "isPublished") {
          updateFields[field] =
            req.body[field] === "true" || req.body[field] === true;
        } else if (field === "order") {
          updateFields[field] = parseInt(req.body[field]);
        } else {
          updateFields[field] = req.body[field];
        }
      }
    });

    if (req.body.technologies !== undefined) {
      if (Array.isArray(req.body.technologies)) {
        updateFields.technologies = req.body.technologies;
      } else if (typeof req.body.technologies === "string") {
        updateFields.technologies = req.body.technologies
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }
    }

    if (updateFields.title && updateFields.title !== portfolio.title) {
      updateFields.slug = await generateUniqueSlug(
        updateFields.title,
        portfolio._id
      );
    }

    if (req.files && req.files.length > 0) {
      const filename = `portfolio_${portfolio.slug}_${Date.now()}`;
      const uploadPromises = req.files.map(async (file, index) => {
        const result = await uploadImageToCloudinary(
          file.buffer,
          "portfolios",
          `${filename}_${index}`
        );
        return {
          url: result.secure_url,
          publicId: result.public_id,
          alt: updateFields.title || portfolio.title,
          isThumbnail: false,
        };
      });

      const newImages = await Promise.all(uploadPromises);
      updateFields.images = [...portfolio.images, ...newImages];

      if (
        updateFields.images.length > 0 &&
        !updateFields.images.some((img) => img.isThumbnail)
      ) {
        updateFields.images[0].isThumbnail = true;
      }
    }

    const updatedPortfolio = await Portfolio.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).populate("createdBy", "name email");

    return ApiResponse.success(
      res,
      200,
      "Portfolio updated successfully",
      updatedPortfolio
    );
  } catch (error) {
    next(error);
  }
};

const deletePortfolioImage = async (req, res, next) => {
  try {
    const { id, imageId } = req.params;

    const portfolio = await Portfolio.findById(id);

    if (!portfolio) {
      return ApiResponse.error(res, 404, "Portfolio not found.");
    }

    const imageIndex = portfolio.images.findIndex(
      (img) => img._id.toString() === imageId
    );

    if (imageIndex === -1) {
      return ApiResponse.error(res, 404, "Image not found in this portfolio.");
    }

    const imageToDelete = portfolio.images[imageIndex];
    await deleteImageFromCloudinary(imageToDelete.publicId);

    portfolio.images.splice(imageIndex, 1);

    if (
      portfolio.images.length > 0 &&
      !portfolio.images.some((img) => img.isThumbnail)
    ) {
      portfolio.images[0].isThumbnail = true;
    }

    await portfolio.save();

    return ApiResponse.success(res, 200, "Image deleted successfully", portfolio);
  } catch (error) {
    next(error);
  }
};

const setThumbnail = async (req, res, next) => {
  try {
    const { id, imageId } = req.params;

    const portfolio = await Portfolio.findById(id);

    if (!portfolio) {
      return ApiResponse.error(res, 404, "Portfolio not found.");
    }

    const imageExists = portfolio.images.some(
      (img) => img._id.toString() === imageId
    );

    if (!imageExists) {
      return ApiResponse.error(res, 404, "Image not found in this portfolio.");
    }

    portfolio.images = portfolio.images.map((img) => ({
      ...img.toObject(),
      isThumbnail: img._id.toString() === imageId,
    }));

    await portfolio.save();

    return ApiResponse.success(res, 200, "Thumbnail updated successfully", portfolio);
  } catch (error) {
    next(error);
  }
};

const deletePortfolio = async (req, res, next) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);

    if (!portfolio) {
      return ApiResponse.error(res, 404, "Portfolio not found.");
    }

    if (portfolio.images && portfolio.images.length > 0) {
      const deletePromises = portfolio.images.map((image) =>
        deleteImageFromCloudinary(image.publicId)
      );
      await Promise.allSettled(deletePromises);
    }

    await Portfolio.findByIdAndDelete(req.params.id);

    return ApiResponse.success(res, 200, "Portfolio deleted successfully");
  } catch (error) {
    next(error);
  }
};

const getPortfolioStats = async (req, res, next) => {
  try {
    const [
      totalPortfolios,
      publishedPortfolios,
      featuredPortfolios,
      categoryStats,
    ] = await Promise.all([
      Portfolio.countDocuments(),
      Portfolio.countDocuments({ isPublished: true }),
      Portfolio.countDocuments({ isFeatured: true }),
      Portfolio.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return ApiResponse.success(res, 200, "Portfolio statistics retrieved successfully", {
      totalPortfolios,
      publishedPortfolios,
      unpublishedPortfolios: totalPortfolios - publishedPortfolios,
      featuredPortfolios,
      categoryStats,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPortfolios,
  getPublicPortfolios,
  getFeaturedPortfolios,
  getPortfolioById,
  getPortfolioBySlug,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  deletePortfolioImage,
  setThumbnail,
  getPortfolioStats,
};