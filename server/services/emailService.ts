import nodemailer from "nodemailer";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";
import os from "os";

interface QREmailData {
  studentEmail: string;
  studentName: string;
  rollNumber: string;
  subject: string;
  branch: string;
  section: string;
  teacherLocation: { lat: number; lng: number };
  sessionId: string;
}

interface EmailQueue {
  data: QREmailData;
  timestamp: Date;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private emailQueue: EmailQueue[] = [];
  private isProcessing = false;
  private readonly JWT_SECRET =
    process.env.JWT_SECRET || "attendancehub-secret-key-2024";
  private readonly RATE_LIMIT_DELAY = 100; // 10 emails per second (1000ms / 10 = 100ms)

  constructor() {
    // Initialize immediately on creation
    this.initializeTransporter();
  }

  private getLocalIpAddress(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]!) {
        // Skip internal (non-127.0.0.1) and non-ipv4 addresses
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
    return "localhost";
  }

  private getBaseUrl(): string {
    // Priority 1: User-defined public base URL (from tunnel)
    if (process.env.PUBLIC_BASE_URL) {
      return process.env.PUBLIC_BASE_URL;
    }

    // Priority 2: Legacy app base URL
    if (process.env.APP_BASE_URL) {
      return process.env.APP_BASE_URL;
    }

    if (process.env.NODE_ENV === "production") {
      return "https://your-app-domain.com";
    }

    const ip = this.getLocalIpAddress();
    const port = process.env.PORT || "4000";
    const url = `http://${ip}:${port}`;

    console.warn(`⚠️ Using local IP for Base URL: ${url}. External access may fail.`);
    return url;
  }

  private ensureInitialized() {
    if (!this.transporter) {
      this.initializeTransporter();
    }
  }

  private initializeTransporter() {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS;

    if (!gmailUser || !gmailPass) {
      console.error("❌ EMAIL SERVICE: Gmail credentials not configured in .env");
      console.error("   - GMAIL_USER:", gmailUser ? "SET" : "NOT SET");
      console.error("   - GMAIL_PASS:", gmailPass ? "SET" : "NOT SET");
      return;
    }

    try {
      // Trim any whitespace from credentials
      const trimmedUser = gmailUser.trim();
      const trimmedPass = gmailPass.replace(/\s+/g, "");

      console.log("📧 Configuring Gmail transporter for:", trimmedUser);

      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: trimmedUser,
          pass: trimmedPass,
        },
      });

      console.log("📧 Email transporter created for:", trimmedUser);

      // Verify connection with improved error handling
      this.transporter.verify((error, success) => {
        if (error) {
          const err = error as any;
          console.error("❌ EMAIL SERVICE: Gmail authentication failed");
          console.error("   Error Code:", err.code);
          console.error("   Error Message:", err.message);
          if (err.message && err.message.includes("535")) {
            console.error("   ⚠️ SMTP Error 535: Invalid credentials");
            console.error("   Solutions:");
            console.error("   1. Verify GMAIL_USER is correct (should be your Gmail address)");
            console.error("   2. Use Gmail App Password, NOT regular password");
            console.error("   3. Enable 2-factor authentication on your Gmail account");
            console.error("   4. Generate a new App Password at: https://myaccount.google.com/apppasswords");
          }
        } else {
          console.log("✅ EMAIL SERVICE: Successfully authenticated with Gmail");
        }
      });
    } catch (error: any) {
      console.error("❌ EMAIL SERVICE: Failed to create transporter:", error.message);
    }
  }

  // Generate JWT token for QR code with expiration
  private generateQRToken(data: QREmailData): string {
    const expirySeconds = parseInt(process.env.QR_EXPIRY_SECONDS || "3600");

    return jwt.sign(
      {
        rollNumber: data.rollNumber,
        studentName: data.studentName,
        subject: data.subject,
        branch: data.branch,
        section: data.section,
        teacherLocation: data.teacherLocation,
        sessionId: data.sessionId,
        type: "attendance_qr",
        issuedAt: Date.now(),
      },
      this.JWT_SECRET,
      { expiresIn: `${expirySeconds}s` },
    );
  }

  // Generate QR code as base64 image
  private async generateQRCodeImage(
    qrToken: string,
    baseUrl: string,
  ): Promise<string> {
    const qrUrl = `${baseUrl}/scan/from-email?token=${qrToken}`;

    const qrCodeBuffer = await QRCode.toBuffer(qrUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return `data:image/png;base64,${qrCodeBuffer.toString("base64")}`;
  }

  // Create HTML email template
  private createEmailHTML(
    data: QREmailData,
    qrCodeImage: string,
    appUrl: string,
    qrToken: string,
  ): string {
    const directLink = `${appUrl}/scan/from-email?token=${qrToken}`;
    const expiryTime = parseInt(process.env.QR_EXPIRY_SECONDS || "3600");

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attendance QR Code - ${data.subject}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; border-radius: 10px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; background: white; }
        .qr-section { text-align: center; margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
        .qr-code { margin: 20px 0; }
        .info-box { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .warning-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { background: #f1f1f1; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .countdown { font-size: 18px; font-weight: bold; color: #e74c3c; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 Attendance QR Code</h1>
            <p>Your unique attendance code for ${data.subject}</p>
        </div>
        
        <div class="content">
            <div class="info-box">
                <h3>📋 Class Details</h3>
                <p><strong>Student:</strong> ${data.studentName}</p>
                <p><strong>Roll Number:</strong> ${data.rollNumber}</p>
                <p><strong>Subject:</strong> ${data.subject}</p>
                <p><strong>Branch:</strong> ${data.branch} - Section ${data.section}</p>
            </div>

            <div class="qr-section">
                <h3>📱 Scan Your QR Code</h3>
                <div class="qr-code">
                    <img src="${qrCodeImage}" alt="Attendance QR Code" style="max-width: 200px; height: auto;">
                </div>
                <p><strong>OR</strong></p>
                <a href="${directLink}" class="button">Scan QR in App</a>
            </div>

            <div class="warning-box">
                <h4>⚠️ Important Instructions</h4>
                <ul>
                    <li><strong>Time Limit:</strong> This QR code expires in <span class="countdown">${expiryTime} seconds</span></li>
                    <li><strong>Location Required:</strong> You must be inside a 12m hexagonal zone around your lecturer's starting location</li>
                    <li><strong>Unique Code:</strong> This QR code is generated specifically for you</li>
                    <li><strong>One-Time Use:</strong> Cannot be shared or reused</li>
                </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <p><strong>Quick Access:</strong></p>
                <a href="${directLink}" style="word-break: break-all; color: #667eea; text-decoration: underline;">Scan QR in App</a><br/>
                <small style="color:#555">If the button above doesn’t work, click this link: ${directLink}</small>
            </div>
        </div>

        <div class="footer">
            <p>🏫 AttendanceHub System | Secure Attendance Management</p>
            <p>This is an automated message. Please do not reply to this email.</p>
            <p><em>QR Code generated at: ${new Date().toLocaleString()}</em></p>
        </div>
    </div>
</body>
</html>`;
  }

  // Add email to queue
  public async queueEmail(data: QREmailData): Promise<void> {
    this.ensureInitialized();
    this.emailQueue.push({
      data,
      timestamp: new Date(),
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processEmailQueue();
    }
  }

  // Process email queue with rate limiting
  private async processEmailQueue(): Promise<void> {
    if (this.emailQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const emailItem = this.emailQueue.shift()!;

    try {
      await this.sendQREmail(emailItem.data);
      console.log(`✅ Email sent to ${emailItem.data.studentEmail}`);
    } catch (error) {
      console.error(
        `❌ Failed to send email to ${emailItem.data.studentEmail}:`,
        error,
      );
    }

    // Rate limiting delay
    setTimeout(() => {
      this.processEmailQueue();
    }, this.RATE_LIMIT_DELAY);
  }

  // Send individual QR email
  private async sendQREmail(data: QREmailData): Promise<void> {
    this.ensureInitialized();
    const baseUrl = this.getBaseUrl();

    // Generate QR token
    const qrToken = this.generateQRToken(data);

    // Generate QR code image
    const qrCodeImage = await this.generateQRCodeImage(qrToken, baseUrl);

    // Create email HTML
    const htmlContent = this.createEmailHTML(
      data,
      qrCodeImage,
      baseUrl,
      qrToken,
    );

    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || "AttendanceHub System",
        address: process.env.GMAIL_USER!,
      },
      to: data.studentEmail,
      subject: `🎓 Attendance QR Code - ${data.subject} | ${data.branch} Section ${data.section}`,
      html: htmlContent,
      attachments: [
        {
          filename: "qr-code.png",
          content: qrCodeImage.split("base64,")[1],
          encoding: "base64",
          cid: "qrcode",
        },
      ],
    };

    await this.transporter!.sendMail(mailOptions);
  }

  // Send emails to multiple students
  public async sendAttendanceEmails(
    students: Array<{
      email: string;
      name: string;
      rollNo: string;
    }>,
    classDetails: {
      subject: string;
      branch: string;
      section: string;
      teacherLocation: { lat: number; lng: number };
    },
  ): Promise<{
    success: boolean;
    totalStudents: number;
    queuedEmails: number;
    sessionId: string;
  }> {
    this.ensureInitialized();

    if (!this.transporter) {
      console.error("❌ CRITICAL: Email transporter not initialized");
      console.error("   Gmail credentials may be invalid or missing");
      throw new Error(
        "Email service not initialized. Gmail credentials are invalid. Please verify GMAIL_USER and GMAIL_PASS in .env file and ensure 2-factor authentication is enabled on your Gmail account.",
      );
    }

    const sessionId = `${classDetails.branch}-${classDetails.section}-${classDetails.subject}-${Date.now()}`;
    let queuedEmails = 0;
    const baseUrl = this.getBaseUrl();

    console.log(
      `📧 Sending emails to ${students.length} students. Base URL: ${baseUrl}`,
    );

    for (const student of students) {
      try {
        const emailData: QREmailData = {
          studentEmail: student.email,
          studentName: student.name,
          rollNumber: student.rollNo,
          subject: classDetails.subject,
          branch: classDetails.branch,
          section: classDetails.section,
          teacherLocation: classDetails.teacherLocation,
          sessionId,
        };

        // Generate QR token
        const qrToken = this.generateQRToken(emailData);

        // Generate QR code image
        const qrCodeImage = await this.generateQRCodeImage(qrToken, baseUrl);

        // Create email HTML
        const htmlContent = this.createEmailHTML(
          emailData,
          qrCodeImage,
          baseUrl,
          qrToken,
        );

        const mailOptions = {
          from: `${process.env.EMAIL_FROM_NAME || "AttendanceHub System"} <${process.env.GMAIL_USER}>`,
          to: student.email,
          subject: `🎓 Attendance QR Code - ${classDetails.subject} | ${classDetails.branch} Section ${classDetails.section}`,
          html: htmlContent,
        };

        console.log(`  📤 Sending to ${student.email}...`);
        const info = await this.transporter.sendMail(mailOptions);
        console.log(`  ✅ Email sent to ${student.email}. ID: ${info.messageId}`);
        queuedEmails++;
      } catch (error: any) {
        console.error(`  ❌ Failed to send email to ${student.email}:`, {
          message: error.message,
          code: error.code,
        });
      }

      // Rate limiting delay between emails
      if (queuedEmails < students.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.RATE_LIMIT_DELAY),
        );
      }
    }

    console.log(
      `���� Email sending complete: ${queuedEmails}/${students.length} sent successfully`,
    );

    return {
      success: queuedEmails > 0,
      totalStudents: students.length,
      queuedEmails,
      sessionId,
    };
  }

  // Verify QR token
  public verifyQRToken(token: string): any {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET);
      return decoded;
    } catch (error) {
      throw new Error("Invalid or expired QR token");
    }
  }
}

export const emailService = new EmailService();
