import db from '../config/db.js';
import { AppError } from '../utils/AppError.js';

export const assetController = {
  getAll: async (req, res) => {
    const { search, categoryId, status, lowStock } = req.query;

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
      query = query.andWhere('assets.stock', '<', 5);
    }

    const assets = await query.orderBy('assets.id', 'asc');
    res.json(assets);
  },

  create: async (req, res) => {
    const { categoryId, name, sku, description, initialStock, location, status } = req.body;
    const adminId = req.user.id;

    if (!categoryId || !name) {
      throw new AppError('categoryId and name are required.', 400);
    }

    const stock = initialStock !== undefined ? initialStock : 0;
    if (stock < 0) {
      throw new AppError('Initial stock level cannot be negative.', 400);
    }

    const newAsset = await db.transaction(async (trx) => {
      const category = await trx('categories').where('id', categoryId).first();
      if (!category) {
        throw new AppError('Asset category not found.', 404);
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
  },

  update: async (req, res) => {
    const assetId = req.params.id;
    const { categoryId, name, sku, description, location, status } = req.body;

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
      throw new AppError('Asset item not found.', 404);
    }

    res.json({ message: 'Asset details updated successfully', asset: updated[0] });
  },

  adjustStock: async (req, res) => {
    const assetId = req.params.id;
    const { changeQty, changeType, remarks } = req.body;
    const adminId = req.user.id;

    if (typeof changeQty !== 'number' || changeQty === 0) {
      throw new AppError('changeQty must be a non-zero integer.', 400);
    }

    const allowedTypes = ['ADDITION', 'DEDUCTION', 'DAMAGE', 'AUDIT'];
    if (!allowedTypes.includes(changeType)) {
      throw new AppError(`changeType must be one of: ${allowedTypes.join(', ')}`, 400);
    }

    await db.transaction(async (trx) => {
      const asset = await trx('assets')
        .where('id', assetId)
        .first()
        .forUpdate();

      if (!asset) {
        throw new AppError('Asset item not found.', 404);
      }

      const newStock = asset.stock + changeQty;

      if (newStock < 0) {
        throw new AppError('Negative stock level is not permitted.', 400);
      }

      await trx('assets')
        .where('id', assetId)
        .update({
          stock: newStock,
          updated_at: trx.fn.now()
        });

      await trx('stock_history').insert({
        asset_id: assetId,
        change_qty: changeQty,
        change_type: changeType,
        remarks: remarks || `Stock adjusted by ${changeQty}`,
        admin_id: adminId
      });
    });

    res.json({ message: 'Stock level adjusted successfully' });
  },

  delete: async (req, res) => {
    const assetId = req.params.id;

    const deleted = await db('assets').where('id', assetId).del();
    if (!deleted) {
      throw new AppError('Asset item not found.', 404);
    }
    res.json({ message: 'Asset deleted successfully' });
  },

  exportCSV: async (req, res) => {
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
  },

  getGlobalHistory: async (req, res) => {
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
  },

  getAssetHistory: async (req, res) => {
    const assetId = req.params.id;
    const logs = await db('stock_history')
      .leftJoin('users', 'stock_history.admin_id', '=', 'users.id')
      .select('stock_history.*', 'users.username as admin_username')
      .where('stock_history.asset_id', assetId)
      .orderBy('stock_history.created_at', 'desc');
    res.json(logs);
  }
};
