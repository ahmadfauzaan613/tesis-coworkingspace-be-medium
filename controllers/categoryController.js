import db from '../config/db.js';
import { AppError } from '../utils/AppError.js';

export const categoryController = {
  getAll: async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const [{ count }] = await db('categories').count('id as count');
    const totalItems = parseInt(count, 10) || 0;
    const totalPages = Math.ceil(totalItems / limit);

    const categories = await db('categories')
      .select('*')
      .orderBy('name', 'asc')
      .limit(limit)
      .offset(offset);

    res.json({
      data: categories,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit
      }
    });
  },

  create: async (req, res) => {
    const { name, description } = req.body;
    if (!name) {
      throw new AppError('Category name is required.', 400);
    }

    const [newCategory] = await db('categories').insert({ name, description }).returning('*');
    res.status(201).json(newCategory);
  },

  update: async (req, res) => {
    const categoryId = req.params.id;
    const { name, description } = req.body;

    if (!name) {
      throw new AppError('Category name is required.', 400);
    }

    const updated = await db('categories')
      .where('id', categoryId)
      .update({ 
        name, 
        description, 
        updated_at: db.fn.now() 
      })
      .returning('*');

    if (updated.length === 0) {
      throw new AppError('Category not found.', 404);
    }

    res.json({ message: 'Category updated successfully', category: updated[0] });
  },

  delete: async (req, res) => {
    const categoryId = req.params.id;

    // Check if category is currently referencing assets to prevent cascade loss
    const [assetsCountResult] = await db('assets').where('category_id', categoryId).count('id as count');
    const assetsCount = parseInt(assetsCountResult.count, 10) || 0;
    if (assetsCount > 0) {
      throw new AppError('Cannot delete category. There are active equipment items associated with this category.', 400);
    }

    const deleted = await db('categories').where('id', categoryId).del();
    if (!deleted) {
      throw new AppError('Category not found.', 404);
    }

    res.json({ message: 'Category deleted successfully' });
  }
};
