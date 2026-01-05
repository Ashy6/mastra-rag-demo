import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { LibSQLVector } from "@mastra/libsql";
import { createVectorQueryTool } from "@mastra/rag";
import { createOpenAI } from "@ai-sdk/openai";
import * as dotenv from 'dotenv';

dotenv.config();

// 0. Setup Volcengine Provider
const volcengine = createOpenAI({
  baseURL: process.env.VOLCENGINE_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3",
  apiKey: process.env.VOLCENGINE_API_KEY,
});

// Model Endpoint IDs
const CHAT_MODEL = process.env.VOLCENGINE_CHAT_MODEL || "ep-20250106xxxxxx-xxxxx";
const EMBEDDING_MODEL = process.env.VOLCENGINE_EMBEDDING_MODEL || "ep-20250106xxxxxx-xxxxx";

// 1. Initialize Vector Store (LibSQL)
export const libSqlVector = new LibSQLVector({
  connectionUrl: process.env.DATABASE_URL || "file:./mastra.db",
});

// 2. Create RAG Tool
const vectorQueryTool = createVectorQueryTool({
  vectorStoreName: "libSqlVector",
  indexName: "embeddings",
  model: volcengine.embedding(EMBEDDING_MODEL),
});

// 3. Define the Agent
export const ragAgent = new Agent({
  name: "KnowledgeAgent",
  instructions: `
    You are a helpful assistant that answers questions based on the provided context.
    You have access to a "vectorQueryTool" that can search the knowledge base.
    ALWAYS use the tool to find relevant information before answering.
    If the information is not in the context, say "I don't have enough information in my knowledge base to answer this."
  `,
  model: volcengine(CHAT_MODEL),
  tools: {
    vectorQueryTool,
  },
});

// 4. Create Mastra Instance
export const mastra = new Mastra({
  agents: {
    ragAgent,
  },
  vectors: {
    libSqlVector,
  },
});
