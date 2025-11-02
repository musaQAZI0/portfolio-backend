# Backend API - Musa Aamir Qazi Portfolio

Backend API server for mobile app developer portfolio.

## 🚀 Quick Start

```bash
npm install
npm start
```

Server runs on: http://localhost:3000

## 🔐 Credentials

**Email:** musaqazi54@gmail.com  
**Password:** musa123456

(Hardcoded in server.js - change them there if needed)

## 📦 What's Included

- Express.js REST API
- SQLite database
- File-based session storage (bulletproof!)
- Authentication system
- Image upload handling
- CORS configured for frontend

## 🌐 Deploy to Render

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Portfolio backend"
git remote add origin https://github.com/YOUR_USERNAME/portfolio-backend.git
git push -u origin main
```

### Step 2: Deploy on Render

1. Go to [Render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   ```
   Name: musa-portfolio-api
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   Plan: Free
   ```

### Step 3: Set Environment Variables

In Render dashboard, add:

```
FRONTEND_URL = https://your-netlify-site.netlify.app
NODE_ENV = production
SESSION_SECRET = your-random-secret-key-here
```

### Step 4: Note Your Backend URL

After deployment: `https://musa-portfolio-api.onrender.com`

**Important:** You'll need this URL for frontend configuration!

## 📊 API Endpoints

### Public:
- `GET /` - API info
- `GET /api/projects` - All projects
- `GET /api/projects/:id` - Single project
- `GET /api/projects/technology/:tech` - By technology
- `GET /uploads/images/*` - Images

### Authentication:
- `POST /api/login` - Login
- `POST /api/logout` - Logout
- `GET /api/auth/status` - Check status

### Protected (Login Required):
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `DELETE /api/images/:id` - Delete image

## 🗄️ Database

- **Type:** SQLite
- **File:** portfolio.db (auto-created)
- **Tables:** projects, project_images

## 📁 Sessions

- **Storage:** File-based (sessions/ folder)
- **Duration:** 24 hours
- **Cleanup:** Automatic

## 🔧 Configuration

Create `.env` file:

```env
PORT=3000
FRONTEND_URL=http://localhost:8080
SESSION_SECRET=musa-portfolio-secret-key-2025
NODE_ENV=development
```

## 🧪 Testing

```bash
# Test health
curl http://localhost:3000

# Test projects
curl http://localhost:3000/api/projects

# Test login
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"musaqazi54@gmail.com","password":"musa123456"}'
```

## ⚠️ Important for Production

1. **Update FRONTEND_URL** - Set to your Netlify URL
2. **Change SESSION_SECRET** - Use random string
3. **Enable HTTPS** - Automatic on Render
4. **Monitor logs** - Check Render dashboard

## 💡 Pro Tips

- Sessions persist in files (reliable!)
- Free tier sleeps after 15 min (first request wakes it)
- Database resets on restart (free tier)
- For persistent DB, upgrade to paid plan

## 📞 After Deployment

1. Copy your Render URL
2. Update frontend config.js
3. Update Render FRONTEND_URL variable
4. Test API endpoints
5. Done!

---

**Backend for Musa Aamir Qazi Portfolio**  
Built with Node.js + Express + SQLite + Session-File-Store
