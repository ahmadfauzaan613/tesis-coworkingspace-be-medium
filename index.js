import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import db from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'cospace_inventory_admin_secret_key_2026';

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json());

// Swagger configuration options
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CoSpace Asset Inventory Management API',
      version: '1.2.0',
      description: 'Advanced API documentation for CoSpace Coworking Equipment Inventory Management system with JWT authentication, filters, stats, and CSV export.',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development Server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ]
  },
  apis: ['./index.js']
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Middleware: Verify JWT Admin Token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please login.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token is invalid or expired. Please login again.' });
    }
    req.user = user;
    next();
  });
}

// Database check helper
async function checkDbConnection() {
  try {
    await db.raw('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
}

/**
 * @openapi
 * /api/status:
 *   get:
 *     summary: Retrieve status of backend and DB connection
 *     responses:
 *       200:
 *         description: OK
 */
app.get('/api/status', async (req, res) => {
  const dbConnected = await checkDbConnection();
  res.json({
    status: 'Online',
    database: dbConnected ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Administrator Login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, returns token
 *       401:
 *         description: Invalid username or password
 */
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const dbConnected = await checkDbConnection();

  if (!dbConnected) {
    return res.status(500).json({ error: 'Database offline. Auth authentication unavailable.' });
  }

  try {
    const user = await db('users').where('username', username).first();
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Authentication process failed', details: error.message });
  }
});

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get logged-in Admin credentials info
 *     responses:
 *       200:
 *         description: Returns administrator identity profile
 *       401:
 *         description: Unauthorized
 */
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await db('users').where('id', req.user.id).first();
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve user profile', details: error.message });
  }
});

/**
 * @openapi
 * /api/categories:
 *   get:
 *     summary: Get all asset categories
 *     responses:
 *       200:
 *         description: List of categories
 */
app.get('/api/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await db('categories').select('*').orderBy('name', 'asc');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories', details: error.message });
  }
});

/**
 * @openapi
 * /api/categories:
 *   post:
 *     summary: Create new asset category
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created
 */
app.post('/api/categories', authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  try {
    const [newCategory] = await db('categories').insert({ name, description }).returning('*');
    res.status(201).json(newCategory);
  } catch (error) {
    if (error.message.includes('unique constraint')) {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    res.status(500).json({ error: 'Failed to create category', details: error.message });
  }
});

/**
 * @openapi
 * /api/assets:
 *   get:
 *     summary: List coworking space inventory assets with filters
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by asset name or SKU
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by equipment status (Available, Broken, etc.)
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter to only show low stock items (stock < 5)
 *     responses:
 *       200:
 *         description: List of filtered assets
 */
app.get('/api/assets', authenticateToken, async (req, res) => {
  const { search, categoryId, status, lowStock } = req.query;

  try {
    let query = db('assets')
      .join('categories', 'assets.category_id', '=', 'categories.id')
      .select('assets.*', 'categories.name as category_name');

    if (search) {
      query = query.andWhere((builder) => {
        builder.where('assets.name', 'ilike', `%${search}%`)
               .orWhere('assets.sku', 'ilike', `%${search}%`);
      });
    }

    if (categoryId) {
      query = query.andWhere('assets.category_id', categoryId);
    }

    if (status) {
      query = query.andWhere('assets.status', status);
    }

    if (lowStock === 'true') {
      // Trigger warning if stock drops below 5
      query = query.andWhere('assets.stock', '<', 5);
    }

    const assets = await query.orderBy('assets.id', 'asc');
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assets', details: error.message });
  }
});

/**
 * @openapi
 * /api/assets/export:
 *   get:
 *     summary: Export all asset inventory items as a CSV file
 *     responses:
 *       200:
 *         description: CSV file streamed
 */
app.get('/api/assets/export', authenticateToken, async (req, res) => {
  try {
    const assets = await db('assets')
      .join('categories', 'assets.category_id', '=', 'categories.id')
      .select(
        'assets.id',
        'assets.name',
        'assets.sku',
        'categories.name as category_name',
        'assets.location',
        'assets.stock',
        'assets.status',
        'assets.created_at'
      )
      .orderBy('assets.id', 'asc');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory_assets_export.csv"');

    let csvContent = 'ID,Asset Name,SKU,Category,Location,Stock Level,Status,Created At\n';
    
    for (const asset of assets) {
      const nameEscaped = `"${asset.name.replace(/"/g, '""')}"`;
      const skuEscaped = `"${(asset.sku || '').replace(/"/g, '""')}"`;
      const catEscaped = `"${asset.category_name.replace(/"/g, '""')}"`;
      const locEscaped = `"${(asset.location || '').replace(/"/g, '""')}"`;
      const createdAtStr = asset.created_at instanceof Date ? asset.created_at.toISOString() : new Date(asset.created_at).toISOString();
      
      csvContent += `${asset.id},${nameEscaped},${skuEscaped},${catEscaped},${locEscaped},${asset.stock},${asset.status},${createdAtStr}\n`;
    }

    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export assets CSV', details: error.message });
  }
});

