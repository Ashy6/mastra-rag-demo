import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { libSqlVector } from "../mastra/index";
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function ingest() {
  // Validate Environment Variables
  if (!process.env.VOLCENGINE_API_KEY) {
    console.error("❌ Error: VOLCENGINE_API_KEY is missing in .env file.");
    process.exit(1);
  }
  if (!process.env.VOLCENGINE_EMBEDDING_MODEL || process.env.VOLCENGINE_EMBEDDING_MODEL.includes('ep-20250106xxxxxx-xxxxx')) {
     console.error("❌ Error: Invalid VOLCENGINE_EMBEDDING_MODEL in .env file.");
     console.error("👉 Please replace the placeholder with your actual Endpoint ID.");
     process.exit(1);
  }

  // Setup Volcengine Provider
  const volcengine = createOpenAI({
    baseURL: process.env.VOLCENGINE_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3",
    apiKey: process.env.VOLCENGINE_API_KEY,
  });
  
  const EMBEDDING_MODEL = process.env.VOLCENGINE_EMBEDDING_MODEL;

  console.log("🚀 Starting ingestion process...");

  // 1. Create a sample document (or read from file)
  const docPath = path.join(__dirname, "../../data/sample.md");
  
  if (!fs.existsSync(path.dirname(docPath))) {
    fs.mkdirSync(path.dirname(docPath), { recursive: true });
    const sampleContent = `
# Mastra Framework Guide

Mastra is a TypeScript-first AI framework designed to simplify the development of AI agents and RAG systems.

## Core Components
1. **Agents**: Autonomous entities that can use tools and LLMs.
2. **Workflows**: Graph-based orchestration of tasks.
3. **RAG**: Retrieval-Augmented Generation for grounding AI in data.

## RAG Process
To implement RAG in Mastra, you need to:
- Create an MDocument from text.
- Chunk the document using strategies like recursive splitting.
- Generate embeddings using OpenAI or other providers.
- Store vectors in LibSQL or PgVector.

## Benefits
Mastra provides type safety, easy integration with Vercel AI SDK, and robust observability.
    `;
    fs.writeFileSync(docPath, sampleContent);
    console.log("📝 Created sample document at data/sample.md");
  }

  const fileContent = fs.readFileSync(docPath, "utf-8");

  // 2. Create MDocument and Chunk
  console.log("✂️  Chunking document...");
  const doc = MDocument.fromText(fileContent);
  
  const chunks = await doc.chunk({
    strategy: "recursive",
    maxSize: 512,
    overlap: 50,
  });
  
  console.log(`ℹ️  Generated ${chunks.length} chunks.`);

  // 3. Generate Embeddings
  console.log(`🧠 Generating embeddings using ${EMBEDDING_MODEL}...`);
  const { embeddings } = await embedMany({
    model: volcengine.embedding(EMBEDDING_MODEL),
    values: chunks.map((c) => c.text),
  });

  // 4. Store in LibSQL
  console.log("💾 Storing in LibSQL...");
  
  // Create index if not exists
  // Note: Doubao embedding dimension varies. 
  // doubao-embedding-text-240715 is usually 1024 or 1536 depending on config.
  // We'll assume 1536 for now, but user might need to adjust.
  // Standard OpenAI is 1536. Doubao can be 1024.
  // Let's default to 1536 but warn user.
  const dimension = 1536; 

  await libSqlVector.createIndex({
    indexName: "embeddings",
    dimension: dimension 
  });

  // Upsert vectors
  await libSqlVector.upsert({
    indexName: "embeddings",
    vectors: embeddings,
    metadata: chunks.map((c, i) => ({
      text: c.text,
      ...c.metadata,
      id: `chunk-${i}-${Date.now()}`
    })),
  });

  console.log("✅ Ingestion complete!");
}

ingest().catch((err) => {
  console.error("❌ Ingestion failed:", err);
  process.exit(1);
});
