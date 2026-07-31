const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text: text || "",
    html: html || "",
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

const generateOTPEmailTemplate = (name, otp) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:48px 16px;">
<tr>
<td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06);">
<tr>
<td style="background-color:#0a1628;padding:32px 40px;text-align:center;">
<h1 style="color:#0ea5d6;font-size:22px;margin:0 0 4px 0;font-weight:700;letter-spacing:0.5px;">SoftSolvic</h1>
<p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0;font-weight:400;">Admin Panel</p>
</td>
</tr>
<tr>
<td style="padding:40px;">
<h2 style="color:#0a1628;font-size:18px;margin:0 0 8px 0;font-weight:700;">Password Reset</h2>
<p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 28px 0;">
Hello <strong style="color:#0a1628;">${name}</strong>, you requested to reset your password. Use the code below to proceed.
</p>
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:24px;text-align:center;">
<p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px 0;font-weight:600;">Verification Code</p>
<p style="color:#0a1628;font-size:32px;font-weight:800;letter-spacing:6px;margin:0;font-family:'Courier New',monospace;">${otp}</p>
</td>
</tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
<tr>
<td style="background-color:#fefce8;border-left:3px solid #eab308;border-radius:0 6px 6px 0;padding:12px 16px;">
<p style="color:#854d0e;font-size:13px;margin:0;line-height:1.5;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
</td>
</tr>
</table>
<p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:24px 0 0 0;">
If you did not make this request, you can safely ignore this email.
</p>
</td>
</tr>
<tr>
<td style="background-color:#f8fafc;padding:16px 40px;text-align:center;border-top:1px solid #f1f5f9;">
<p style="color:#94a3b8;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} SoftSolvic. All rights reserved.</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
};

const generateContactNotificationTemplate = (contact) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:48px 16px;">
<tr>
<td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06);">
<tr>
<td style="background-color:#0a1628;padding:32px 40px;text-align:center;">
<h1 style="color:#0ea5d6;font-size:22px;margin:0 0 4px 0;font-weight:700;letter-spacing:0.5px;">SoftSolvic</h1>
<p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0;font-weight:400;">New Contact Message</p>
</td>
</tr>
<tr>
<td style="padding:40px;">
<h2 style="color:#0a1628;font-size:18px;margin:0 0 8px 0;font-weight:700;">New Inquiry Received</h2>
<p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 28px 0;">
You have received a new contact form submission. Details below:
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
<tr>
<td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;">
<p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px 0;font-weight:600;">Name</p>
<p style="color:#0a1628;font-size:14px;margin:0;font-weight:600;">${contact.name}</p>
</td>
</tr>
<tr>
<td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;">
<p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px 0;font-weight:600;">Email</p>
<p style="color:#0ea5d6;font-size:14px;margin:0;font-weight:600;">${contact.email}</p>
</td>
</tr>
${contact.phone ? `<tr>
<td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;">
<p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px 0;font-weight:600;">Phone</p>
<p style="color:#0a1628;font-size:14px;margin:0;font-weight:600;">${contact.phone}</p>
</td>
</tr>` : ""}
${contact.subject ? `<tr>
<td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;">
<p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px 0;font-weight:600;">Subject</p>
<p style="color:#0a1628;font-size:14px;margin:0;font-weight:600;">${contact.subject}</p>
</td>
</tr>` : ""}
<tr>
<td style="padding:14px 20px;">
<p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px 0;font-weight:600;">Message</p>
<p style="color:#0a1628;font-size:14px;margin:0;line-height:1.6;">${contact.message}</p>
</td>
</tr>
</table>
<p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:24px 0 0 0;">
Received on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
</p>
</td>
</tr>
<tr>
<td style="background-color:#f8fafc;padding:16px 40px;text-align:center;border-top:1px solid #f1f5f9;">
<p style="color:#94a3b8;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} SoftSolvic. All rights reserved.</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
};

const generateContactReplyTemplate = (name, replyMessage) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:48px 16px;">
<tr>
<td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06);">
<tr>
<td style="background-color:#0a1628;padding:32px 40px;text-align:center;">
<h1 style="color:#0ea5d6;font-size:22px;margin:0 0 4px 0;font-weight:700;letter-spacing:0.5px;">SoftSolvic</h1>
<p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0;font-weight:400;">We Got Back To You</p>
</td>
</tr>
<tr>
<td style="padding:40px;">
<h2 style="color:#0a1628;font-size:18px;margin:0 0 8px 0;font-weight:700;">Hello ${name},</h2>
<p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 28px 0;">
Thank you for reaching out. Here is our response to your inquiry:
</p>
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="background-color:#f8fafc;border-left:3px solid #0ea5d6;border-radius:0 8px 8px 0;padding:20px 24px;">
<p style="color:#0a1628;font-size:14px;margin:0;line-height:1.7;white-space:pre-line;">${replyMessage}</p>
</td>
</tr>
</table>
<p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:28px 0 0 0;">
If you have further questions, feel free to reply to this email.
</p>
</td>
</tr>
<tr>
<td style="background-color:#f8fafc;padding:16px 40px;text-align:center;border-top:1px solid #f1f5f9;">
<p style="color:#94a3b8;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} SoftSolvic. All rights reserved.</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
};

module.exports = {
  sendEmail,
  generateOTPEmailTemplate,
  generateContactNotificationTemplate,
  generateContactReplyTemplate,
};