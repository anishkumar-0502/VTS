const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require("fs");
const path = require("path");
const logger = require('../utils/logger');

// Create a transporter object
let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com", // Gmail SMTP server
    port: 465, // 465 for SSL or 587 for TLS
    secure: true, // true for SSL
    auth: {
        user: "info@outdidunified.com", // Your Gmail email address
        pass: "yylh zjwo psvr slqb", // App Password (not your regular Gmail password)
    },
});
// Function to send email
const sendEmail = async (to, subject, text) => {
    try {
        // Define email options
        let info = await transporter.sendMail({
            from: '"VTS - TrackIT" <anish@outdidtech.com>', // sender address
            to: to, // list of receivers
            subject: subject, // Subject line
            text: text, // plain text body
            html: `<p>${text}</p>`, // HTML body
        });

        logger.loggerSuccess(`Message sent: ${info.messageId}`);
        console
        return true;
    } catch (error) {
        logger.loggerError(`Error sending email: ${error}`);
        return false;
    }
}
const EmailConfig = async (email, mailHead, otp) => {
    try {
        let sendTo = email;
        let mail_subject;
        let mail_body;
        if (mailHead === 'OTP') {
            mail_subject = 'Ion Hive - OTP';
            mail_body = `
                <html>
                    <head>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                margin: 0;
                                padding: 20px;
                                background-color: #f4f4f4;
                            }
                            .container {
                                background-color: #ffffff;
                                border-radius: 8px;
                                padding: 20px;
                                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                            }
                            h2 {
                                color: #333;
                            }
                            p {
                                color: #555;
                                line-height: 1.6;
                            }
                            .otp {
                                font-weight: bold;
                                font-size: 1.2em;
                                color: #007BFF; /* Bootstrap primary color */
                                background-color: #e9f5ff; /* Light background for the OTP */
                                padding: 10px;
                                border-radius: 4px;
                                display: inline-block;
                            }
                            .footer {
                                margin-top: 20px;
                                font-size: 0.9em;
                                color: #888;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h2>Hello ${email},</h2>
                            <p>We received a request to log in or register with your account. Please use the following One-Time Password (OTP) to proceed with the process:</p>
                            <p>Your OTP is: <span class="otp">${otp}</span></p>
                            <p class="footer">Thank you,<br>EV POWER</p>
                        </div>
                    </body>
                </html>
            `;
        } else if (mailHead === 'deleteAccount') {
            mail_subject = 'Ion Hive - account deletion'
            mail_body = `
                <html>
                    <head>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                margin: 0;
                                padding: 20px;
                                background-color: #f4f4f4;
                            }
                            .container {
                                background-color: #ffffff;
                                border-radius: 8px;
                                padding: 20px;
                                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                            }
                            h2 {
                                color: #333;
                            }
                            p {
                                color: #555;
                                line-height: 1.6;
                            }
                            .otp {
                                font-weight: bold;
                                font-size: 1.2em;
                                color: #007BFF; /* Bootstrap primary color */
                                background-color: #e9f5ff; /* Light background for the OTP */
                                padding: 10px;
                                border-radius: 4px;
                                display: inline-block;
                            }
                            .footer {
                                margin-top: 20px;
                                font-size: 0.9em;
                                color: #888;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h2>Hello ${email},</h2>
                            <p>Your Ion Hive account is deleted successfully !</p>
                            <p class="footer">Thank you,<br>Ion Hive</p>
                        </div>
                    </body>
                </html>
            `;
        }

        const result = await sendEmail(sendTo, mail_subject, mail_body);
        return result;
    } catch (error) {
        logger.loggerError(`Error sending email: ${error}`);
        return false;
    }
}
const sendPaymentEmail = async (email, amount, transactionId, date, paymentMethod) => {
    try {
        const doc = new PDFDocument({ margin: 50 });
        const pdfPath = path.join(__dirname, `receipt_${transactionId}.pdf`);
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);



        // Invoice Title (Centered)
        doc.moveDown(2);
        doc.fontSize(22).font("Helvetica-Bold").text("Payment Receipt", { align: "center" }).moveDown(1);

        // Company Details (Aligned Left)
        doc.fontSize(12).font("Helvetica").text("VTS - TrackIT", 50, 130);
        doc.text("57, 7th Main Rd,", 50);
        doc.text("Mahadeshwara Nagar, BTM 2nd Stage,", 50);
        doc.text("BTM Layout, Bengaluru,", 50);
        doc.text("Karnataka, India - 560076", 50).moveDown(1);

        // Draw Divider Line
        doc.moveTo(50, 205).lineTo(550, 205).stroke();


        const startX = 50, startY = 220, col2X = 250, rowHeight = 25;
        doc.fontSize(12).font("Helvetica");

        const transactionDetails = [
            { label: "Transaction ID:", value: transactionId },
            { label: "Amount Paid:", value: `Rs.${amount}` },
            { label: "Payment Method:", value: paymentMethod },
            { label: "Transaction Date:", value: new Date(date).toLocaleString() }
        ];

        transactionDetails.forEach((item, index) => {
            const y = startY + index * rowHeight;
            doc.text(item.label, startX, y);
            doc.text(item.value, col2X, y);
        });


        // Footer Line & Support Information
        doc.moveTo(50, 700).lineTo(550, 700).stroke();
        doc.fontSize(10).font("Helvetica").text("For support, contact info@outdidunified.com", 50, 710);

        // Finalize PDF
        doc.end();
        await new Promise((resolve) => writeStream.on("finish", resolve));

        // Mail configuration
        const mailOptions = {
            from: '"VTS - TrackIT" <anish@outdidtech.com>',
            to: email,
            subject: "Payment Confirmation - IonHive",
            html: `
                <h2>Payment Successful</h2>
                <p>Dear User,</p>
                <p>Your payment has been successfully processed.</p>
                <ul>
                    <li><b>Transaction ID:</b> ${transactionId}</li>
                    <li><b>Amount:</b> ₹${amount}</li>
                    <li><b>Payment Method:</b> ${paymentMethod}</li>
                    <li><b>Date:</b> ${new Date(date).toLocaleString()}</li>
                </ul>
                <p>Attached is your payment receipt.</p>
                <p>Thank you for using IonHive!</p>
            `,
            attachments: [
                {
                    filename: `receipt_${transactionId}.pdf`,
                    path: pdfPath,
                    contentType: "application/pdf",
                },
            ],
        };

        await transporter.sendMail(mailOptions);
        logger.loggerSuccess(`Email sent successfully to ${email}`);

        fs.unlinkSync(pdfPath);
    } catch (error) {
        logger.loggerError(`Error sending email: ${error.message}`);
    }
};

