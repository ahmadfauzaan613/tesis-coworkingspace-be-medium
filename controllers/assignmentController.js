import db from '../config/db.js';
import { AppError } from '../utils/AppError.js';

export const assignmentController = {
  getAll: async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const [countResult] = await db('asset_assignments').count('id as count');
    const totalItems = parseInt(countResult.count, 10) || 0;
    const totalPages = Math.ceil(totalItems / limit);

    const assignments = await db('asset_assignments')
      .join('assets', 'asset_assignments.asset_id', '=', 'assets.id')
      .select('asset_assignments.*', 'assets.name as asset_name', 'assets.sku as asset_sku')
      .orderBy('asset_assignments.id', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      data: assignments,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit
      }
    });
  },

  create: async (req, res) => {
    const { assetId, assignedTo, quantity } = req.body;
    const adminId = req.user.id;
    const qty = parseInt(quantity, 10) || 1;

    if (!assetId || !assignedTo) {
      throw new AppError('assetId and assignedTo are required.', 400);
    }

    if (qty <= 0) {
      throw new AppError('Quantity must be greater than zero.', 400);
    }

    const newAssignment = await db.transaction(async (trx) => {
      // Fetch and lock asset to prevent race conditions during concurrent checkouts
      const asset = await trx('assets').where('id', assetId).first().forUpdate();
      if (!asset) {
        throw new AppError('Asset not found.', 404);
      }

      if (asset.stock < qty) {
        throw new AppError(`Insufficient stock. Only ${asset.stock} items available.`, 400);
      }

      // 1. Deduct stock from asset
      await trx('assets')
        .where('id', assetId)
        .update({
          stock: asset.stock - qty,
          updated_at: trx.fn.now()
        });

      // 2. Add history log audit
      await trx('stock_history').insert({
        asset_id: assetId,
        change_qty: -qty,
        change_type: 'DEDUCTION',
        remarks: `Allocated to: ${assignedTo}`,
        admin_id: adminId
      });

      // 3. Create assignment record
      const [inserted] = await trx('asset_assignments').insert({
        asset_id: assetId,
        assigned_to: assignedTo,
        quantity: qty,
        status: 'ACTIVE'
      }).returning('*');

      return inserted;
    });

    res.status(201).json(newAssignment);
  },

  returnAsset: async (req, res) => {
    const assignmentId = req.params.id;
    const adminId = req.user.id;

    await db.transaction(async (trx) => {
      const assignment = await trx('asset_assignments')
        .where('id', assignmentId)
        .first()
        .forUpdate();

      if (!assignment) {
        throw new AppError('Assignment record not found.', 404);
      }

      if (assignment.status === 'RETURNED') {
        throw new AppError('Asset has already been returned.', 400);
      }

      // 1. Update assignment status and set returned timestamp
      await trx('asset_assignments')
        .where('id', assignmentId)
        .update({
          status: 'RETURNED',
          returned_at: trx.fn.now(),
          updated_at: trx.fn.now()
        });

      // 2. Restore stock levels
      const asset = await trx('assets').where('id', assignment.asset_id).first().forUpdate();
      if (asset) {
        await trx('assets')
          .where('id', assignment.asset_id)
          .update({
            stock: asset.stock + assignment.quantity,
            updated_at: trx.fn.now()
          });

        // 3. Log transaction history audit
        await trx('stock_history').insert({
          asset_id: assignment.asset_id,
          change_qty: assignment.quantity,
          change_type: 'ADDITION',
          remarks: `Returned from: ${assignment.assigned_to}`,
          admin_id: adminId
        });
      }
    });

    res.json({ message: 'Asset returned successfully. Stock level restored.' });
  }
};
