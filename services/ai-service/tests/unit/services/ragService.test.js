/**
 * Unit Tests for RAGService
 */

const ragService = require('../../../src/services/ragService');
const config = require('../../../src/config');

// Mock dependencies
jest.mock('groq-sdk');
jest.mock('chromadb');
jest.mock('@xenova/transformers');
jest.mock('../../../src/utils/logger');

const Groq = require('groq-sdk');
const { ChromaClient } = require('chromadb');
const { pipeline } = require('@xenova/transformers');

describe('RAGService', () => {
  let mockGroqInstance;
  let mockChromaClient;
  let mockCollection;
  let mockEmbedder;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Groq
    mockGroqInstance = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    };
    Groq.mockImplementation(() => mockGroqInstance);

    // Mock ChromaDB collection
    mockCollection = {
      add: jest.fn(),
      query: jest.fn(),
      get: jest.fn(),
      delete: jest.fn()
    };

    // Mock ChromaDB client
    mockChromaClient = {
      getOrCreateCollection: jest.fn().mockResolvedValue(mockCollection)
    };
    ChromaClient.mockImplementation(() => mockChromaClient);

    // Mock embedder
    mockEmbedder = jest.fn();
    pipeline.mockResolvedValue(mockEmbedder);
  });

  describe('initialize', () => {
    it('should initialize ChromaDB and embedder successfully', async () => {
      mockEmbedder.mockResolvedValue({ 
        data: new Float32Array([0.1, 0.2, 0.3]) 
      });

      await ragService.initialize();

      expect(ChromaClient).toHaveBeenCalledWith({
        path: `http://${config.chroma.host}:${config.chroma.port}`
      });
      expect(mockChromaClient.getOrCreateCollection).toHaveBeenCalledWith({
        name: config.chroma.collectionName,
        metadata: { description: 'Medical knowledge base for RAG' }
      });
      expect(pipeline).toHaveBeenCalledWith('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    });

    it('should handle embedder initialization failure gracefully', async () => {
      pipeline.mockRejectedValue(new Error('Embedder load failed'));

      await ragService.initialize();

      expect(ragService.embedder).toBe(null);
    });

    it('should handle ChromaDB connection failure gracefully', async () => {
      mockChromaClient.getOrCreateCollection.mockRejectedValue(
        new Error('ChromaDB unavailable')
      );

      await ragService.initialize();

      expect(ragService.collection).toBe(null);
    });

    it('should handle complete initialization failure', async () => {
      ChromaClient.mockImplementation(() => {
        throw new Error('Client initialization failed');
      });

      await ragService.initialize();

      expect(ragService.chromaClient).toBe(null);
      expect(ragService.collection).toBe(null);
    });
  });

  describe('generateEmbedding', () => {
    beforeEach(async () => {
      mockEmbedder.mockResolvedValue({ 
        data: new Float32Array([0.1, 0.2, 0.3]) 
      });
      await ragService.initialize();
    });

    it('should generate embedding for text', async () => {
      const text = 'What is diabetes?';
      mockEmbedder.mockResolvedValue({ 
        data: new Float32Array([0.5, 0.6, 0.7]) 
      });

      const embedding = await ragService.generateEmbedding(text);

      expect(embedding).toEqual([0.5, 0.6, 0.7]);
      expect(mockEmbedder).toHaveBeenCalledWith(text, {
        pooling: 'mean',
        normalize: true
      });
    });

    it('should throw error if embedder not initialized', async () => {
      ragService.embedder = null;

      await expect(ragService.generateEmbedding('test')).rejects.toThrow(
        'Embedding model not initialized'
      );
    });

    it('should handle embedding generation error', async () => {
      mockEmbedder.mockRejectedValue(new Error('Embedding failed'));

      await expect(ragService.generateEmbedding('test')).rejects.toThrow(
        'Embedding failed'
      );
    });
  });

  describe('addDocuments', () => {
    beforeEach(async () => {
      mockEmbedder.mockResolvedValue({ 
        data: new Float32Array([0.1, 0.2, 0.3]) 
      });
      await ragService.initialize();
    });

    it('should add documents to vector database', async () => {
      const documents = [
        {
          text: 'Diabetes is a chronic condition affecting blood sugar levels.',
          metadata: { category: 'endocrinology', source: 'medical-db' }
        },
        {
          text: 'Hypertension is high blood pressure.',
          metadata: { category: 'cardiology', source: 'medical-db' }
        }
      ];

      mockEmbedder
        .mockResolvedValueOnce({ data: new Float32Array([0.1, 0.2]) })
        .mockResolvedValueOnce({ data: new Float32Array([0.3, 0.4]) });

      mockCollection.add.mockResolvedValue(true);

      const result = await ragService.addDocuments(documents);

      expect(result).toBe(true);
      expect(mockCollection.add).toHaveBeenCalledWith({
        ids: expect.arrayContaining([
          expect.stringMatching(/^doc_\d+_0$/),
          expect.stringMatching(/^doc_\d+_1$/)
        ]),
        embeddings: [[0.1, 0.2], [0.3, 0.4]],
        documents: [documents[0].text, documents[1].text],
        metadatas: [documents[0].metadata, documents[1].metadata]
      });
    });

    it('should return false if collection not available', async () => {
      ragService.collection = null;

      const documents = [
        { text: 'Test document', metadata: {} }
      ];

      const result = await ragService.addDocuments(documents);

      expect(result).toBe(false);
      expect(mockCollection.add).not.toHaveBeenCalled();
    });

    it('should handle empty metadata', async () => {
      const documents = [
        { text: 'Document without metadata' }
      ];

      mockEmbedder.mockResolvedValue({ data: new Float32Array([0.1, 0.2]) });
      mockCollection.add.mockResolvedValue(true);

      const result = await ragService.addDocuments(documents);

      expect(result).toBe(true);
      expect(mockCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          metadatas: [{}]
        })
      );
    });

    it('should handle add documents error', async () => {
      const documents = [
        { text: 'Test', metadata: {} }
      ];

      mockEmbedder.mockResolvedValue({ data: new Float32Array([0.1]) });
      mockCollection.add.mockRejectedValue(new Error('Add failed'));

      const result = await ragService.addDocuments(documents);

      expect(result).toBe(false);
    });
  });

  describe('searchSimilarDocuments', () => {
    beforeEach(async () => {
      mockEmbedder.mockResolvedValue({ 
        data: new Float32Array([0.1, 0.2, 0.3]) 
      });
      await ragService.initialize();
    });

    it('should search for similar documents', async () => {
      const query = 'What causes diabetes?';
      const mockResults = {
        documents: [[
          'Diabetes is caused by insulin resistance.',
          'Type 2 diabetes is linked to obesity.',
          'Genetics play a role in diabetes.'
        ]],
        metadatas: [[
          { category: 'endocrinology' },
          { category: 'endocrinology' },
          { category: 'endocrinology' }
        ]],
        distances: [[0.1, 0.2, 0.3]]
      };

      mockEmbedder.mockResolvedValue({ data: new Float32Array([0.5, 0.6]) });
      mockCollection.query.mockResolvedValue(mockResults);

      const results = await ragService.searchSimilarDocuments(query, 3);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({
        text: 'Diabetes is caused by insulin resistance.',
        metadata: { category: 'endocrinology' },
        distance: 0.1
      });
      expect(mockCollection.query).toHaveBeenCalledWith({
        queryEmbeddings: [[0.5, 0.6]],
        nResults: 3
      });
    });

    it('should return empty array if collection not available', async () => {
      ragService.collection = null;

      const results = await ragService.searchSimilarDocuments('test query');

      expect(results).toEqual([]);
    });

    it('should handle empty search results', async () => {
      mockEmbedder.mockResolvedValue({ data: new Float32Array([0.5]) });
      mockCollection.query.mockResolvedValue({
        documents: [[]],
        metadatas: [[]],
        distances: [[]]
      });

      const results = await ragService.searchSimilarDocuments('test');

      expect(results).toEqual([]);
    });

    it('should handle search error', async () => {
      mockEmbedder.mockResolvedValue({ data: new Float32Array([0.5]) });
      mockCollection.query.mockRejectedValue(new Error('Search failed'));

      const results = await ragService.searchSimilarDocuments('test');

      expect(results).toEqual([]);
    });

    it('should use default numResults', async () => {
      mockEmbedder.mockResolvedValue({ data: new Float32Array([0.5]) });
      mockCollection.query.mockResolvedValue({
        documents: [['doc1', 'doc2', 'doc3']],
        metadatas: [[{}, {}, {}]],
        distances: [[0.1, 0.2, 0.3]]
      });

      await ragService.searchSimilarDocuments('test');

      expect(mockCollection.query).toHaveBeenCalledWith({
        queryEmbeddings: expect.any(Array),
        nResults: 3
      });
    });
  });

  describe('generateResponseWithRAG', () => {
    beforeEach(async () => {
      mockEmbedder.mockResolvedValue({ 
        data: new Float32Array([0.1, 0.2, 0.3]) 
      });
      await ragService.initialize();
    });

    it('should generate response with RAG context', async () => {
      const query = 'What is diabetes?';
      const context = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi! How can I help?' }
      ];

      const mockDocs = [
        { text: 'Diabetes is a chronic condition.', metadata: {}, distance: 0.1 },
        { text: 'Type 2 diabetes is common.', metadata: {}, distance: 0.2 }
      ];

      mockEmbedder.mockResolvedValue({ data: new Float32Array([0.5]) });
      mockCollection.query.mockResolvedValue({
        documents: [[mockDocs[0].text, mockDocs[1].text]],
        metadatas: [[{}, {}]],
        distances: [[0.1, 0.2]]
      });

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Diabetes is a chronic condition that affects blood sugar levels. This is not a substitute for professional medical advice.'
            }
          }
        ]
      };

      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      const response = await ragService.generateResponseWithRAG(query, context);

      expect(response).toContain('Diabetes is a chronic condition');
      expect(mockGroqInstance.chat.completions.create).toHaveBeenCalledWith({
        model: config.groq.model,
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: 'Hello' }),
          expect.objectContaining({ role: 'assistant', content: 'Hi! How can I help?' }),
          expect.objectContaining({ role: 'user', content: query })
        ]),
        temperature: config.groq.temperature,
        max_tokens: config.groq.maxTokens
      });
    });

    it('should include relevant documents in system prompt', async () => {
      const query = 'Tell me about hypertension';
      
      mockEmbedder.mockResolvedValue({ data: new Float32Array([0.5]) });
      mockCollection.query.mockResolvedValue({
        documents: [['Hypertension is high blood pressure.']],
        metadatas: [[{}]],
        distances: [[0.1]]
      });

      mockGroqInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response about hypertension' } }]
      });

      await ragService.generateResponseWithRAG(query);

      expect(mockGroqInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('Hypertension is high blood pressure.')
            })
          ])
        })
      );
    });

    it('should work without RAG context if no documents found', async () => {
      const query = 'Random query';
      
      mockEmbedder.mockResolvedValue({ data: new Float32Array([0.5]) });
      mockCollection.query.mockResolvedValue({
        documents: [[]],
        metadatas: [[]],
        distances: [[]]
      });

      mockGroqInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'General response' } }]
      });

      const response = await ragService.generateResponseWithRAG(query);

      expect(response).toBe('General response');
    });

    it('should include medical disclaimer in system prompt', async () => {
      mockEmbedder.mockResolvedValue({ data: new Float32Array([0.5]) });
      mockCollection.query.mockResolvedValue({
        documents: [[]],
        metadatas: [[]],
        distances: [[]]
      });

      mockGroqInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }]
      });

      await ragService.generateResponseWithRAG('test');

      expect(mockGroqInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('medical disclaimer')
            })
          ])
        })
      );
    });

    it('should handle generation error', async () => {
      mockEmbedder.mockResolvedValue({ data: new Float32Array([0.5]) });
      mockCollection.query.mockResolvedValue({
        documents: [[]],
        metadatas: [[]],
        distances: [[]]
      });

      mockGroqInstance.chat.completions.create.mockRejectedValue(
        new Error('API Error')
      );

      await expect(ragService.generateResponseWithRAG('test')).rejects.toThrow(
        'API Error'
      );
    });

    it('should handle empty context array', async () => {
      mockEmbedder.mockResolvedValue({ data: new Float32Array([0.5]) });
      mockCollection.query.mockResolvedValue({
        documents: [[]],
        metadatas: [[]],
        distances: [[]]
      });

      mockGroqInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }]
      });

      const response = await ragService.generateResponseWithRAG('test', []);

      expect(response).toBe('Response');
    });
  });

  describe('enrichQuery', () => {
    beforeEach(async () => {
      mockEmbedder.mockResolvedValue({ 
        data: new Float32Array([0.1, 0.2, 0.3]) 
      });
      await ragService.initialize();
    });

    it('should enrich query with relevant documents', async () => {
      const query = 'diabetes symptoms';
      
      mockEmbedder.mockResolvedValue({ data: new Float32Array([0.5]) });
      mockCollection.query.mockResolvedValue({
        documents: [['Common symptoms include thirst', 'Frequent urination']],
        metadatas: [[{}, {}]],
        distances: [[0.1, 0.2]]
      });

      const enrichedQuery = await ragService.enrichQuery(query);

      expect(enrichedQuery).toContain('diabetes symptoms');
      expect(enrichedQuery).toContain('Common symptoms include thirst');
      expect(enrichedQuery).toContain('Frequent urination');
    });

    it('should return original query if no documents found', async () => {
      const query = 'test query';
      
      mockEmbedder.mockResolvedValue({ data: new Float32Array([0.5]) });
      mockCollection.query.mockResolvedValue({
        documents: [[]],
        metadatas: [[]],
        distances: [[]]
      });

      const enrichedQuery = await ragService.enrichQuery(query);

      expect(enrichedQuery).toBe(query);
    });

    it('should limit to 2 documents', async () => {
      mockEmbedder.mockResolvedValue({ data: new Float32Array([0.5]) });
      mockCollection.query.mockResolvedValue({
        documents: [['doc1', 'doc2']],
        metadatas: [[{}, {}]],
        distances: [[0.1, 0.2]]
      });

      await ragService.enrichQuery('test');

      expect(mockCollection.query).toHaveBeenCalledWith({
        queryEmbeddings: expect.any(Array),
        nResults: 2
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle null query in searchSimilarDocuments', async () => {
      mockEmbedder.mockResolvedValue({ data: new Float32Array([0.1]) });
      await ragService.initialize();

      ragService.collection = null;
      const results = await ragService.searchSimilarDocuments(null);

      expect(results).toEqual([]);
    });

    it('should handle concurrent addDocuments calls', async () => {
      mockEmbedder.mockResolvedValue({ data: new Float32Array([0.1]) });
      await ragService.initialize();

      const docs1 = [{ text: 'doc1', metadata: {} }];
      const docs2 = [{ text: 'doc2', metadata: {} }];

      mockCollection.add.mockResolvedValue(true);

      const [result1, result2] = await Promise.all([
        ragService.addDocuments(docs1),
        ragService.addDocuments(docs2)
      ]);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(mockCollection.add).toHaveBeenCalledTimes(2);
    });
  });
});
