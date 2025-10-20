# Car-Ecommerce API - Node.js Migration

Car-Ecommerce marketplace API migrated from Django to Node.js with Express.js and MongoDB.

## 🚀 Features

- **User Authentication**: JWT + Google OAuth
- **User Management**: Multiple user roles (Regular, Dealer, Corporate, Agent, Supervisor)
- **Listings Management**: Vehicle listings with dynamic categories and specifications
- **Real-time Chat**: WebSocket-powered messaging system
- **File Upload**: AWS S3 integration for images and files
- **Email Service**: Automated email notifications
- **Content Moderation**: Simplified AI-powered moderation
- **API Documentation**: Swagger/OpenAPI 3.0
- **Rate Limiting**: Protection against abuse
- **Security**: Helmet, CORS, data sanitization

## 📋 Requirements

- Node.js 18.0+
- MongoDB Atlas (cloud database)
- AWS S3 bucket for file storage
- SMTP service (Mailtrap for development)

## ⚙️ Environment Setup

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd car-ecommerce-api
npm install
```

2. **Environment Variables:**
Copy `.env.example` to `.env` and configure:

```env
# Server
NODE_ENV=development
PORT=5000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/car-ecommerce

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_STORAGE_BUCKET_NAME=your_bucket_name
AWS_S3_REGION_NAME=eu-west-2

# Email (Mailtrap)
EMAIL_HOST=live.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_HOST_USER=api
EMAIL_HOST_PASSWORD=your_password
DEFAULT_FROM_EMAIL=noreply@car-ecommerce.com

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

3. **Start the server:**
```bash
# Development
npm run dev

# Production
npm start
```

## 📚 API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:5000/api-docs
- **JSON Spec**: http://localhost:5000/api-docs.json

## 🗄️ Database Models

### Users
- Authentication (JWT + Google OAuth)
- Role-based access control
- Profile management per user type
- Soft delete functionality

### Listings
- Dynamic specifications based on categories
- Image management with moderation
- Location-based filtering
- Pricing and financing options
- Search and filtering capabilities

### Conversations & Messages
- Real-time messaging with Socket.io
- Read receipts and typing indicators
- File attachments support
- Message history and archiving

### Categories
- Hierarchical category structure
- Dynamic form schemas
- Validation rules per category

### Notifications
- Multi-channel delivery (email, SMS, in-app)
- Template system
- Scheduled notifications
- Retry mechanisms

## 🔌 Real-time Features (WebSocket)

Connect to Socket.io server:
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your_jwt_token'
  }
});

// Join a conversation
socket.emit('join_conversation', { conversationId: 'conv_id' });

// Send a message
socket.emit('send_message', {
  conversationId: 'conv_id',
  content: 'Hello!',
  messageType: 'text'
});

// Listen for new messages
socket.on('new_message', (data) => {
  console.log('New message:', data.message);
});
```

## 🔐 Authentication

### Register
```bash
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "role": "regular",
  "profile": {
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Login
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Google OAuth
```bash
GET /api/auth/google
```

## 📝 API Routes

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback

### Users
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update profile
- `POST /api/users/avatar` - Upload avatar
- `DELETE /api/users/account` - Soft delete account

### Listings
- `GET /api/listings` - Get all listings (with search & filters)
- `POST /api/listings` - Create new listing
- `GET /api/listings/:id` - Get listing by ID
- `PUT /api/listings/:id` - Update listing
- `DELETE /api/listings/:id` - Delete listing
- `POST /api/listings/:id/images` - Upload listing images

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category details
- `GET /api/categories/:id/schema` - Get category form schema

### Conversations
- `GET /api/conversations` - Get user conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id` - Get conversation details
- `GET /api/conversations/:id/messages` - Get conversation messages

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all as read

## 🚀 Deployment

### Environment Variables for Production
Create `.env.production` with production values:
- Use production MongoDB Atlas cluster
- Update AWS S3 bucket to production bucket
- Use production email service credentials
- Set strong JWT secret
- Configure production Google OAuth URIs

### Running in Production
```bash
NODE_ENV=production npm start
```

## 🔧 Migration Notes

This API maintains compatibility with the existing Django frontend by:
- Preserving the same API response format
- Using the same authentication flow
- Maintaining the same user roles and permissions
- Supporting the same file upload structure
- Keeping the same database relationships (adapted for MongoDB)

## 🆘 Support

For questions or issues:
1. Check the API documentation at `/api-docs`
2. Review the console logs for detailed error messages
3. Contact the development team

## 📊 Monitoring

The API includes:
- Request logging with Morgan
- Error handling and reporting
- Health check endpoint (`GET /health`)
- Performance monitoring hooks

---

**Car-Ecommerce API v1.0.0** - Built with ❤️ using Node.js, Express.js & MongoDB