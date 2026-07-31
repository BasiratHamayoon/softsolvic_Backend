const express = require("express");
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  changePassword,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const {
  registerValidator,
  loginValidator,
  changePasswordValidator,
  forgotPasswordValidator,
  verifyOTPValidator,
  resetPasswordValidator,
} = require("../validators/authValidator");

router.post("/register", registerValidator, register);
router.post("/login", loginValidator, login);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.put("/change-password", protect, changePasswordValidator, changePassword);
router.post("/forgot-password", forgotPasswordValidator, forgotPassword);
router.post("/verify-reset-otp", verifyOTPValidator, verifyResetOTP);
router.post("/reset-password", resetPasswordValidator, resetPassword);

module.exports = router;