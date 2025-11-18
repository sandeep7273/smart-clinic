const { model } = require('mongoose');
const {AppError} = require('../utils/errors');
const logger = require('../utils/logger');
/**
 * Global error handling middleware
*/

const errorHandler = (err, req, res, next) => {
    //log error
    logger.error(`Error: ${err.message}`, {
        error: err,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    // Default error
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Mongoose validation error
    if(err.name === 'ValidationError'){
        statusCode = 400;
        message = Object.values(err.errors).map((val)=>val.message).join(', ');
    }

    //Mongoose duplicate key error
    if( err.code && err.code === 11000){
        statusCode = 409;
        const field = Object.keys(err.keyValue);
        message = `Duplicate value for field: ${field}`;
    }

    // Mongose cast error (invalide OnjectID)
    if(err.name === 'CastError'){
        statusCode = 400;
        message = `Invalid ${err.path}: ${err.value}`;
    }

    //send error response

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && {stack: err.stack})
    });

}

/**
 * 404 not found
*/
const notFoundHandler = (req, res, next)=> {
    res.status(404).json({
        success: false,
        message: 'Resource not found'
    });
}

module.exports = {
    errorHandler,
    notFoundHandler
};
