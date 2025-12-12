const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('express-async-errors');
require('dotenv').config();

// config and logger
const config = require('./config');
const connectToDatabase = require('./config/database');
const logger = require('./utils/logger');

const{ shutdownProducer, initializeProducer} = require('../src/utils/eventProducer');
// import routes
const patientRoutes = require('./routes/patient.routes');
const healthRoutes = require('./routes/health.routes');

// import middlewares
const { errorHandler, notFound } = require('./middlewares/error.middleware');

const app = express();

// security middlewares
app.use(helmet());
app.use(cors());

// body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes
app.use('/health', healthRoutes);
app.use('/api/patients', patientRoutes);

// 404 middleware
// app.use(notFound);


// start server
const startServer = async () => {
    try{
        // connect to database
        await connectToDatabase();

        // initialize Kafka producer for evevent driven architecture
        await initializeProducer();
        // start listening
        const PORT = config.port;
        app.listen(PORT, () => {
            logger.info(`patient service running on port ${PORT}`);
            logger.info(`Environment: ${config.nodeEnv}`);
            logger.info(`Kafka: ${process.env.kafkaBrokers}|| localhost:9092`);
            
        })
    }catch(error){
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

// graceful shutdown
process.on('SIGNTERM', async () => {
    logger.info('SIGNTERM signal received: shutting down gracefully');
    await shutdownProducer();
    process.exit(0);
});
module.exports = app;