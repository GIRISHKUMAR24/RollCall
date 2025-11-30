import { Request, Response } from 'express';
import { emailService } from '../services/emailService';
import * as nodemailer from 'nodemailer';

export async function handleEmailDiagnostics(req: Request, res: Response): Promise<void> {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        gmailUser: process.env.GMAIL_USER ? 'SET' : 'NOT SET',
        gmailPass: process.env.GMAIL_PASS ? `SET (${process.env.GMAIL_PASS.length} chars)` : 'NOT SET',
        emailFromName: process.env.EMAIL_FROM_NAME || 'NOT SET',
        qrExpirySeconds: process.env.QR_EXPIRY_SECONDS || 'NOT SET',
        appBaseUrl: process.env.APP_BASE_URL || 'NOT SET'
      },
      tests: []
    };

    // Test 1: Environment Variables
    diagnostics.tests.push({
      name: 'Environment Variables',
      status: process.env.GMAIL_USER && process.env.GMAIL_PASS ? 'PASS' : 'FAIL',
      details: {
        gmailUser: !!process.env.GMAIL_USER,
        gmailPass: !!process.env.GMAIL_PASS,
        message: process.env.GMAIL_USER && process.env.GMAIL_PASS 
          ? 'All required environment variables are set' 
          : 'Missing Gmail credentials'
      }
    });

    // Test 2: Direct SMTP Connection
    if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
      try {
        const testTransporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS
          }
        });

        await testTransporter.verify();
        diagnostics.tests.push({
          name: 'SMTP Connection',
          status: 'PASS',
          details: { message: 'Gmail SMTP connection successful' }
        });
      } catch (error: any) {
        diagnostics.tests.push({
          name: 'SMTP Connection',
          status: 'FAIL',
          details: { 
            message: 'Gmail SMTP connection failed',
            error: error.message 
          }
        });
      }
    }

    // Test 3: Email Service Initialization
    try {
      // Test if email service can be initialized
      await emailService.sendAttendanceEmails([], {
        subject: 'Test',
        branch: 'Test',
        section: 'Test',
        teacherLocation: { lat: 0, lng: 0 }
      });
      diagnostics.tests.push({
        name: 'Email Service',
        status: 'PASS',
        details: { message: 'Email service can be initialized' }
      });
    } catch (error: any) {
      diagnostics.tests.push({
        name: 'Email Service',
        status: 'FAIL',
        details: { 
          message: 'Email service initialization failed',
          error: error.message 
        }
      });
    }

    // Test 4: Test Email Sending
    const testEmail = req.body.testEmail || 'girishkumargundapu@gmail.com';
    if (testEmail && process.env.GMAIL_USER && process.env.GMAIL_PASS) {
      try {
        const testTransporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS
          }
        });

        const testResult = await testTransporter.sendMail({
          from: process.env.GMAIL_USER,
          to: testEmail,
          subject: '🧪 AttendanceHub Email Test',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4CAF50;">✅ Email Test Successful!</h2>
              <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>From:</strong> ${process.env.GMAIL_USER}</p>
              <p><strong>To:</strong> ${testEmail}</p>
              <p style="background: #f0f0f0; padding: 15px; border-radius: 5px;">
                This is a test email from your AttendanceHub system. If you received this, 
                the Gmail SMTP configuration is working correctly!
              </p>
            </div>
          `
        });

        diagnostics.tests.push({
          name: 'Test Email Send',
          status: 'PASS',
          details: { 
            message: `Test email sent successfully to ${testEmail}`,
            messageId: testResult.messageId
          }
        });
      } catch (error: any) {
        diagnostics.tests.push({
          name: 'Test Email Send',
          status: 'FAIL',
          details: { 
            message: `Failed to send test email to ${testEmail}`,
            error: error.message 
          }
        });
      }
    }

    const allTestsPassed = diagnostics.tests.every(test => test.status === 'PASS');
    
    res.status(200).json({
      success: true,
      overallStatus: allTestsPassed ? 'HEALTHY' : 'ISSUES_DETECTED',
      diagnostics,
      recommendations: allTestsPassed ? [
        '✅ All email systems are working correctly',
        '📧 Students should receive QR code emails',
        '📍 Location-based attendance is enabled'
      ] : [
        '❌ Check Gmail credentials configuration',
        '🔑 Verify Gmail App Password is correct',
        '🔐 Ensure 2-factor authentication is enabled',
        '📧 Test with a single email first'
      ]
    });

  } catch (error: any) {
    console.error('❌ Email diagnostics error:', error);
    res.status(500).json({
      error: 'Diagnostics Error',
      message: error.message,
      stack: error.stack
    });
  }
}

export async function handleSendTestAttendanceEmail(req: Request, res: Response): Promise<void> {
  try {
    const { testEmail } = req.body;
    
    if (!testEmail) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'testEmail is required'
      });
      return;
    }

    // Send a test attendance email with QR code
    const result = await emailService.sendAttendanceEmails(
      [{
        email: testEmail,
        name: 'Test Student',
        rollNo: 'TEST001'
      }],
      {
        subject: 'Test Subject',
        branch: 'Test Branch',
        section: 'Test Section',
        teacherLocation: { lat: 17.4065, lng: 78.4772 } // Hyderabad coordinates
      }
    );

    res.status(200).json({
      success: true,
      message: 'Test attendance email sent successfully',
      result,
      note: `Check ${testEmail} for the attendance QR email with location-based validation`
    });

  } catch (error: any) {
    console.error('❌ Test attendance email error:', error);
    res.status(500).json({
      error: 'Test Email Failed',
      message: error.message,
      troubleshooting: [
        'Check Gmail credentials (GMAIL_USER, GMAIL_PASS)',
        'Verify Gmail App Password is correct',
        'Ensure 2-factor authentication is enabled',
        'Check if target email is valid'
      ]
    });
  }
}
