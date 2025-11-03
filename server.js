const express = require('express');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Hardcoded credentials
const ADMIN_EMAIL = 'musaqazi54@gmail.com';
const ADMIN_PASSWORD = 'musa123456';

// JWT Secret (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'musa-portfolio-jwt-secret-2025';

// MongoDB Connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://musaqazi54:lLpjH51UiwLbvPux@cluster0.im1x1fy.mongodb.net/?appName=Cluster0';

// Create sessions directory if it doesn't exist
const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir);
}

// CORS configuration - Allow frontend domain
const allowedOrigins = [
    'http://localhost:8080',
    'http://localhost:3000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:3000',
    'http://localhost:5500', // Live Server
    'http://127.0.0.1:5500',
    'https://fantastic-praline-fe806a.netlify.app', // Old production frontend
    'https://precious-longma-053611.netlify.app' // New production frontend
];

// Add production frontend URL from environment variable
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else if (process.env.NODE_ENV === 'development') {
            console.log('Allowing origin in development:', origin);
            callback(null, true);
        } else {
            console.log('Blocked by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie']
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware with file store
app.use(session({
    store: new FileStore({
        path: sessionsDir,
        ttl: 86400, // 24 hours in seconds
        retries: 2,
        reapInterval: 3600 // Clean up expired sessions every hour
    }),
    secret: process.env.SESSION_SECRET || 'musa-portfolio-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    name: 'musa.sid',
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // true in production with HTTPS
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' required for cross-origin
        path: '/',
        partitioned: process.env.NODE_ENV === 'production' // Required for Chrome cross-site cookies
    },
    rolling: true // Reset cookie expiry on every request
}));

// Log session info
app.use((req, res, next) => {
    if (req.session) {
        console.log('Session ID:', req.sessionID);
        console.log('Session Data:', req.session);
    }
    next();
});

// Serve uploaded images statically
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'Musa Aamir Qazi Portfolio API',
        status: 'running',
        version: '1.0.0',
        endpoints: {
            public: [
                'GET /api/projects',
                'GET /api/projects/:id',
                'GET /api/projects/technology/:tech',
                'GET /uploads/images/*'
            ],
            auth: [
                'POST /api/login',
                'POST /api/logout',
                'GET /api/auth/status'
            ],
            protected: [
                'POST /api/projects',
                'PUT /api/projects/:id',
                'DELETE /api/projects/:id',
                'DELETE /api/images/:id'
            ]
        }
    });
});

// Ensure upload directory exists
const uploadDir = './uploads/images';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: Images only (jpeg, jpg, png, gif, webp)');
        }
    }
});

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB successfully!');
        console.log('Database:', mongoose.connection.name);
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// MongoDB Schemas
const projectImageSchema = new mongoose.Schema({
    image_path: { type: String, required: true },
    is_primary: { type: Boolean, default: false }
});

const projectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    technology: { type: String, required: true },
    features: String,
    video_link: String,
    github_link: String,
    playstore_link: String,
    appstore_link: String,
    images: [projectImageSchema],
    created_at: { type: Date, default: Date.now }
});

const Project = mongoose.model('Project', projectSchema);

// Authentication middleware - Check JWT token
function requireAuth(req, res, next) {
    // First check JWT token (new method)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            return next();
        } catch (err) {
            console.error('JWT verification failed:', err.message);
        }
    }

    // Fallback to session (backwards compatibility)
    if (req.session && req.session.authenticated) {
        return next();
    }

    return res.status(401).json({ error: 'Unauthorized. Please login first.' });
}

// Login route - Generate JWT token
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    console.log('Login attempt:', email);

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        // Generate JWT token
        const token = jwt.sign(
            { email: email, authenticated: true },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Also set session for backwards compatibility
        req.session.authenticated = true;
        req.session.email = email;

        console.log('Login successful for:', email);
        res.json({
            success: true,
            message: 'Login successful',
            email: email,
            token: token
        });
    } else {
        console.log('Login failed: Invalid credentials');
        res.status(401).json({
            success: false,
            error: 'Invalid email or password'
        });
    }
});

