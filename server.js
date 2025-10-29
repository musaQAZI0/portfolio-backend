const express = require('express');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Hardcoded credentials
const ADMIN_EMAIL = 'musaqazi54@gmail.com';
const ADMIN_PASSWORD = 'musa123456';

// CORS configuration - Allow frontend domain
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'musa-portfolio-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS in production
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

// Serve uploaded images statically
app.use('/uploads', express.static('uploads'));

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

// Initialize SQLite database
const db = new sqlite3.Database('./portfolio.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initDatabase();
    }
});

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) {
        return next();
    } else {
        return res.status(401).json({ error: 'Unauthorized. Please login first.' });
    }
}

// Login route
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        req.session.authenticated = true;
        req.session.email = email;
        res.json({ 
            success: true, 
            message: 'Login successful',
            email: email 
        });
    } else {
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

// Check auth status route
app.get('/api/auth/status', (req, res) => {
    if (req.session && req.session.authenticated) {
        res.json({ 
            authenticated: true, 
            email: req.session.email 
        });
    } else {
        res.json({ authenticated: false });
    }
});

// Create tables
function initDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        technology TEXT NOT NULL,
        features TEXT,
        video_link TEXT,
        github_link TEXT,
        playstore_link TEXT,
        appstore_link TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Error creating projects table:', err);
    });

    db.run(`CREATE TABLE IF NOT EXISTS project_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        image_path TEXT NOT NULL,
        is_primary BOOLEAN DEFAULT 0,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    )`, (err) => {
        if (err) console.error('Error creating project_images table:', err);
    });
}

// API Routes

// Get all projects
app.get('/api/projects', (req, res) => {
    const technology = req.query.technology;
    let query = 'SELECT * FROM projects';
    let params = [];

    if (technology) {
        query += ' WHERE technology = ?';
        params.push(technology);
    }

    query += ' ORDER BY created_at DESC';

    db.all(query, params, (err, projects) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // Get images for each project
        const projectPromises = projects.map(project => {
            return new Promise((resolve, reject) => {
                db.all('SELECT * FROM project_images WHERE project_id = ?', [project.id], (err, images) => {
                    if (err) reject(err);
                    project.images = images;
                    resolve(project);
                });
            });
        });

        Promise.all(projectPromises)
            .then(projectsWithImages => {
                res.json(projectsWithImages);
            })
            .catch(err => {
                res.status(500).json({ error: err.message });
            });
    });
});

// Get single project
app.get('/api/projects/:id', (req, res) => {
    db.get('SELECT * FROM projects WHERE id = ?', [req.params.id], (err, project) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Get images
        db.all('SELECT * FROM project_images WHERE project_id = ?', [project.id], (err, images) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            project.images = images;
            res.json(project);
        });
    });
});

// Create new project with images
app.post('/api/projects', requireAuth, upload.array('images', 10), (req, res) => {
    const { title, description, technology, features, video_link, github_link, playstore_link, appstore_link } = req.body;

    if (!title || !description || !technology) {
        return res.status(400).json({ error: 'Title, description, and technology are required' });
    }

    const sql = `INSERT INTO projects (title, description, technology, features, video_link, github_link, playstore_link, appstore_link) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [title, description, technology, features, video_link, github_link, playstore_link, appstore_link], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        const projectId = this.lastID;

        // Insert images
        if (req.files && req.files.length > 0) {
            const imagePromises = req.files.map((file, index) => {
                return new Promise((resolve, reject) => {
                    const imagePath = '/uploads/images/' + file.filename;
                    const isPrimary = index === 0 ? 1 : 0;
                    db.run('INSERT INTO project_images (project_id, image_path, is_primary) VALUES (?, ?, ?)',
                        [projectId, imagePath, isPrimary],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            });

            Promise.all(imagePromises)
                .then(() => {
                    res.json({
                        success: true,
                        id: projectId,
                        message: 'Project created successfully'
                    });
                })
                .catch(err => {
                    res.status(500).json({ error: err.message });
                });
        } else {
            res.json({
                success: true,
                id: projectId,
                message: 'Project created successfully'
            });
        }
    });
});

// Update project
app.put('/api/projects/:id', requireAuth, upload.array('images', 10), (req, res) => {
    const { title, description, technology, features, video_link, github_link, playstore_link, appstore_link } = req.body;
    const projectId = req.params.id;

    const sql = `UPDATE projects 
                 SET title = ?, description = ?, technology = ?, features = ?, 
                     video_link = ?, github_link = ?, playstore_link = ?, appstore_link = ?
                 WHERE id = ?`;

    db.run(sql, [title, description, technology, features, video_link, github_link, playstore_link, appstore_link, projectId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // Add new images if provided
        if (req.files && req.files.length > 0) {
            const imagePromises = req.files.map((file) => {
                return new Promise((resolve, reject) => {
                    const imagePath = '/uploads/images/' + file.filename;
                    db.run('INSERT INTO project_images (project_id, image_path, is_primary) VALUES (?, ?, 0)',
                        [projectId, imagePath],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            });

            Promise.all(imagePromises)
                .then(() => {
                    res.json({
                        success: true,
                        message: 'Project updated successfully'
                    });
                })
                .catch(err => {
                    res.status(500).json({ error: err.message });
                });
        } else {
            res.json({
                success: true,
                message: 'Project updated successfully'
            });
        }
    });
});

// Delete project
app.delete('/api/projects/:id', requireAuth, (req, res) => {
    const projectId = req.params.id;

    // Get images to delete files
    db.all('SELECT * FROM project_images WHERE project_id = ?', [projectId], (err, images) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // Delete image files
        images.forEach(image => {
            const filePath = path.join(__dirname, image.image_path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });

        // Delete from database
        db.run('DELETE FROM projects WHERE id = ?', [projectId], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({
                success: true,
                message: 'Project deleted successfully'
            });
        });
    });
});

// Delete specific image
app.delete('/api/images/:id', requireAuth, (req, res) => {
    const imageId = req.params.id;

    db.get('SELECT * FROM project_images WHERE id = ?', [imageId], (err, image) => {
        if (err || !image) {
            res.status(404).json({ error: 'Image not found' });
            return;
        }

        // Delete file
        const filePath = path.join(__dirname, image.image_path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete from database
        db.run('DELETE FROM project_images WHERE id = ?', [imageId], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({
                success: true,
                message: 'Image deleted successfully'
            });
        });
    });
});

// Get projects by technology
app.get('/api/projects/technology/:tech', (req, res) => {
    const technology = req.params.tech;
    
    db.all('SELECT * FROM projects WHERE technology = ? ORDER BY created_at DESC', [technology], (err, projects) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        const projectPromises = projects.map(project => {
            return new Promise((resolve, reject) => {
                db.all('SELECT * FROM project_images WHERE project_id = ?', [project.id], (err, images) => {
                    if (err) reject(err);
                    project.images = images;
                    resolve(project);
                });
            });
        });

        Promise.all(projectPromises)
            .then(projectsWithImages => {
                res.json(projectsWithImages);
            })
            .catch(err => {
                res.status(500).json({ error: err.message });
            });
    });
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
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        }
        console.log('Database connection closed');
        process.exit(0);
    });
});
