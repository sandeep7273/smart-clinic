const mongoose = require('mongoose');
const logger = require('../utils/logger');  

/**
 * Connect to MongoDB database
 */
const connectDatabase = async () => {
    try{
        const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/patient_db';
        const options = {
            // useNewUrlParser: true,  
            // useUnifiedTopology: true
        }
        await mongoose.connect(mongodbUri, options);

        logger.info(`Connected to MongoDB successfully to ${mongodbUri}`);

        mongoose.connection.on('error', (err) => {
            logger.error(`MongoDB connection error: ${err}`);
        });
        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });
    }catch(err){
        logger.error(`Failed to connect to MongoDB: ${err.message}`);
        process.exit(1);    
    }
}

module.exports = connectDatabase;