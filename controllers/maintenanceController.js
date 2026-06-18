import db from '../config/db.js';
import { AppError } from '../utils/AppError.js';

export const maintenanceController = {
  getAll: async (req, res) => {
    const { status } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const getBaseQuery = () => {
      let q = db('maintenance_tickets');
      if (status) {
        q = q.where('status', status);
      }
      return q;
    };

    const [countResult] = await getBaseQuery().count('id as count');
    const totalItems = parseInt(countResult.count, 10) || 0;
    const totalPages = Math.ceil(totalItems / limit);

    const tickets = await getBaseQuery()
      .join('assets', 'maintenance_tickets.asset_id', '=', 'assets.id')
      .select('maintenance_tickets.*', 'assets.name as asset_name', 'assets.sku as asset_sku')
      .orderBy('maintenance_tickets.id', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      data: tickets,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit
      }
    });
  },

  create: async (req, res) => {
    const { assetId, issueDescription, assetStatus } = req.body;

    if (!assetId || !issueDescription) {
      throw new AppError('assetId and issueDescription are required.', 400);
    }

    const newTicket = await db.transaction(async (trx) => {
      const asset = await trx('assets').where('id', assetId).first();
      if (!asset) {
        throw new AppError('Asset not found.', 404);
      }

      // 1. Create maintenance ticket
      const [inserted] = await trx('maintenance_tickets').insert({
        asset_id: assetId,
        issue_description: issueDescription,
        status: 'PENDING'
      }).returning('*');

      // 2. Set asset status to Broken/Maintenance if provided
      if (assetStatus && ['Broken', 'Maintenance'].includes(assetStatus)) {
        await trx('assets')
          .where('id', assetId)
          .update({
            status: assetStatus,
            updated_at: trx.fn.now()
          });
      }

      return inserted;
    });

    res.status(201).json(newTicket);
  },

  resolveTicket: async (req, res) => {
    const ticketId = req.params.id;
    const { repairCost, vendorName, restoreAssetStatus } = req.body;
    const cost = parseInt(repairCost, 10) || 0;

    if (cost < 0) {
      throw new AppError('Repair cost cannot be negative.', 400);
    }

    await db.transaction(async (trx) => {
      const ticket = await trx('maintenance_tickets')
        .where('id', ticketId)
        .first()
        .forUpdate();

      if (!ticket) {
        throw new AppError('Maintenance ticket not found.', 404);
      }

      if (ticket.status === 'RESOLVED') {
        throw new AppError('Ticket has already been resolved.', 400);
      }

      // 1. Update ticket details to RESOLVED
      await trx('maintenance_tickets')
        .where('id', ticketId)
        .update({
          status: 'RESOLVED',
          repair_cost: cost,
          vendor_name: vendorName || null,
          resolved_at: trx.fn.now(),
          updated_at: trx.fn.now()
        });

      // 2. Return asset status to Available if requested
      if (restoreAssetStatus === true) {
        await trx('assets')
          .where('id', ticket.asset_id)
          .update({
            status: 'Available',
            updated_at: trx.fn.now()
          });
      }
    });

    res.json({ message: 'Maintenance ticket resolved successfully.' });
  }
};
