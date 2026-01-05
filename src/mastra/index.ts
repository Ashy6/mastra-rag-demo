import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { LibSQLVector } from "@mastra/libsql";
import { createVectorQueryTool } from "@mastra/rag";
import { openai } from "@ai-sdk/openai";
import * as dotenv from 'dotenv';

dotenv.config();

// 1. Initialize Vector Store (LibSQL)
// Using a local file-based database for easy setup
export const libSqlVector = new LibSQLVector({
  connectionUrl: process.env.DATABASE_URL || "file:./mastra.db",
});

// 2. Create RAG Tool
// The tool name "vectorQueryTool" will be used by the agent to retrieve information.
const vectorQueryTool = createVectorQueryTool({
  vectorStoreName: "libSqlVector",
  indexName: "embeddings",
  model: openai.embedding("text-embedding-3-small"),
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
  model: openai("gpt-4o-mini"),
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
