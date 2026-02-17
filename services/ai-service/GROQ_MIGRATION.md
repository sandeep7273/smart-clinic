# Migration from OpenAI to Groq

This document outlines the migration from OpenAI to Groq LLM for the AI service.

## Changes Made

### 1. Package Updates
**File**: `package.json`
- ✅ Removed: `openai` package
- ✅ Removed: `@langchain/openai` package
- ✅ Added: `groq-sdk` (v0.3.2) - Official Groq SDK
- ✅ Added: `@xenova/transformers` (v2.17.0) - For local embeddings (replaces OpenAI embeddings)

### 2. Configuration Updates
**File**: `src/config/index.js`
- ✅ Replaced `openai` configuration with `groq` configuration
- ✅ New config structure:
  ```javascript
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    maxTokens: parseInt(process.env.GROQ_MAX_TOKENS) || 1000,
    temperature: parseFloat(process.env.GROQ_TEMPERATURE) || 0.7
  }
  ```

**File**: `.env`
- ✅ Added `GROQ_API_KEY` - Your Groq API key
- ✅ Added `GROQ_MODEL` - Model to use (default: llama-3.3-70b-versatile)
- ✅ Added `GROQ_MAX_TOKENS` - Maximum tokens per response
- ✅ Added `GROQ_TEMPERATURE` - Response randomness (0-1)
- ✅ Removed OpenAI-related environment variables

### 3. Intent Detection Service Updates
**File**: `src/services/intentDetectionService.js`
- ✅ Replaced `OpenAI` client with `Groq` client
- ✅ Updated chat completion calls to use Groq API
- ✅ Maintained same functionality and response format

### 4. RAG Service Updates
**File**: `src/services/ragService.js`
- ✅ Replaced `OpenAI` client with `Groq` client for chat completions
- ✅ Implemented local embeddings using `@xenova/transformers`
- ✅ Using model: `Xenova/all-MiniLM-L6-v2` for embeddings
- ✅ No external API calls needed for embeddings (faster and free!)

## Available Groq Models

You can change the model in `.env` by setting `GROQ_MODEL` to any of these:

### Recommended Models

1. **llama-3.3-70b-versatile** (Default)
   - Best overall performance
   - Great for complex medical queries
   - Optimal speed/quality balance

2. **llama-3.1-70b-versatile**
   - Previous generation
   - Slightly faster
   - Good for general queries

3. **llama-3.1-8b-instant**
   - Ultra-fast responses
   - Good for simple queries
   - Lower quality than 70b models

4. **mixtral-8x7b-32768**
   - Large context window (32k tokens)
   - Good for long conversations
   - Excellent reasoning

5. **gemma2-9b-it**
   - Google's Gemma model
   - Fast and efficient
   - Good for instruction following

### Full Model List
- `llama-3.3-70b-versatile` ✨ **Recommended**
- `llama-3.3-70b-specdec`
- `llama-3.1-70b-versatile`
- `llama-3.1-8b-instant`
- `llama3-70b-8192`
- `llama3-8b-8192`
- `mixtral-8x7b-32768`
- `gemma2-9b-it`
- `gemma-7b-it`

## Benefits of Groq

1. **Speed**: Groq offers extremely fast inference (up to 10x faster than OpenAI)
2. **Cost**: More cost-effective than OpenAI GPT-4
3. **Free Tier**: Generous free tier for development
4. **Privacy**: Data not used for training
5. **Open Models**: Using open-source LLaMA models

## Benefits of Local Embeddings

1. **No API Costs**: Embeddings generated locally
2. **Privacy**: No data sent to external services
3. **Speed**: No network latency
4. **Reliability**: No dependency on external API availability

## Configuration

### Get Your Groq API Key
1. Visit: https://console.groq.com
2. Sign up / Log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key to `.env` file:
   ```
   GROQ_API_KEY=your_key_here
   ```

### Change Model
Edit `.env` file:
```env
GROQ_MODEL=llama-3.3-70b-versatile  # Change to any model from the list above
```

### Adjust Temperature
```env
GROQ_TEMPERATURE=0.7  # 0 = deterministic, 1 = creative
```

### Adjust Max Tokens
```env
GROQ_MAX_TOKENS=1000  # Maximum response length
```

## Testing

After migration, test the AI assistant with these queries:

1. **Health Query**: "I have chest pain and shortness of breath"
2. **Doctor Search**: "Find me a cardiologist"
3. **View Appointments**: "Show my appointments"
4. **Book Appointment**: "I want to book an appointment with a dermatologist"

## Troubleshooting

### Error: "Groq API key not found"
- Ensure `GROQ_API_KEY` is set in `.env`
- Restart the AI service after updating `.env`

### Error: "Model not found"
- Check that `GROQ_MODEL` is one of the supported models
- Try using the default: `llama-3.3-70b-versatile`

### Slow embedding generation
- First time loading the embedding model takes longer (~10-30 seconds)
- Subsequent embeddings are much faster
- Model is cached after first load

### RAG not working
- ChromaDB must be running on port 8000
- Embedding model must be loaded successfully
- Check logs for initialization errors

## Performance Comparison

| Metric | OpenAI GPT-4 | Groq Llama-3.3-70b |
|--------|-------------|-------------------|
| Speed | ~2-5s | ~0.3-1s ⚡ |
| Cost | $$$$ | $ |
| Quality | Excellent | Very Good |
| Context | 128k | 8k |
| Rate Limit | 10k RPM | 30 req/min (free tier) |

## Migration Complete! ✅

Your AI service is now powered by:
- **Groq** for fast LLM inference
- **Xenova Transformers** for local embeddings
- **Same great features** with better performance!

---

**Last Updated**: February 17, 2026
