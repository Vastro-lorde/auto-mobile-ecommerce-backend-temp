const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false, // Use TLS
      auth: {
        user: process.env.EMAIL_HOST_USER,
        pass: process.env.EMAIL_HOST_PASSWORD
      }
    });
  }

  // Verify email configuration
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('📧 Email service connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error.message);
      return false;
    }
  }

  // Send basic email
  async sendEmail(options) {
    try {
      const mailOptions = {
        from: options.from || process.env.DEFAULT_FROM_EMAIL,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('📧 Email sent successfully:', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject
      });

      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
      throw error;
    }
  }

  // Send welcome email
  async sendWelcomeEmail(user) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1a365d; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Welcome to CarKobo!</h1>
        </div>
        <div style="padding: 20px;">
          <h2>Hello ${user.displayName || user.email}!</h2>
          <p>Welcome to CarKobo, Nigeria's premier car marketplace. We're excited to have you join our community!</p>
          
          <div style="background-color: #f7fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #1a365d; margin-top: 0;">What you can do with CarKobo:</h3>
            <ul style="margin: 0;">
              <li>Buy and sell cars with confidence</li>
              <li>Connect with verified dealers and individuals</li>
              <li>Access financing options</li>
              <li>Get professional car inspections</li>
              <li>Chat securely with potential buyers/sellers</li>
            </ul>
          </div>
          
          ${!user.isEmailVerified ? `
          <div style="background-color: #fff5f5; border-left: 4px solid #f56565; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Important:</strong> Please verify your email address to access all features.</p>
          </div>
          ` : ''}
          
          <p>If you have any questions or need assistance, feel free to contact our support team.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}" 
               style="background-color: #1a365d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
               Start Exploring CarKobo
            </a>
          </div>
        </div>
        <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 14px; color: #666;">
          <p>CarKobo - Your Trusted Car Marketplace</p>
          <p>This email was sent to ${user.email}</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to CarKobo! 🚗',
      html
    });
  }

  // Send email verification
  async sendEmailVerification(user, token) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1a365d; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Verify Your Email</h1>
        </div>
        <div style="padding: 20px;">
          <h2>Hello ${user.displayName || user.email}!</h2>
          <p>Thank you for signing up with CarKobo. To complete your registration and access all features, please verify your email address.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #38a169; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
               Verify Email Address
            </a>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #1a365d;">${verificationUrl}</p>
          
          <div style="background-color: #fff5f5; border-left: 4px solid #f56565; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Note:</strong> This verification link will expire in 24 hours for security reasons.</p>
          </div>
        </div>
        <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 14px; color: #666;">
          <p>CarKobo - Your Trusted Car Marketplace</p>
          <p>This email was sent to ${user.email}</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Verify Your CarKobo Email Address',
      html
    });
  }

  // Send password reset email
  async sendPasswordReset(user, token) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1a365d; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Reset Your Password</h1>
        </div>
        <div style="padding: 20px;">
          <h2>Hello ${user.displayName || user.email}!</h2>
          <p>We received a request to reset your CarKobo account password.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #e53e3e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
               Reset Password
            </a>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #1a365d;">${resetUrl}</p>
          
          <div style="background-color: #fff5f5; border-left: 4px solid #f56565; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Important:</strong></p>
            <ul style="margin: 10px 0 0 20px;">
              <li>This reset link will expire in 1 hour</li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>Your password won't change until you create a new one</li>
            </ul>
          </div>
        </div>
        <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 14px; color: #666;">
          <p>CarKobo - Your Trusted Car Marketplace</p>
          <p>This email was sent to ${user.email}</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Reset Your CarKobo Password',
      html
    });
  }
}

module.exports = new EmailService();