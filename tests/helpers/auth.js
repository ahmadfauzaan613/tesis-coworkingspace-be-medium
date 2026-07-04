import jwt from 'jsonwebtoken';

export function signToken({ id = 1, username = 'admin', role = 'admin' } = {}) {
  return jwt.sign({ id, username, role }, process.env.JWT_SECRET, { expiresIn: '8h' });
}

export function authHeader(overrides) {
  return `Bearer ${signToken(overrides)}`;
}
