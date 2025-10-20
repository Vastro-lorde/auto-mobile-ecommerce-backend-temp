const { OAuth2Client } = require('google-auth-library');
const env = require('../config/env');

class GoogleAuthService {
  constructor() {
    this.client = new OAuth2Client(
      env.google.clientId,
      env.google.clientSecret,
      env.google.redirectUri
    );
  }

  // Generate OAuth URL
  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    const url = this.client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    return url;
  }

  // Verify ID token
  async verifyIdToken(idToken) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: env.google.clientId,
      });

      const payload = ticket.getPayload();
      
      return {
        googleId: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified,
        firstName: payload.given_name,
        lastName: payload.family_name,
        displayName: payload.name,
        avatar: payload.picture
      };
    } catch (error) {
      console.error('Google ID token verification failed:', error.message);
      throw new Error('Invalid Google ID token');
    }
  }

  // Handle OAuth callback
  async handleCallback(code) {
    try {
      const { tokens } = await this.client.getToken(code);
      this.client.setCredentials(tokens);

      // Get user info
      const ticket = await this.client.verifyIdToken({
        idToken: tokens.id_token,
        audience: env.google.clientId,
      });

      const payload = ticket.getPayload();

      return {
        googleId: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified,
        firstName: payload.given_name,
        lastName: payload.family_name,
        displayName: payload.name,
        avatar: payload.picture,
        tokens: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          idToken: tokens.id_token
        }
      };
    } catch (error) {
      console.error('Google OAuth callback failed:', error.message);
      throw new Error('Google authentication failed');
    }
  }

  // Refresh access token
  async refreshAccessToken(refreshToken) {
    try {
      this.client.setCredentials({
        refresh_token: refreshToken
      });

      const { credentials } = await this.client.refreshAccessToken();
      return credentials.access_token;
    } catch (error) {
      console.error('Token refresh failed:', error.message);
      throw new Error('Failed to refresh Google access token');
    }
  }
}

module.exports = new GoogleAuthService();