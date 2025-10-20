const nodemailer = require('nodemailer');
const env = require('../config/env');
const {
  renderWelcomeEmail,
  renderEmailVerificationEmail,
  renderPasswordResetEmail
} = require('../utils/templates/emailTemplates');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: false, // Use TLS
      auth: {
        user: env.mail.user,
        pass: env.mail.password
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
  from: options.from || env.mail.defaultFrom,
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
    return this.sendEmail({
      to: user.email,
  subject: `Welcome to ${env.productName}! 🚗`,
      html: renderWelcomeEmail(user)
    });
  }

  // Send email verification
  async sendEmailVerification(user, token) {
    return this.sendEmail({
      to: user.email,
  subject: `Verify Your ${env.productName} Email Address`,
      html: renderEmailVerificationEmail(user, token)
    });
  }

  // Send password reset email
  async sendPasswordReset(user, token) {
    return this.sendEmail({
      to: user.email,
  subject: `Reset Your ${env.productName} Password`,
      html: renderPasswordResetEmail(user, token)
    });
  }
}

module.exports = new EmailService();