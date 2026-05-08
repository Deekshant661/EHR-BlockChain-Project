'use strict';

/**
 * Global Express error handler.
 * Maps known error patterns to appropriate HTTP status codes.
 */
const globalErrorHandler = (err, req, res, next) => {
    console.error(`[Error] ${req.method} ${req.originalUrl} →`, err.message);

    // Determine status code from error message patterns
    let statusCode = 500;

    if (
        err.message.includes('not found') ||
        err.message.includes('does not exist')
    ) {
        statusCode = 404;
    } else if (
        err.message.includes('Unauthorized') ||
        err.message.includes('not authorized') ||
        err.message.includes('Identity not found')
    ) {
        statusCode = 401;
    } else if (
        err.message.includes('already exists') ||
        err.message.includes('Missing') ||
        err.message.includes('Invalid') ||
        err.message.includes('required')
    ) {
        statusCode = 400;
    }

    // Use explicit statusCode if attached to the error object
    if (err.statusCode) {
        statusCode = err.statusCode;
    }

    return res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal server error',
    });
};

module.exports = { globalErrorHandler };
