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
  // Use a stable JWT secret so QR tokens remain valid after hot-reloads / restarts.
  // Set JWT_SECRET in .env for production. The fallback is used for local dev.
  private readonly JWT_SECRET =
    process.env.JWT_SECRET || "attendancehub-secret-key-2024";
  private readonly RATE_LIMIT_DELAY = 100; // 10 emails per second (1000ms / 10 = 100ms)

  constructor() {
    // Initialize immediately on creation
    this.initializeTransporter();
  }

  public getBaseUrl(): string {
    const linkMode = process.env.DEVELOPMENT_LINK_MODE || "wifi";
    const envUrl = process.env.APP_BASE_URL;

    // Mode: Explicit Localhost
    if (linkMode === "localhost") {
      const baseUrl = envUrl || "http://localhost:3000";
      console.log(`🏠 [EmailService] Mode: LOCALHOST (Trusted development)`);
      console.log(`🔗 [EmailService] Base URL: ${baseUrl}`);
      return baseUrl;
    }

    // Allow override via APP_BASE_URL environment variable.
    // Accept any non-localhost, non-empty value (including explicit 192.168.x.x or 10.x.x.x).
    if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
      console.log(`🌐 [EmailService] Mode: WIFI (Manual override)`);
      console.log(`🔗 [EmailService] Base URL: ${envUrl}`);
      return envUrl;
    }

    if (envUrl) {
      console.warn(
        `⚠️  [EmailService] APP_BASE_URL is set to '${envUrl}' which uses localhost/127.0.0.1. ` +
        `Falling back to auto-detect. For trusted localhost links, set DEVELOPMENT_LINK_MODE=localhost.`
      );
    }

    // Auto-detect local WiFi IPv4 address for LAN access from mobile.
    // ... rest of the detection logic ...
    const interfaces = os.networkInterfaces();
    const virtualKeywords = [
      "vmware", "vmnet", "vbox", "virtualbox", "hyper-v",
      "loopback", "pseudo", "bluetooth", "tunnel", "tap", "docker",
      "wi-fi direct", "direct virtual",
    ];
    const wifiKeywords = ["wi-fi", "wifi", "wireless", "wlan", "802.11"];

    const candidates: { name: string; ip: string; isNamedWifi: boolean; isWifi: boolean }[] = [];

    for (const devName in interfaces) {
      const iface = interfaces[devName];
      if (!iface) continue;

      const lowerName = devName.toLowerCase();
      if (virtualKeywords.some((kw) => lowerName.includes(kw))) continue;

      const isNamedWifi = lowerName === "wi-fi" || lowerName === "wifi";
      const isWifi = isNamedWifi || wifiKeywords.some((kw) => lowerName.includes(kw));

      for (const alias of iface) {
        if (alias.family === "IPv4" && !alias.internal && alias.address !== "127.0.0.1") {
          candidates.push({ name: devName, ip: alias.address, isNamedWifi, isWifi });
        }
      }
    }

    let localIp = "127.0.0.1";
    const exactWifi = candidates.filter((c) => c.isNamedWifi);
    const namedWifi = candidates.filter((c) => c.isWifi);
    const any192 = candidates.filter((c) => c.ip.startsWith("192.168."));

    if (exactWifi.length > 0) {
      localIp = exactWifi[exactWifi.length - 1].ip;
      console.log(`📶 [EmailService] Using physical 'Wi-Fi' adapter: ${exactWifi[exactWifi.length - 1].name}`);
    } else if (namedWifi.length > 0) {
      localIp = namedWifi[namedWifi.length - 1].ip;
      console.log(`📶 [EmailService] Using WiFi-named adapter: ${namedWifi[namedWifi.length - 1].name}`);
    } else if (any192.length > 0) {
      localIp = any192[any192.length - 1].ip;
      console.log(`📶 [EmailService] Using 192.168 adapter: ${any192[any192.length - 1].name}`);
    } else if (candidates.length > 0) {
      localIp = candidates[candidates.length - 1].ip;
      console.log(`📶 [EmailService] Using fallback adapter: ${candidates[candidates.length - 1].name}`);
    }

    const baseUrl = `http://${localIp}:3000`;
    console.log(`🌐 [EmailService] Mode: WIFI (Auto-detect)`);
    console.log(`✅ [EmailService] Selected local IP : ${localIp}`);
    console.log(`🔗 [EmailService] Base URL : ${baseUrl}`);
    return baseUrl;
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
      // 1. Clean credentials (remove whitespace/spaces which are common when copying App Passwords)
      const trimmedUser = gmailUser.trim();
      const trimmedPass = gmailPass.replace(/\s+/g, "");

      console.log("📧 Configuring Gmail SMTP transporter for:", trimmedUser);
      
      // 2. Configure transporter using the 'gmail' service shortcut
      // This automatically handles host (smtp.gmail.com), port (465), and secure (true)
      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: trimmedUser,
          pass: trimmedPass, // This MUST be a 16-character App Password if 2FA is on
        },
      });

      // 3. Verify connection immediately
      console.log("📧 Verifying SMTP connection...");
      this.transporter.verify((error, success) => {
        if (error) {
          const err = error as any;
          console.error("❌ EMAIL SERVICE: Gmail SMTP authentication failed");
          console.error(`   Error details: [${err.code}] ${err.message}`);
          
          if (err.message && (err.message.includes("535") || err.message.includes("Invalid login"))) {
            console.error("\n   ⚠️  AUTHENTICATION TROUBLESHOOTING:");
            console.error("   1. Is 2-Factor Authentication (2FA) ENABLED on your Google Account?");
            console.error("   2. Are you using an 'App Password'? (Ordinary passwords will NOT work)");
            console.error("   3. Did you generate the App Password at: https://myaccount.google.com/apppasswords");
            console.error("   4. Does GMAIL_USER match the account that generated the App Password?");
            console.error("   5. After updating .env, did you RESTART the server?");
          }
        } else {
          console.log("✅ EMAIL SERVICE: Successfully authenticated with Gmail SMTP");
        }
      });
    } catch (error: any) {
      console.error("❌ EMAIL SERVICE: Failed to create transporter object:", error.message);
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
    sessionId: string,
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
    const qrCodeImage = await this.generateQRCodeImage(qrToken, baseUrl, data.sessionId);

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
        const qrCodeImage = await this.generateQRCodeImage(qrToken, baseUrl, emailData.sessionId);

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
        console.log(`  🔗 Exact Scanner URL: ${baseUrl}/scan/from-email?token=${qrToken}`);
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
