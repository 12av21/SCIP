import type { Request, Response, NextFunction } from "express";

// Must be registered LAST, after all routes. Express recognizes it as an
// error handler purely because it takes 4 arguments.
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error("Unhandled error:", err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Something went wrong on the server.";

  res.status(status).json({ message });
}
