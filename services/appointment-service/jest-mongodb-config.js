module.exports = {
  mongodbMemoryServerOptions: {
    binary: {
      version: '6.0.14',
      skipMD5: true,
    },
    instance: {
      dbName: 'test_appointment',
    },
    autoStart: false,
  },
};
