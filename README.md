# Social Media Poster Backend

This is the backend for the **Social Media Poster** app. It allows users to authenticate with LinkedIn and Twitter (X) and publish text or media posts to connected accounts via a simple API.

## ✨ Features

- 🔐 OAuth login with Twitter (X) and LinkedIn
- 🐦 Post text and media to Twitter
- 🔗 Post text and media to LinkedIn
- 🗂️ Session-based user authentication
- 📤 File upload with `multer`

## 🛠️ Technologies

- Node.js + Express.js
- `twitter-api-v2` library
- LinkedIn OAuth 2.0
- `express-session` for session management
- `multer` for file upload
- CORS enabled
- dotenv

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/vrima1221/social-media-poster-back.git
cd social-media-poster-back
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create .env file

```bash
PORT=your_port
CLIENT_URL=your_client_url

SESSION_SECRET=your_session_secret

LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_CALLBACK_URL=http://localhost:4000/auth/linkedin/callback

TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_CALLBACK_URL=http://localhost:4000/auth/twitter/callback
```

### 4. Start the development server

```bash
npm run dev
```

📬 API Routes
🔐 Auth
GET /auth/twitter – Start Twitter login

GET /auth/twitter/callback – Twitter callback

GET /auth/linkedin – Start LinkedIn login

GET /auth/linkedin/callback – LinkedIn callback

GET /auth/twitter/me – Get Twitter user info

GET /auth/linkedin/me – Get LinkedIn user info

📢 Post routes
POST /twitter/post – Post a tweet (text and optional media)

POST /linkedin/post – Post to LinkedIn (text and optional media)
