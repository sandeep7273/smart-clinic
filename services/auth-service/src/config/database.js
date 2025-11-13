const mongoose = require('mongoose');
// const logger = require('../utils/logger');

/**
 * Connect to MongoDB database
 */
const connectDatabase = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/auth_db';
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        };
        await mongoose.connect(mongoURI, options);
        console.log('MongoDB connected successfully');
        // logger.info('MongoDB connected successfully');
    } catch (error) {
        // logger.error('MongoDB connection error:', error.message);
        console.error('MongoDB connection error:', error.message);
        process.exit(1);
    }
}

module.exports = connectDatabase;