const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const md5 = require('md5');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const User = require('./models/User');
const Column = require('./models/Column');
const Card = require('./models/Card');
const DeletedCard = require('./models/DeletedCard');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lawyer_task';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'avatar-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('只支持图片文件 (jpeg, jpg, png, gif, webp)'));
  }
});

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');

    // Initialize default data if empty
    await initializeDefaultData();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Initialize default columns and admin user
async function initializeDefaultData() {
  const columnCount = await Column.countDocuments();
  if (columnCount === 0) {
    const defaultColumns = [
      { name: '待处理', order: 0 },
      { name: '进行中', order: 1 },
      { name: '审核中', order: 2 },
      { name: '已完成', order: 3 },
      { name: '已归档', order: 4 }
    ];
    await Column.insertMany(defaultColumns);
    console.log('Default columns created');
  }

  const userCount = await User.countDocuments();
  if (userCount === 0) {
    const defaultUsers = [
      { username: 'admin', password: md5('admin123'), role: 'admin', color: '#FF6B6B' },
      { username: '张律师', password: md5('123456'), role: 'user', color: '#4ECDC4' },
      { username: '李助理', password: md5('123456'), role: 'user', color: '#45B7D1' }
    ];
    await User.insertMany(defaultUsers);
    console.log('Default users created');
  }
}

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.userId = userId;
  next();
};

// Admin Middleware
const adminMiddleware = async (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = await User.findById(userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  req.user = user;
  next();
};

// ============ AUTH ROUTES ============

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = md5(password);

    const user = await User.findOne({ username, password: hashedPassword });
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    res.json({
      _id: user._id,
      username: user.username,
      role: user.role,
      color: user.color
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      _id: user._id,
      username: user.username,
      role: user.role,
      color: user.color
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ COLUMN ROUTES ============

// Get all columns
app.get('/api/columns', async (req, res) => {
  try {
    const columns = await Column.find().sort({ order: 1 });
    res.json(columns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create column (admin only)
app.post('/api/columns', adminMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    const maxOrder = await Column.findOne().sort({ order: -1 });
    const newOrder = maxOrder ? maxOrder.order + 1 : 0;

    const column = new Column({ name, order: newOrder });
    await column.save();
    res.status(201).json(column);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update column (admin only)
app.put('/api/columns/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const column = await Column.findById(id);
    if (!column) {
      return res.status(404).json({ error: 'Column not found' });
    }

    if (name) column.name = name;
    await column.save();
    res.json(column);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete column (admin only)
app.delete('/api/columns/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await Card.deleteMany({ columnId: id });
    await Column.findByIdAndDelete(id);
    res.json({ message: 'Column deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CARD ROUTES ============

// Get all cards
app.get('/api/cards', async (req, res) => {
  try {
    const cards = await Card.find().sort({ order: 1 });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create card
app.post('/api/cards', authMiddleware, async (req, res) => {
  try {
    const { columnId, content } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const maxOrder = await Card.findOne({ columnId }).sort({ order: -1 });
    const newOrder = maxOrder ? maxOrder.order + 1 : 0;

    const card = new Card({
      columnId,
      creatorId: user._id,
      creatorName: user.username,
      creatorColor: user.color,
      creatorAvatar: user.avatar || '',
      content: content || '',
      order: newOrder
    });

    await card.save();
    res.status(201).json(card);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update card (status, content or move)
app.put('/api/cards/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, columnId, order, content } = req.body;

    const card = await Card.findById(id);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (status) card.status = status;
    if (columnId !== undefined) card.columnId = columnId;
    if (order !== undefined) card.order = order;
    if (content !== undefined) card.content = content;

    await card.save();
    res.json(card);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete card
app.delete('/api/cards/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const card = await Card.findById(id);

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Check if user is admin or the creator
    const user = await User.findById(req.userId);
    const isAdmin = user && user.role === 'admin';
    const isCreator = card.creatorId.toString() === req.userId;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: '只能删除自己创建的卡片' });
    }

    // Save to DeletedCard before deleting
    const deletedCard = new DeletedCard({
      originalId: card._id,
      columnId: card.columnId,
      creatorId: card.creatorId,
      creatorName: card.creatorName,
      creatorColor: card.creatorColor,
      creatorAvatar: card.creatorAvatar,
      status: card.status,
      content: card.content,
      order: card.order,
      deletedAt: new Date()
    });
    await deletedCard.save();

    await Card.findByIdAndDelete(id);
    res.json({ message: 'Card deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get deleted cards (admin only)
app.get('/api/deleted-cards', adminMiddleware, async (req, res) => {
  try {
    const { creatorId } = req.query;
    const filter = creatorId ? { creatorId } : {};
    const deletedCards = await DeletedCard.find(filter).sort({ deletedAt: -1 });
    res.json(deletedCards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ USER ROUTES ============

// Get all users (admin only)
app.get('/api/users', adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create user (admin only)
app.post('/api/users', adminMiddleware, async (req, res) => {
  try {
    const { username, password, role, color: userColor, avatar } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    let color = userColor;
    if (!color) {
      const userCount = await User.countDocuments();
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];
      color = colors[userCount % colors.length];
    }

    const user = new User({
      username,
      password: md5(password),
      role: role || 'user',
      color,
      avatar: avatar || ''
    });

    await user.save();
    res.status(201).json({
      _id: user._id,
      username: user.username,
      role: user.role,
      color: user.color
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload avatar image (admin only)
app.post('/api/upload/avatar', adminMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择图片文件' });
    }
    const avatarUrl = `/uploads/${req.file.filename}`;
    res.json({ url: avatarUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (admin only)
app.delete('/api/users/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ error: '不能删除管理员账户' });
    }

    await Card.deleteMany({ creatorId: id });
    await User.findByIdAndDelete(id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user (admin only)
app.put('/api/users/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, color, avatar } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if username is already taken by another user
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: '用户名已存在' });
      }
      user.username = username;
    }

    if (color) user.color = color;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    // Update all cards created by this user
    if (username || color || avatar !== undefined) {
      const updateData = {};
      if (username) updateData.creatorName = username;
      if (color) updateData.creatorColor = color;
      if (avatar !== undefined) updateData.creatorAvatar = avatar;

      await Card.updateMany(
        { creatorId: id },
        { $set: updateData }
      );
    }

    res.json({
      _id: user._id,
      username: user.username,
      role: user.role,
      color: user.color,
      avatar: user.avatar
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
