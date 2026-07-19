/**
 * GraphQL Base Schema
 * Defines base Query, Mutation, and Subscription types
 */

const { gql } = require('apollo-server-express');

/**
 * Base schema with empty types
 * These will be extended by stitched schemas
 */
const typeDefs = gql`
  type Query {
    _empty: String
  }

  type Mutation {
    _empty: String
  }

  type Subscription {
    _empty: String
  }
`;

module.exports = typeDefs;
