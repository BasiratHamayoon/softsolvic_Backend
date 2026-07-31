const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
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
} = require("../controllers/portfolioController");
const multer = require("multer");
const {
  createPortfolioValidator,
  updatePortfolioValidator,
  mongoIdValidator,
} = require("../validators/portfolioValidator");

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WEBP images are allowed"), false);
    }
  },
});

router.get("/public", getPublicPortfolios);
router.get("/public/:id", getPortfolioById);
router.get("/featured", getFeaturedPortfolios);
router.get("/slug/:slug", getPortfolioBySlug);

router.use(protect);

router.get("/stats", getPortfolioStats);
router.get("/", getAllPortfolios);
router.get("/:id", getPortfolioById);
router.post("/", upload.array("images", 10), createPortfolioValidator, createPortfolio);
router.put("/:id", upload.array("images", 10), updatePortfolioValidator, updatePortfolio);
router.delete("/:id", mongoIdValidator, deletePortfolio);
router.delete("/:id/images/:imageId", mongoIdValidator, deletePortfolioImage);
router.patch("/:id/thumbnail/:imageId", mongoIdValidator, setThumbnail);

module.exports = router;