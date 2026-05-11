
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

async function testGmail() {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;

  if (!gmailUser || !gmailPass) {
    console.error('Missing credentials in .env');
    return;
  }

  const trimmedUser = gmailUser.trim();
  const trimmedPass = gmailPass.replace(/\s+/g, "");

  console.log('Testing Gmail authentication with DEBUG logs for:', trimmedUser);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: trimmedUser,
      pass: trimmedPass,
    },
    debug: true,
    logger: true
  });

  try {
    const result = await transporter.verify();
    console.log('✅ Success: Gmail authentication successful!');
  } catch (error) {
    console.error('❌ Error: Gmail authentication failed');
    console.error('Full Error details:', error);
  }
}

testGmail();
