/**
 * Simple Test Server for Auth Service GraphQL
 * Testing GraphQL setup without Kafka complications
 */

const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { makeExecutableSchema } = require('@graphql-tools/schema');

// Simple test schema
const typeDefs = `
  type Query {
    hello: String!
    testAuth: String!
  }
`;

const resolvers = {
  Query: {
    hello: () => 'Hello from Auth Service GraphQL!',
    testAuth: () => 'Auth Service GraphQL is working!'
  }
};

async function startTestServer() {
  const app = express();
  
  // Create GraphQL schema
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers
  });
  
  // Create Apollo Server
  const server = new ApolloServer({
    schema,
    introspection: true,
    playground: true
  });
  
  // Start Apollo Server
  await server.start();
  
  // Apply middleware
  server.applyMiddleware({
    app,
    path: '/graphql'
  });
  
  // Start Express server
  const PORT = 4001;
  app.listen(PORT, () => {
    console.log(`🚀 Auth Service GraphQL Test Server running on port ${PORT}`);
    console.log(`🔗 GraphQL endpoint: http://localhost:${PORT}/graphql`);
    console.log(`🔍 GraphQL playground: http://localhost:${PORT}/graphql`);
  });
}

startTestServer().catch(error => {
  console.error('Failed to start test server:', error);
  process.exit(1);
});