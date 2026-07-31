const { body, param, validationResult } = require("express-validator");
const ApiResponse = require("../utils/ApiResponse");

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    return ApiResponse.error(res, 422, "Validation failed", extractedErrors);
  }
  next();
};

const createPortfolioValidator = [
  body("title")
    .trim()
    .notEmpty().withMessage("Title is required")
    .isLength({ min: 3, max: 100 }).withMessage("Title must be between 3 and 100 characters"),

  body("description")
    .trim()
    .notEmpty().withMessage("Description is required")
    .isLength({ min: 10, max: 2000 }).withMessage("Description must be between 10 and 2000 characters"),

  body("shortDescription")
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage("Short description cannot exceed 300 characters"),

  body("category")
    .trim()
    .notEmpty().withMessage("Category is required")
    .isIn([
      "web-development",
      "mobile-app",
      "ui-ux",
      "e-commerce",
      "custom-software",
      "other",
    ])
    .withMessage("Invalid category"),

  body("technologies")
    .optional()
    .custom((value) => {
      if (typeof value === "string") {
        return true;
      }
      if (Array.isArray(value)) {
        return true;
      }
      throw new Error("Technologies must be an array or comma-separated string");
    }),

  body("liveUrl")
    .optional()
    .trim()
    .isURL({ require_protocol: true }).withMessage("Please provide a valid URL with protocol (http/https)"),

  body("githubUrl")
    .optional()
    .trim()
    .isURL({ require_protocol: true }).withMessage("Please provide a valid GitHub URL"),

  body("clientName")
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage("Client name cannot exceed 100 characters"),

  body("completionDate")
    .optional()
    .isISO8601().withMessage("Please provide a valid date"),

  body("isFeatured")
    .optional()
    .isBoolean().withMessage("isFeatured must be a boolean"),

  body("isPublished")
    .optional()
    .isBoolean().withMessage("isPublished must be a boolean"),

  body("order")
    .optional()
    .isInt({ min: 0 }).withMessage("Order must be a non-negative integer"),

  handleValidationErrors,
];

const updatePortfolioValidator = [
  param("id")
    .isMongoId().withMessage("Invalid portfolio ID"),

  body("title")
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage("Title must be between 3 and 100 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 }).withMessage("Description must be between 10 and 2000 characters"),

  body("shortDescription")
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage("Short description cannot exceed 300 characters"),

  body("category")
    .optional()
    .isIn([
      "web-development",
      "mobile-app",
      "ui-ux",
      "e-commerce",
      "custom-software",
      "other",
    ])
    .withMessage("Invalid category"),

  body("liveUrl")
    .optional()
    .trim()
    .isURL({ require_protocol: true }).withMessage("Please provide a valid URL"),

  body("isFeatured")
    .optional()
    .isBoolean().withMessage("isFeatured must be a boolean"),

  body("isPublished")
    .optional()
    .isBoolean().withMessage("isPublished must be a boolean"),

  handleValidationErrors,
];

const mongoIdValidator = [
  param("id")
    .isMongoId().withMessage("Invalid ID format"),
  handleValidationErrors,
];

module.exports = {
  createPortfolioValidator,
  updatePortfolioValidator,
  mongoIdValidator,
};