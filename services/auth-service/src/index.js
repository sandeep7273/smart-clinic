//import module
const express = require('express');
const config = require('./config');
const swaggerUi = require('swagger-ui-express');
const swaggerSepc = require('./config/swagger');

const logger = require('./utils/logger');
const {errorHandler, notFoundHandler} = require('./middlewares/error.middleware')

const authRouter = require('./routes/auth.route');
// connect with database
const connectDatabase = require('./config/database');


// initialize express app
const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(
    swaggerSepc, {
        customCSS: '.swagger-ui .topbar { display: none }',
        customSiteTitle: `${config.serviceName} API Docs`
    }
));

// routes
app.use('/api/auth', authRouter);

// 404 not found handler
app.use(notFoundHandler);

// global error handler
app.use(errorHandler);

// start server
const startServer = async () => {
    try {
        // connct to database
        await connectDatabase();

        // start listening
        const PORT = config.port;
        app.listen(PORT, () => {
            logger.info(`${config.serviceName} is running on the port ${PORT}`);
            // console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        logger.error(`Failed to start server: ${error.mesage}`);
        process.exit(1);
        // console.error('Error starting server:', error);
    }
};

// hanled unhandled promise rejection
process.on('unhandledRejection', (error) => {
    logger.error(`unhandled Promise Rejection: ${error.message}`);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error)=> {
    logger.error(`Uncaught Exception: ${error.message}`);
    process.exit(1);
})

startServer();
