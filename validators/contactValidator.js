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

const createContactValidator = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 80 }).withMessage("Name must be between 2 and 80 characters"),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("phone")
    .optional()
    .trim()
    .matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/)
    .withMessage("Please provide a valid phone number"),

  body("subject")
    .trim()
    .notEmpty().withMessage("Subject is required")
    .isLength({ min: 3, max: 150 }).withMessage("Subject must be between 3 and 150 characters"),

  body("message")
    .trim()
    .notEmpty().withMessage("Message is required")
    .isLength({ min: 10, max: 2000 }).withMessage("Message must be between 10 and 2000 characters"),

  handleValidationErrors,
];

const updateContactStatusValidator = [
  param("id")
    .isMongoId().withMessage("Invalid contact ID"),

  body("status")
    .notEmpty().withMessage("Status is required")
    .isIn(["unread", "read", "replied", "archived"])
    .withMessage("Invalid status value"),

  body("adminNotes")
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage("Admin notes cannot exceed 500 characters"),

  handleValidationErrors,
];

const mongoIdValidator = [
  param("id")
    .isMongoId().withMessage("Invalid ID format"),
  handleValidationErrors,
];

module.exports = {
  createContactValidator,
  updateContactStatusValidator,
  mongoIdValidator,
};