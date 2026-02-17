const Groq = require('groq-sdk');
const { ChromaClient } = require('chromadb');
const { pipeline } = require('@xenova/transformers');
const config = require('../config');
const logger = require('../utils/logger');

class RAGService {
  constructor() {
    this.groq = new Groq({
      apiKey: config.groq.apiKey
    });
    
    this.chromaClient = null;
    this.collection = null;
    this.embedder = null;
  }

  /**
   * Initialize ChromaDB client and collection
   */
  async initialize() {
    try {
      // Initialize embedding model
      try {
        logger.info('Loading embedding model...');
        this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        logger.info('Embedding model loaded successfully');
      } catch (error) {
        logger.warn('Failed to load embedding model:', error.message);
        this.embedder = null;
      }
      // Initialize ChromaDB client
      this.chromaClient = new ChromaClient({
        path: `http://${config.chroma.host}:${config.chroma.port}`
      });

      // Get or create collection
      try {
        this.collection = await this.chromaClient.getOrCreateCollection({
          name: config.chroma.collectionName,
          metadata: { description: 'Medical knowledge base for RAG' }
        });
        logger.info('ChromaDB collection initialized');
      } catch (error) {
        logger.warn('ChromaDB not available, RAG will be disabled:', error.message);
        this.collection = null;
      }
    } catch (error) {
      logger.error('Failed to initialize RAG service:', error);
      this.chromaClient = null;
      this.collection = null;
    }
  }

  /**
   * Generate embedding for text using transformers
   */
  async generateEmbedding(text) {
    try {
      if (!this.embedder) {
        throw new Error('Embedding model not initialized');
      }

      const output = await this.embedder(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    } catch (error) {
      logger.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Add documents to vector database
   */
  async addDocuments(documents) {
    if (!this.collection) {
      logger.warn('ChromaDB collection not available');
      return false;
    }

    try {
      const ids = documents.map((_, idx) => `doc_${Date.now()}_${idx}`);
      const texts = documents.map(doc => doc.text);
      const metadatas = documents.map(doc => doc.metadata || {});

      // Generate embeddings
      const embeddings = await Promise.all(
        texts.map(text => this.generateEmbedding(text))
      );

      // Add to collection
      await this.collection.add({
        ids,
        embeddings,
        documents: texts,
        metadatas
      });

      logger.info(`Added ${documents.length} documents to vector database`);
      return true;
    } catch (error) {
      logger.error('Error adding documents to vector database:', error);
      return false;
    }
  }

  /**
   * Search for relevant documents using semantic similarity
   */
  async searchSimilarDocuments(query, numResults = 3) {
    if (!this.collection) {
      logger.warn('ChromaDB collection not available, skipping RAG');
      return [];
    }

    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);

      // Search in vector database
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: numResults
      });

      if (results.documents && results.documents[0]) {
        return results.documents[0].map((doc, idx) => ({
          text: doc,
          metadata: results.metadatas[0][idx],
          distance: results.distances[0][idx]
        }));
      }

      return [];
    } catch (error) {
      logger.error('Error searching similar documents:', error);
      return [];
    }
  }

  /**
   * Generate response using RAG
   */
  async generateResponseWithRAG(query, context = []) {
    try {
      // Search for relevant documents
      const relevantDocs = await this.searchSimilarDocuments(query);

      // Build context from retrieved documents
      let ragContext = '';
      if (relevantDocs.length > 0) {
        ragContext = '\n\nRelevant medical information:\n' +
          relevantDocs.map(doc => doc.text).join('\n\n');
      }

      // Build conversation context
      const contextMessages = context.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const systemPrompt = `You are a helpful medical assistant AI for a healthcare appointment system.
You provide information about health conditions and help users find appropriate doctors.

IMPORTANT GUIDELINES:
1. Always include a medical disclaimer: "This is not a substitute for professional medical advice."
2. Be empathetic and understanding
3. Recommend appropriate specialists based on symptoms
4. Keep responses concise and actionable
5. Never diagnose or prescribe treatments
${ragContext}`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...contextMessages,
        { role: 'user', content: query }
      ];

      const response = await this.groq.chat.completions.create({
        model: config.groq.model,
        messages,
        temperature: config.groq.temperature,
        max_tokens: config.groq.maxTokens
      });

      return response.choices[0].message.content;
    } catch (error) {
      logger.error('Error generating response with RAG:', error);
      throw error;
    }
  }

  /**
   * Enrich query with medical context
   */
  async enrichQuery(query) {
    const relevantDocs = await this.searchSimilarDocuments(query, 2);
    
    if (relevantDocs.length === 0) {
      return query;
    }

    const enrichedQuery = `${query}\n\nContext: ${relevantDocs.map(d => d.text).join(' ')}`;
    return enrichedQuery;
  }
}

module.exports = new RAGService();
