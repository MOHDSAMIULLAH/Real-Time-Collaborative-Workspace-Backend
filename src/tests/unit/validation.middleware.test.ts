import { Request, Response, NextFunction } from 'express';
import { validate } from '../../middleware/validation.middleware';
import { z } from 'zod';

describe('Validation Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('should pass validation for valid data', () => {
    const schema = z.object({
      name: z.string(),
      email: z.string().email(),
    });

    req.body = {
      name: 'Test User',
      email: 'test@example.com',
    };

    const middleware = validate(schema);
    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 400 for invalid data', () => {
    const schema = z.object({
      name: z.string(),
      email: z.string().email(),
    });

    req.body = {
      name: 'Test User',
      email: 'invalid-email',
    };

    const middleware = validate(schema);
    middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Validation failed',
        details: expect.any(Array),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return validation errors with field names', () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        email: z.string().email(),
      }),
    });

    req.body = {
      user: {
        name: 123, // Invalid type
        email: 'invalid',
      },
    };

    const middleware = validate(schema);
    middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();

    const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonCall.details).toBeDefined();
    expect(jsonCall.details.length).toBeGreaterThan(0);
  });

  it('should handle unexpected errors', () => {
    const schema = {
      parse: jest.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      }),
    } as any;

    const middleware = validate(schema);
    middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error',
    });
  });
});
