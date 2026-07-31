const crypto = require("crypto");
const Admin = require("../models/Admin");
const ApiResponse = require("../utils/ApiResponse");
const { sendEmail, generateOTPEmailTemplate } = require("../utils/sendEmail");

const sendTokenResponse = (admin, statusCode, res, message) => {
  const token = admin.generateJWT();
  const cookieOptions = {
    expires: new Date(
      Date.now() + Number(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/",
  };
  res.cookie("adminToken", token, cookieOptions);
  const adminData = {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    lastLogin: admin.lastLogin,
  };
  return ApiResponse.success(res, statusCode, message, { token, admin: adminData });
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, adminSecret } = req.body;
    if (adminSecret !== process.env.ADMIN_SIGNUP_SECRET) {
      return ApiResponse.error(res, 403, "Invalid admin secret. Registration not allowed.");
    }
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return ApiResponse.error(res, 409, "An admin with this email already exists.");
    }
    const admin = await Admin.create({ name, email, password });
    return sendTokenResponse(admin, 201, res, "Admin registered successfully");
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email }).select(
      "+password +loginAttempts +lockUntil"
    );
    if (!admin) {
      return ApiResponse.error(res, 401, "Invalid email or password.");
    }
    if (admin.isLocked) {
      const lockTime = Math.ceil((admin.lockUntil - Date.now()) / (1000 * 60));
      return ApiResponse.error(
        res, 423,
        `Account is temporarily locked. Try again in ${lockTime} minutes.`
      );
    }
    if (!admin.isActive) {
      return ApiResponse.error(res, 403, "Your account has been deactivated. Contact support.");
    }
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      await admin.incrementLoginAttempts();
      const remainingAttempts = 5 - (admin.loginAttempts + 1);
      if (remainingAttempts > 0) {
        return ApiResponse.error(
          res, 401,
          `Invalid email or password. ${remainingAttempts} attempts remaining before lockout.`
        );
      }
      return ApiResponse.error(
        res, 401,
        "Invalid email or password. Account is now locked for 2 hours."
      );
    }
    await admin.resetLoginAttempts();
    return sendTokenResponse(admin, 200, res, "Login successful");
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    res.cookie("adminToken", "loggedout", {
      expires: new Date(Date.now() + 5 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    });
    return ApiResponse.success(res, 200, "Logged out successfully");
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return ApiResponse.error(res, 404, "Admin not found.");
    }
    return ApiResponse.success(res, 200, "Admin profile retrieved successfully", {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      lastLogin: admin.lastLogin,
      createdAt: admin.createdAt,
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin._id).select("+password");
    if (!admin) {
      return ApiResponse.error(res, 404, "Admin not found.");
    }
    const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return ApiResponse.error(res, 401, "Current password is incorrect.");
    }
    admin.password = newPassword;
    await admin.save();
    res.cookie("adminToken", "loggedout", {
      expires: new Date(Date.now() + 5 * 1000),
      httpOnly: true,
    });
    return ApiResponse.success(res, 200, "Password changed successfully. Please login again.");
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return ApiResponse.success(
        res, 200,
        "If an account with that email exists, a reset code has been sent."
      );
    }
    if (!admin.isActive) {
      return ApiResponse.success(
        res, 200,
        "If an account with that email exists, a reset code has been sent."
      );
    }
    const otp = admin.createPasswordResetOTP();
    await admin.save({ validateBeforeSave: false });
    try {
      const html = generateOTPEmailTemplate(admin.name, otp);
      await sendEmail({
        to: admin.email,
        subject: "Password Reset Code - SoftSolvic Admin",
        html,
      });
      return ApiResponse.success(
        res, 200,
        "Password reset code sent to your email.",
        { email: admin.email }
      );
    } catch (emailError) {
      admin.passwordResetOTP = undefined;
      admin.passwordResetOTPExpires = undefined;
      await admin.save({ validateBeforeSave: false });
      return ApiResponse.error(
        res, 500,
        "Failed to send reset email. Please try again later."
      );
    }
  } catch (error) {
    next(error);
  }
};

const verifyResetOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");
    const admin = await Admin.findOne({
      email,
      passwordResetOTP: hashedOTP,
      passwordResetOTPExpires: { $gt: Date.now() },
    });
    if (!admin) {
      return ApiResponse.error(res, 400, "Invalid or expired verification code.");
    }
    const resetToken = admin.createPasswordResetToken();
    admin.passwordResetOTP = undefined;
    admin.passwordResetOTPExpires = undefined;
    await admin.save({ validateBeforeSave: false });
    return ApiResponse.success(res, 200, "Code verified successfully.", { resetToken });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const admin = await Admin.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });
    if (!admin) {
      return ApiResponse.error(res, 400, "Invalid or expired reset token.");
    }
    admin.password = newPassword;
    admin.passwordResetToken = undefined;
    admin.passwordResetExpires = undefined;
    admin.passwordResetOTP = undefined;
    admin.passwordResetOTPExpires = undefined;
    admin.loginAttempts = 0;
    admin.lockUntil = undefined;
    await admin.save();
    return ApiResponse.success(
      res, 200,
      "Password reset successfully. Please login with your new password."
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  changePassword,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
};