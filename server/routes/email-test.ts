import { Request, Response } from 'express';
import * as nodemailer from 'nodemailer';

export async function handleDirectEmailTest(req: Request, res: Response): Promise<void> {
  try {
    console.log('🧪 Starting direct email test...');
    
    // Check environment variables
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS;
    
    console.log('📧 Gmail User:', gmailUser ? 'SET' : 'NOT SET');
    console.log('🔑 Gmail Pass:', gmailPass ? 'SET (length: ' + gmailPass.length + ')' : 'NOT SET');
    
    if (!gmailUser || !gmailPass) {
      res.status(400).json({
        error: 'Configuration Error',
        message: 'Gmail credentials not properly configured',
        details: {
          gmailUser: !!gmailUser,
          gmailPass: !!gmailPass
        }
      });
      return;
    }

    // Create transporter directly
    console.log('🔧 Creating direct transporter...');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    });

    // Test connection
    console.log('🔗 Testing connection...');
    await transporter.verify();
    console.log('✅ Gmail connection verified successfully');

    // Send test email
    const testEmail = req.body.testEmail || 'girishkumargundapu@gmail.com';
    console.log('📨 Sending test email to:', testEmail);

    const mailOptions = {
      from: {
        name: 'AttendanceHub Test',
        address: gmailUser
      },
      to: testEmail,
      subject: '🧪 AttendanceHub Email Test - ' + new Date().toLocaleString(),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">✅ Email Test Successful!</h2>
          <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>From:</strong> ${gmailUser}</p>
          <p><strong>To:</strong> ${testEmail}</p>
          <p style="background: #f0f0f0; padding: 15px; border-radius: 5px;">
            This is a test email from your AttendanceHub system. If you received this, 
            the Gmail SMTP configuration is working correctly!
          </p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            AttendanceHub Email System Test<br>
            Generated at: ${new Date().toISOString()}
          </p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);

    res.status(200).json({
      success: true,
      message: 'Test email sent successfully',
      details: {
        messageId: result.messageId,
        from: gmailUser,
        to: testEmail,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Direct email test failed:', error);
    res.status(500).json({
      error: 'Email Test Failed',
      message: error.message,
      details: error,
      troubleshooting: [
        'Check if Gmail App Password is correct',
        'Verify 2-factor authentication is enabled',
        'Ensure "Less secure app access" is not required',
        'Check Gmail SMTP settings'
      ]
    });
  }
}

export async function handleEmailConfig(req: Request, res: Response): Promise<void> {
  const config = {
    gmailUser: process.env.GMAIL_USER || 'NOT SET',
    gmailPassLength: process.env.GMAIL_PASS ? process.env.GMAIL_PASS.length : 0,
    emailFromName: process.env.EMAIL_FROM_NAME || 'NOT SET',
    qrExpirySeconds: process.env.QR_EXPIRY_SECONDS || 'NOT SET',
    nodeEnv: process.env.NODE_ENV || 'development'
  };

  res.json({
    success: true,
    configuration: config,
    timestamp: new Date().toISOString()
  });
}
