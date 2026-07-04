import { describe, it, expect, vi } from 'vitest';
import { errorHandler } from '../../middlewares/errorMiddleware.js';

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('errorHandler middleware', () => {
  it('maps a unique constraint violation (23505) to a 400 fail response', () => {
    const res = mockRes();
    const err = { code: '23505', message: 'duplicate key value' };

    errorHandler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'fail',
      message: 'Database violation: Duplicate value entered. Record already exists.',
    });
  });

  it('maps a check constraint violation (23514) to a 400 fail response', () => {
    const res = mockRes();
    const err = { code: '23514', message: 'check constraint violated' };

    errorHandler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'fail',
      message: 'Database violation: Stock level cannot be negative.',
    });
  });

  it('maps a foreign key violation (23503) to a 404 fail response', () => {
    const res = mockRes();
    const err = { code: '23503', message: 'fk violation' };

    errorHandler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 'fail',
      message: 'Database violation: Referenced parent relation record not found.',
    });
  });

  it('passes through a custom AppError untouched', () => {
    const res = mockRes();
    const err = { statusCode: 404, status: 'fail', message: 'Asset item not found.' };

    errorHandler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ status: 'fail', message: 'Asset item not found.' });
  });

  it('defaults unknown errors to a 500 internal error response', () => {
    const res = mockRes();
    const err = new Error('Something exploded');

    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(err, {}, res, () => {});
    logSpy.mockRestore();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Something exploded' });
  });

  it('falls back to a generic message when the error has none', () => {
    const res = mockRes();
    const err = { statusCode: 500 };

    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(err, {}, res, () => {});
    logSpy.mockRestore();

    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'An unexpected internal server error occurred.',
    });
  });
});
