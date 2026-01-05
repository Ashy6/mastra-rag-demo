import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { libSqlVector } from "../mastra/index";
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function ingest() {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('sk-proj-xxxxxxxx')) {
    console.error("❌ Error: Invalid OPENAI_API_KEY in .env file.");
    console.error("👉 Please open .env and paste your valid OpenAI API Key.");
    process.exit(1);
  }

  console.log("🚀 Starting ingestion process...");

  // 1. Create a sample document (or read from file)
  const docPath = path.join(__dirname, "../../data/sample.md");
  
  // Ensure data directory exists
  if (!fs.existsSync(path.dirname(docPath))) {
    fs.mkdirSync(path.dirname(docPath), { recursive: true });
    // Write a dummy file if it doesn't exist
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
  console.log("🧠 Generating embeddings...");
  const { embeddings } = await embedMany({
    model: openai.embedding("text-embedding-3-small"),
    values: chunks.map((c) => c.text),
  });

  // 4. Store in LibSQL
  console.log("💾 Storing in LibSQL...");
  
  // Create index if not exists
  // LibSQLVector API for createIndex might need dimension
  await libSqlVector.createIndex({
    indexName: "embeddings",
    dimension: 1536 // text-embedding-3-small
  });

  // Upsert vectors
  // Note: LibSQLVector upsert API expects { indexName, vectors, metadata }
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
