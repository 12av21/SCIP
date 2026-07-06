"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
// Must be registered LAST, after all routes. Express recognizes it as an
// error handler purely because it takes 4 arguments.
function errorHandler(err, _req, res, _next) {
    console.error("Unhandled error:", err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Something went wrong on the server.";
    res.status(status).json({ message });
}
