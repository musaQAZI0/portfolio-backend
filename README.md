# Backend API - Musa Aamir Qazi Portfolio

Backend API server for the mobile app developer portfolio.

## 🚀 Quick Start (Local Development)

```bash
# Install dependencies
npm install

# Start server
npm start
```

Server runs on: http://localhost:3000

## 📦 What's Included

- Express.js REST API
- SQLite database
- Session-based authentication
- File upload handling (Multer)
- CORS configured for frontend

## 🔐 Admin Credentials

**Email:** musaqazi54@gmail.com  
**Password:** musa123456

## 🌐 Deploy to Render

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial backend commit"
git remote add origin https://github.com/YOUR_USERNAME/portfolio-backend.git
git push -u origin main
```

### Step 2: Deploy on Render

1. Go to [Render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name:** `musa-portfolio-api` (or any name)
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

### Step 3: Set Environment Variables

Add these in Render dashboard:

```
FRONTEND_URL=https://your-netlify-site.netlify.app
NODE_ENV=production
SESSION_SECRET=your-random-secret-key-here
```

### Step 4: Note Your Backend URL

After deployment, Render will give you a URL like:
```
https://musa-portfolio-api.onrender.com
```

**Important:** Copy this URL - you'll need it for the frontend!

## 📊 API Endpoints

### Public Endpoints
- `GET /` - API health check
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get single project
- `GET /api/projects/technology/:tech` - Filter by technology
- `GET /uploads/images/*` - Access uploaded images

### Authentication Endpoints
- `POST /api/login` - Login to admin
- `POST /api/logout` - Logout
- `GET /api/auth/status` - Check auth status

### Protected Endpoints (Require Login)
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `DELETE /api/images/:id` - Delete image

## 🗄️ Database

Uses SQLite (`portfolio.db`) which is created automatically on first run.

**Note:** On Render's free tier, the database will reset when the service sleeps. For persistent storage, upgrade to a paid plan or use an external database like PostgreSQL.

## 🔧 Environment Variables

Create `.env` file for local development:

```env
PORT=3000
FRONTEND_URL=http://localhost:8080
SESSION_SECRET=musa-portfolio-secret-key-2025
NODE_ENV=development
```

## 📝 File Upload

- **Location:** `/uploads/images/`
- **Max Size:** 5MB per image
- **Max Files:** 10 per project
- **Formats:** JPG, PNG, GIF, WEBP

## 🔐 Security Notes

- Credentials are hardcoded for simplicity
- Session duration: 24 hours
- CORS configured for your frontend domain
- HTTPS required in production (automatic on Render)

## 🚨 Troubleshooting

### Port Already in Use
```bash
# Change port in .env or server.js
PORT=3001
```

### CORS Errors
Make sure `FRONTEND_URL` in environment variables matches your Netlify URL exactly.

### Database Locked
Restart the server.

### Images Not Loading
Check that `/uploads` directory has proper permissions.

## 📞 Support

Check backend logs on Render dashboard for errors.

## 🎯 After Deployment

1. Copy your Render backend URL
2. Update frontend `config.js` with this URL
3. Redeploy frontend on Netlify
4. Test the complete system!

---

**Backend for Musa Aamir Qazi Portfolio**  
Built with Node.js + Express + SQLite
