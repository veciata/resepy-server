export class AppError extends Error {
  constructor(message, statusCode = 500, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.expose = statusCode < 500;
  }
}

export function errorMiddleware(err, req, res, _next) {
  const status = err.statusCode || err.status || 500;
  const message =
    err.expose || status < 500 ? err.message : 'Internal Server Error';

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  res.status(status).json({
    message,
    ...(err.code && { code: err.code }),
  });
}
