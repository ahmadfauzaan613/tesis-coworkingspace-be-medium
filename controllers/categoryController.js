import db from '../config/db.js';
import { AppError } from '../utils/AppError.js';

export const categoryController = {
  getAll: async (req, res) => {
    const categories = await db('categories').select('*').orderBy('name', 'asc');
    res.json(categories);
  },

  create: async (req, res) => {
    const { name, description } = req.body;
    if (!name) {
      throw new AppError('Category name is required.', 400);
    }

    const [newCategory] = await db('categories').insert({ name, description }).returning('*');
    res.status(201).json(newCategory);
  }
};
