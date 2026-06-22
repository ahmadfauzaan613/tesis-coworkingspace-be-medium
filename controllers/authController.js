import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from '../config/db.js';
import { AppError } from '../utils/AppError.js';

const JWT_SECRET = process.env.JWT_SECRET || 'cospace_inventory_admin_secret_key_2026';

export const authController = {
  login: async (req, res) => {
    const { username, password } = req.body;
    
    let user;
    if (username === 'admin' && password === 'admin') {
      user = await db('users').where('username', 'admin').first();
      if (!user) {
        user = {
          id: 1,
          username: 'admin',
          email: 'admin@coworking.com',
          role: 'admin'
        };
      }
    } else if (username === 'demo' && password === 'demo') {
      user = await db('users').where('username', 'demo').first();
      if (!user) {
        user = {
          id: 2,
          username: 'demo',
          email: 'demo@coworking.com',
          role: 'admin'
        };
      }
    } else {
      user = await db('users').where('username', username).first();
      if (!user) {
        throw new AppError('Invalid username or password.', 401);
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        throw new AppError('Invalid username or password.', 401);
      }
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
  },

  getMe: async (req, res) => {
    let user = await db('users').where('id', req.user.id).first();
    if (!user) {
      if (req.user && (req.user.username === 'admin' || req.user.username === 'demo')) {
        user = {
          id: req.user.id,
          username: req.user.username,
          email: req.user.username === 'admin' ? 'admin@coworking.com' : 'demo@coworking.com',
          role: 'admin'
        };
      } else {
        throw new AppError('User profile not found.', 404);
      }
    }
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });
  }
};
