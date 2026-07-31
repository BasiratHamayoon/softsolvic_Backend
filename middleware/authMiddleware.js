const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.adminToken) {
      token = req.cookies.adminToken;
    }

    if (!token) {
      return ApiResponse.error(res, 401, "Access denied. No token provided.");
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return ApiResponse.error(res, 401, "Token has expired. Please login again.");
      }
      return ApiResponse.error(res, 401, "Invalid token. Please login again.");
    }

    const admin = await Admin.findById(decoded.id).select(
      "+password +loginAttempts +lockUntil"
    );

    if (!admin) {
      return ApiResponse.error(res, 401, "Admin account no longer exists.");
    }

    if (!admin.isActive) {
      return ApiResponse.error(res, 403, "Your account has been deactivated.");
    }

    if (admin.changedPasswordAfter(decoded.iat)) {
      return ApiResponse.error(
        res,
        401,
        "Password was recently changed. Please login again."
      );
    }

    req.admin = admin;
    next();
  } catch (error) {
    return ApiResponse.error(res, 500, "Authentication failed.");
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.admin.role)) {
      return ApiResponse.error(
        res,
        403,
        `Role '${req.admin.role}' is not authorized to access this route.`
      );
    }
    next();
  };
};

module.exports = { protect, authorize };