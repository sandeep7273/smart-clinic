//import module
const express = require('express');
const config = require('./config');
const authRouter = require('./routes/auth.route');
// connect with database
const connectDatabase = require('./config/database');


// initialize express app
const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes
app.use('/api/auth', authRouter);

// start server
const startServer = async () => {
    try {
        // connct to database
        await connectDatabase();

        // start listening
        const PORT = config.port;
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Error starting server:', error);
    }
};

startServer();
