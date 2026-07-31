const express = require("express");
const router = express.Router();
const {
  createContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
  getContactStats,
  bulkUpdateStatus,
} = require("../controllers/contactController");
const { protect } = require("../middleware/authMiddleware");

router.post("/", createContact);

router.get("/", protect, getAllContacts);
router.get("/stats", protect, getContactStats);
router.get("/:id", protect, getContactById);
router.put("/:id/status", protect, updateContactStatus);
router.delete("/:id", protect, deleteContact);
router.patch("/bulk-status", protect, bulkUpdateStatus);

module.exports = router;