/**
 * @openapi
 * /api/dashboard/stats:
 *   get:
 *     summary: Retrieve aggregate inventory metrics for stats panel dashboard
 *     responses:
 *       200:
 *         description: Object containing counts and recent log items
 */
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const [totalAssetsResult] = await db('assets').count('id as count');
    const [totalCategoriesResult] = await db('categories').count('id as count');
    const [outOfStockResult] = await db('assets').where('stock', 0).count('id as count');
    const [lowStockResult] = await db('assets').where('stock', '>', 0).andWhere('stock', '<', 5).count('id as count');
    const [brokenResult] = await db('assets').whereIn('status', ['Broken', 'Maintenance']).count('id as count');

    const recentActivities = await db('stock_history')
      .join('assets', 'stock_history.asset_id', '=', 'assets.id')
      .leftJoin('users', 'stock_history.admin_id', '=', 'users.id')
      .select(
        'stock_history.id',
        'stock_history.change_qty',
        'stock_history.change_type',
        'stock_history.remarks',
        'stock_history.created_at',
        'assets.name as asset_name',
        'users.username as admin_username'
      )
      .orderBy('stock_history.created_at', 'desc')
      .limit(5);

    res.json({
      totalAssets: parseInt(totalAssetsResult.count, 10) || 0,
      totalCategories: parseInt(totalCategoriesResult.count, 10) || 0,
      outOfStock: parseInt(outOfStockResult.count, 10) || 0,
      lowStock: parseInt(lowStockResult.count, 10) || 0,
      brokenAssets: parseInt(brokenResult.count, 10) || 0,
      recentActivities
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve dashboard stats', details: error.message });
  }
});

/**
 * @openapi
 * /api/assets:
 *   post:
 *     summary: Create inventory asset item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - categoryId
 *               - name
 *             properties:
 *               categoryId:
 *                 type: integer
 *               name:
 *                 type: string
 *               sku:
 *                 type: string
 *               description:
 *                 type: string
 *               initialStock:
 *                 type: integer
 *               location:
 *                 type: string
 *               status:
 *                 type: string
 */
app.post('/api/assets', authenticateToken, async (req, res) => {
  const { categoryId, name, sku, description, initialStock, location, status } = req.body;
  const adminId = req.user.id;

  if (!categoryId || !name) {
    return res.status(400).json({ error: 'categoryId and name are required' });
  }

  const stock = initialStock !== undefined ? initialStock : 0;
  if (stock < 0) {
    return res.status(400).json({ error: 'Initial stock cannot be negative' });
  }

  try {
    const newAsset = await db.transaction(async (trx) => {
      const category = await trx('categories').where('id', categoryId).first();
      if (!category) {
        throw new Error('Category not found');
      }

      const [insertedAsset] = await trx('assets').insert({
        category_id: categoryId,
        name,
        sku,
        description,
        stock,
        location,
        status: status || 'Available'
      }).returning('*');

      // Audit Log for initial stock creation
      await trx('stock_history').insert({
        asset_id: insertedAsset.id,
        change_qty: stock,
        change_type: 'INITIAL',
        remarks: 'Initial inventory asset creation',
        admin_id: adminId
      });

      return insertedAsset;
    });

    res.status(201).json(newAsset);
  } catch (error) {
    if (error.message === 'Category not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('unique constraint') || error.message.includes('sku')) {
      return res.status(400).json({ error: 'Asset SKU must be unique' });
    }
    res.status(500).json({ error: 'Asset creation failed', details: error.message });
  }
});