// Logout route
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).json({ error: 'Error logging out' });
        } else {
            res.json({ success: true, message: 'Logged out successfully' });
        }
    });
});

// Check auth status route - Verify JWT token
app.get('/api/auth/status', (req, res) => {
    // First check JWT token (new method)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            console.log('Auth check - JWT valid for:', decoded.email);
            return res.json({
                authenticated: true,
                email: decoded.email
            });
        } catch (err) {
            console.error('JWT verification failed:', err.message);
        }
    }

    // Fallback to session check (backwards compatibility)
    console.log('Auth check - Session:', req.session);
    console.log('Session ID:', req.sessionID);

    if (req.session && req.session.authenticated) {
        res.json({
            authenticated: true,
            email: req.session.email
        });
    } else {
        res.json({ authenticated: false });
    }
});

// MongoDB collections are automatically created when first document is inserted

// API Routes

// Get all projects
app.get('/api/projects', async (req, res) => {
    try {
        const technology = req.query.technology;
        const filter = technology ? { technology } : {};

        const projects = await Project.find(filter).sort({ created_at: -1 });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single project
app.get('/api/projects/:id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new project with images
app.post('/api/projects', requireAuth, upload.array('images', 10), async (req, res) => {
    try {
        const { title, description, technology, features, video_link, github_link, playstore_link, appstore_link } = req.body;

        if (!title || !description || !technology) {
            return res.status(400).json({ error: 'Title, description, and technology are required' });
        }

        // Prepare images array
        const images = req.files ? req.files.map((file, index) => ({
            image_path: '/uploads/images/' + file.filename,
            is_primary: index === 0
        })) : [];

        // Create project
        const project = new Project({
            title,
            description,
            technology,
            features,
            video_link,
            github_link,
            playstore_link,
            appstore_link,
            images
        });

        await project.save();

        res.json({
            success: true,
            id: project._id,
            message: 'Project created successfully'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update project
app.put('/api/projects/:id', requireAuth, upload.array('images', 10), async (req, res) => {
    try {
        const { title, description, technology, features, video_link, github_link, playstore_link, appstore_link } = req.body;

        const updateData = {
            title,
            description,
            technology,
            features,
            video_link,
            github_link,
            playstore_link,
            appstore_link
        };

        // Add new images if provided
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => ({
                image_path: '/uploads/images/' + file.filename,
                is_primary: false
            }));

            // Get existing images and append new ones
            const project = await Project.findById(req.params.id);
            if (project) {
                updateData.images = [...project.images, ...newImages];
            }
        }

        const updatedProject = await Project.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updatedProject) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({
            success: true,
            message: 'Project updated successfully'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete project
app.delete('/api/projects/:id', requireAuth, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Delete image files
        if (project.images && project.images.length > 0) {
            project.images.forEach(image => {
                const filePath = path.join(__dirname, image.image_path);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }

        // Delete from database
        await Project.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Project deleted successfully'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete specific image
app.delete('/api/images/:id', requireAuth, async (req, res) => {
    try {
        const imageId = req.params.id;

        // Find project containing this image
        const project = await Project.findOne({ 'images._id': imageId });

        if (!project) {
            return res.status(404).json({ error: 'Image not found' });
        }

        // Find the image in the project
        const image = project.images.id(imageId);
        if (!image) {
            return res.status(404).json({ error: 'Image not found' });
        }

        // Delete physical file
        const filePath = path.join(__dirname, image.image_path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Remove image from array
        image.remove();
        await project.save();

        res.json({
            success: true,
            message: 'Image deleted successfully'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get projects by technology
app.get('/api/projects/technology/:tech', async (req, res) => {
    try {
        const technology = req.params.tech;
        const projects = await Project.find({ technology }).sort({ created_at: -1 });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'Musa Aamir Qazi Portfolio API',
        status: 'running',
        version: '1.0.0'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        process.exit(0);
    } catch (err) {
        console.error('Error closing MongoDB:', err.message);
        process.exit(1);
    }
});
