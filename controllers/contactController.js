const Contact = require("../models/Contact");
const ApiResponse = require("../utils/ApiResponse");
const sendEmail = require("../utils/sendEmail");

const createContact = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "unknown";

    const userAgent = req.headers["user-agent"] || "unknown";

    const contact = await Contact.create({
      name,
      email,
      phone,
      subject,
      message,
      ipAddress,
      userAgent,
    });

    try {
      await sendEmail({
        to: process.env.EMAIL_USER,
        subject: `New Contact Form Submission: ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">New Contact Form Submission</h2>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tr style="background-color: #f8f9fa;">
                <td style="padding: 10px; font-weight: bold; width: 30%; border: 1px solid #dee2e6;">Name</td>
                <td style="padding: 10px; border: 1px solid #dee2e6;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold; border: 1px solid #dee2e6;">Email</td>
                <td style="padding: 10px; border: 1px solid #dee2e6;"><a href="mailto:${email}">${email}</a></td>
              </tr>
              <tr style="background-color: #f8f9fa;">
                <td style="padding: 10px; font-weight: bold; border: 1px solid #dee2e6;">Phone</td>
                <td style="padding: 10px; border: 1px solid #dee2e6;">${phone || "Not provided"}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold; border: 1px solid #dee2e6;">Subject</td>
                <td style="padding: 10px; border: 1px solid #dee2e6;">${subject}</td>
              </tr>
              <tr style="background-color: #f8f9fa;">
                <td style="padding: 10px; font-weight: bold; border: 1px solid #dee2e6;">Message</td>
                <td style="padding: 10px; border: 1px solid #dee2e6;">${message}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold; border: 1px solid #dee2e6;">Received At</td>
                <td style="padding: 10px; border: 1px solid #dee2e6;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>
        `,
      });

      await sendEmail({
        to: email,
        subject: "Thank you for contacting SoftSalovic!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #333;">Thank you, ${name}!</h2>
            <p style="color: #555; line-height: 1.6;">
              We have received your message and appreciate you reaching out to us. 
              Our team will review your inquiry and get back to you within 24-48 hours.
            </p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Your message:</strong></p>
              <p style="color: #555; margin-top: 10px;">${message}</p>
            </div>
            <p style="color: #555;">Best regards,<br><strong>SoftSalovic Team</strong></p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);
    }

    return ApiResponse.success(
      res,
      201,
      "Your message has been sent successfully. We will get back to you soon.",
      {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        createdAt: contact.createdAt,
      }
    );
  } catch (error) {
    next(error);
  }
};

const getAllContacts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    if (status) query.status = status;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
      ];
    }

    const sortOptions = {};
    const validSortFields = ["createdAt", "name", "email", "status"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    sortOptions[sortField] = sortOrder === "asc" ? 1 : -1;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [contacts, totalCount] = await Promise.all([
      Contact.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Contact.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    return ApiResponse.success(
      res,
      200,
      "Contacts retrieved successfully",
      contacts,
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

const getContactById = async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return ApiResponse.error(res, 404, "Contact not found.");
    }

    if (contact.status === "unread") {
      await Contact.findByIdAndUpdate(req.params.id, { status: "read" });
      contact.status = "read";
    }

    return ApiResponse.success(res, 200, "Contact retrieved successfully", contact);
  } catch (error) {
    next(error);
  }
};

const updateContactStatus = async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;

    const updateData = { status };
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!contact) {
      return ApiResponse.error(res, 404, "Contact not found.");
    }

    return ApiResponse.success(res, 200, "Contact status updated successfully", contact);
  } catch (error) {
    next(error);
  }
};

const deleteContact = async (req, res, next) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);

    if (!contact) {
      return ApiResponse.error(res, 404, "Contact not found.");
    }

    return ApiResponse.success(res, 200, "Contact deleted successfully");
  } catch (error) {
    next(error);
  }
};

const getContactStats = async (req, res, next) => {
  try {
    const [totalContacts, unreadContacts, readContacts, repliedContacts, archivedContacts] =
      await Promise.all([
        Contact.countDocuments(),
        Contact.countDocuments({ status: "unread" }),
        Contact.countDocuments({ status: "read" }),
        Contact.countDocuments({ status: "replied" }),
        Contact.countDocuments({ status: "archived" }),
      ]);

    const recentContacts = await Contact.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email subject status createdAt")
      .lean();

    return ApiResponse.success(res, 200, "Contact statistics retrieved successfully", {
      totalContacts,
      unreadContacts,
      readContacts,
      repliedContacts,
      archivedContacts,
      recentContacts,
    });
  } catch (error) {
    next(error);
  }
};

const bulkUpdateStatus = async (req, res, next) => {
  try {
    const { ids, status } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return ApiResponse.error(res, 400, "Please provide an array of contact IDs.");
    }

    const validStatuses = ["unread", "read", "replied", "archived"];
    if (!validStatuses.includes(status)) {
      return ApiResponse.error(res, 400, "Invalid status value.");
    }

    const result = await Contact.updateMany(
      { _id: { $in: ids } },
      { $set: { status } }
    );

    return ApiResponse.success(res, 200, `${result.modifiedCount} contacts updated successfully`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
  getContactStats,
  bulkUpdateStatus,
};