import type { Context, Next } from 'hono';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error) {
    console.error('Error:', error);

    if (error instanceof AppError) {
      return c.json(
        {
          code: error.statusCode,
          error: error.message,
          code_error: error.code,
        },
        error.statusCode as any
      );
    } else if (error instanceof Error) {
      // Regular errors (validation, business logic) should return 400
      return c.json(
        {
          code: 400,
          error: error.message,
          code_error: 'VALIDATION_ERROR',
        },
        400 as any
      );
    }

    return c.json(
      {
        code: 500,
        error: 'Internal server error',
        code_error: 'INTERNAL_ERROR',
      },
      500 as any
    );
  }
};