/**
 * @openapi
 * /api/assets/{id}:
 *   put:
 *     summary: Update basic asset details (excluding stock)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
app.put('/api/assets/:id', authenticateToken, async (req, res) => {
  const assetId = req.params.id;
  const { categoryId, name, sku, description, location, status } = req.body;

  try {
    const updated = await db('assets')
      .where('id', assetId)
      .update({
        category_id: categoryId,
        name,
        sku,
        description,
        location,
        status,
        updated_at: db.fn.now()
      })
      .returning('*');

    if (updated.length === 0) {
      return res.status(404).json({ error: 'Asset item not found' });
    }

    res.json({ message: 'Asset details updated successfully', asset: updated[0] });
  } catch (error) {
    res.status(500).json({ error: 'Asset update failed', details: error.message });
  }
});

/**
 * @openapi
 * /api/assets/{id}/stock:
 *   post:
 *     summary: Adjust stock inventory for an asset
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - changeQty
 *               - changeType
 *             properties:
 *               changeQty:
 *                 type: integer
 *               changeType:
 *                 type: string
 *                 enum: [ADDITION, DEDUCTION, DAMAGE, AUDIT]
 *               remarks:
 *                 type: string
 */
app.post('/api/assets/:id/stock', authenticateToken, async (req, res) => {
  const assetId = req.params.id;
  const { changeQty, changeType, remarks } = req.body;
  const adminId = req.user.id;

  if (typeof changeQty !== 'number' || changeQty === 0) {
    return res.status(400).json({ error: 'changeQty must be a non-zero integer' });
  }

  const allowedTypes = ['ADDITION', 'DEDUCTION', 'DAMAGE', 'AUDIT'];
  if (!allowedTypes.includes(changeType)) {
    return res.status(400).json({ error: `changeType must be one of: ${allowedTypes.join(', ')}` });
  }

  try {
    await db.transaction(async (trx) => {
      // Fetch and lock the asset record to avoid race conditions during concurrent modifications (FOR UPDATE)
      const asset = await trx('assets')
        .where('id', assetId)
        .first()
        .forUpdate();

      if (!asset) {
        throw new Error('Asset not found');
      }

      const newStock = asset.stock + changeQty;

      // Validate: stock level cannot drop below 0
      if (newStock < 0) {
        throw new Error('Stock cannot be negative');
      }

      // Update assets
      await trx('assets')
        .where('id', assetId)
        .update({
          stock: newStock,
          updated_at: trx.fn.now()
        });

      // Insert audit log trail
      await trx('stock_history').insert({
        asset_id: assetId,
        change_qty: changeQty,
        change_type: changeType,
        remarks: remarks || `Stock adjusted by ${changeQty}`,
        admin_id: adminId
      });
    });

    res.json({ message: 'Stock level adjusted successfully' });
  } catch (error) {
    if (error.message === 'Asset not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Stock cannot be negative') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Stock adjustment failed', details: error.message });
  }
});

/**
 * @openapi
 * /api/assets/{id}:
 *   delete:
 *     summary: Delete asset item
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
app.delete('/api/assets/:id', authenticateToken, async (req, res) => {
  const assetId = req.params.id;

  try {
    const deleted = await db('assets').where('id', assetId).del();
    if (!deleted) {
      return res.status(404).json({ error: 'Asset item not found' });
    }
    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete asset', details: error.message });
  }
});

/**
 * @openapi
 * /api/history:
 *   get:
 *     summary: Get global stock logs history audit trail
 *     responses:
 *       200:
 *         description: List of audit records
 */
app.get('/api/history', authenticateToken, async (req, res) => {
  try {
    const logs = await db('stock_history')
      .join('assets', 'stock_history.asset_id', '=', 'assets.id')
      .leftJoin('users', 'stock_history.admin_id', '=', 'users.id')
      .select(
        'stock_history.*',
        'assets.name as asset_name',
        'assets.sku as asset_sku',
        'users.username as admin_username'
      )
      .orderBy('stock_history.created_at', 'desc');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve stock history logs', details: error.message });
  }
});

/**
 * @openapi
 * /api/assets/{id}/history:
 *   get:
 *     summary: Get stock logs history audit trail for specific asset
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
app.get('/api/assets/:id/history', authenticateToken, async (req, res) => {
  const assetId = req.params.id;
  try {
    const logs = await db('stock_history')
      .leftJoin('users', 'stock_history.admin_id', '=', 'users.id')
      .select('stock_history.*', 'users.username as admin_username')
      .where('stock_history.asset_id', assetId)
      .orderBy('stock_history.created_at', 'desc');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve asset stock history logs', details: error.message });
  }
});

// Boot backend Express API
app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(`🚀 CoSpace Inventory Server running at http://localhost:${PORT}`);
  console.log(`📘 Swagger API Documentation at http://localhost:${PORT}/api-docs`);
  console.log(`====================================================`);
  
  const connected = await checkDbConnection();
  if (connected) {
    console.log('✅ PostgreSQL Connection established.');
  } else {
    console.log('⚠️ Database connection could not be established.');
    console.log('💡 Configure POSTGRES_HOST credentials in Backend/.env.');
  }
});