const sendCredentialsEmail = async (email, name, password, role) => {
    try {
        const mongoose = require('mongoose');
        const Role = mongoose.model('Role');

        const roleDoc = await Role.findOne({ role_id: role });
        const roleLabel = roleDoc ? roleDoc.role_name.charAt(0).toUpperCase() + roleDoc.role_name.slice(1) : 'User';
        const mail_subject = 'VTS - Your Account Credentials';
        const mail_body = `
            <html>
                <head>
                    <style>
                        body {
                            font-family: 'Segoe UI', Arial, sans-serif;
                            margin: 0;
                            padding: 0;
                            background-color: #f5f7fb;
                            color: #1f2937;
                        }
                        .container {
                            width: 100%;
                            padding: 20px;
                        }
                        .card {
                            max-width: 520px;
                            margin: 0 auto;
                            background: #ffffff;
                            border-radius: 14px;
                            box-shadow: 0 18px 45px rgba(15, 23, 42, 0.15);
                            overflow: hidden;
                        }
                        .header {
                            background: linear-gradient(135deg, #0ea5e9, #2563eb);
                            padding: 26px 32px;
                            color: #ffffff;
                        }
                        .header h2 {
                            margin: 0;
                            font-size: 24px;
                            font-weight: 600;
                        }
                        .header p {
                            margin: 8px 0 0;
                            font-size: 15px;
                            opacity: 0.95;
                        }
                        .content {
                            padding: 30px 32px 28px;
                        }
                        .meta {
                            font-size: 14px;
                            color: #64748b;
                            margin-bottom: 18px;
                        }
                        .credentials {
                            border: 1px solid #e2e8f0;
                            border-radius: 12px;
                            padding: 18px 20px;
                            background-color: #f8fafc;
                        }
                        .credentials h3 {
                            margin: 0 0 14px;
                            font-size: 16px;
                            font-weight: 600;
                            color: #1d4ed8;
                        }
                        .credential-item {
                            margin-bottom: 12px;
                        }
                        .credential-item span {
                            display: block;
                            font-size: 13px;
                            color: #475569;
                            margin-bottom: 4px;
                        }
                        .credential-value {
                            font-size: 16px;
                            font-weight: 600;
                            color: #0f172a;
                            word-break: break-word;
                            letter-spacing: 0.4px;
                        }
                        .password-hint {
                            margin-top: 16px;
                            padding: 14px;
                            border-radius: 10px;
                            background-color: #eff6ff;
                            border: 1px solid #bfdbfe;
                            font-size: 13px;
                            color: #1e40af;
                            line-height: 1.5;
                        }
                        .actions {
                            margin: 24px 0;
                        }
                        .actions p {
                            margin: 8px 0;
                            font-size: 14px;
                        }
                        .footer {
                            padding: 20px 32px 28px;
                            background: #f8fafc;
                            font-size: 13px;
                            color: #475569;
                            border-top: 1px solid #e2e8f0;
                        }
                        .footer a {
                            color: #2563eb;
                            text-decoration: none;
                        }
                        .brand {
                            font-weight: 600;
                            color: #0f172a;
                            margin-top: 16px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="card">
                            <div class="header">
                                <h2>Welcome aboard, ${name.split(' ')[0] || name}!</h2>
                                <p>Your ${roleLabel} account is ready with secure credentials.</p>
                            </div>
                            <div class="content">
                                <p class="meta">Account email: <strong>${email}</strong></p>
                                <div class="credentials">
                                    <h3>Temporary Credentials</h3>
                                    <div class="credential-item">
                                        <span>Username / Email</span>
                                        <div class="credential-value">${email}</div>
                                    </div>
                                    <div class="credential-item">
                                        <span>Temporary Password</span>
                                        <div class="credential-value">${password}</div>
                                    </div>
                                </div>
                                <div class="password-hint">
                                    Please log in and change this temporary password immediately. The format uses letters from your email plus random digits for added security.
                                </div>
                                <div class="actions">
                                    <p>Recommended next steps:</p>
                                    <ul>
                                        <li>Access the VTS portal and sign in.</li>
                                        <li>Change your password from the profile settings.</li>
                                        <li>Review your account details and update any missing information.</li>
                                    </ul>
                                </div>
                            </div>
                            <div class="footer">
                                <p>If this account creation wasn't expected, contact support right away.</p>
                                <p>Support: <a href="mailto:info@outdidunified.com">info@outdidunified.com</a></p>
                                <p class="brand">Vehicle Tracking System (VTS)</p>
                            </div>
                        </div>
                    </div>
                </body>
            </html>
        `;

        const result = await sendEmail(email, mail_subject, mail_body);
        return result;
    } catch (error) {
        logger.loggerError(`Error sending credentials email to ${email}: ${error.message}`);
        return false;
    }
};

const sendStopArrivalEmail = async (email, studentName, stopName, direction, arrivalTime) => {
    try {
        if (!email || typeof email !== "string" || !email.includes("@")) {
            return false;
        }
        const label = direction === "dropoff" ? "drop-off" : "pickup";
        const resolvedStopName = stopName || "the stop";
        const timestampText = arrivalTime ? new Date(arrivalTime).toLocaleString() : new Date().toLocaleString();
        const studentLabel = studentName ? `${studentName}'s ` : "";
        const subject = `${resolvedStopName} reached`;
        const body = `The vehicle has reached ${resolvedStopName} for ${studentLabel}${label}. Arrival time: ${timestampText}.`;
        return await sendEmail(email.trim(), subject, body);
    } catch (error) {
        logger.loggerError(`Error sending stop arrival email to ${email}: ${error}`);
        return false;
    }
};

module.exports = { EmailConfig, sendPaymentEmail, sendCredentialsEmail, sendStopArrivalEmail }