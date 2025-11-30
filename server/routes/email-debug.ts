import { Request, Response } from 'express';
import { emailService } from '../services/emailService';

export async function handleEmailDebug(req: Request, res: Response): Promise<void> {
  try {
    // Check environment variables
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS;
    const emailFromName = process.env.EMAIL_FROM_NAME;
    const qrExpirySeconds = process.env.QR_EXPIRY_SECONDS;

    // Test basic configuration
    const configStatus = {
      gmailUserSet: !!gmailUser,
      gmailPassSet: !!gmailPass,
      gmailUser: gmailUser || 'NOT SET',
      emailFromName: emailFromName || 'NOT SET',
      qrExpirySeconds: qrExpirySeconds || 'NOT SET',
      nodeEnv: process.env.NODE_ENV || 'development'
    };

    // If credentials are set, try to initialize email service
    let emailServiceStatus = 'Not tested';
    if (gmailUser && gmailPass) {
      try {
        // Force initialize the email service
        await emailService.sendAttendanceEmails([], {
          subject: 'Test',
          branch: 'Test',
          section: 'Test',
          teacherLocation: { lat: 0, lng: 0 }
        });
        emailServiceStatus = 'Email service can be initialized';
      } catch (error: any) {
        emailServiceStatus = `Email service error: ${error.message}`;
      }
    }

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      configuration: configStatus,
      emailServiceStatus,
      troubleshooting: {
        nextSteps: [
          '1. Verify Gmail credentials are correct',
          '2. Make sure Gmail App Password is used (not regular password)',
          '3. Check if 2-factor authentication is enabled on Gmail',
          '4. Test with a single student email first'
        ]
      }
    });

  } catch (error: any) {
    console.error('❌ Email debug error:', error);
    res.status(500).json({
      error: 'Debug Error',
      message: error.message,
      stack: error.stack
    });
  }
}

export async function handleTestSingleEmail(req: Request, res: Response): Promise<void> {
  try {
    const { testEmail } = req.body;
    
    if (!testEmail) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'testEmail is required'
      });
      return;
    }

    // Send a single test email
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
      message: 'Test email sent successfully',
      result,
      note: `Check ${testEmail} for the attendance QR email`
    });

  } catch (error: any) {
    console.error('❌ Test email error:', error);
    res.status(500).json({
      error: 'Email Test Failed',
      message: error.message,
      troubleshooting: [
        'Check Gmail credentials',
        'Verify Gmail App Password',
        'Ensure target email is valid Gmail address',
        'Check server logs for detailed error'
      ]
    });
  }
}
