# Mastra Framework Overview

Mastra is a TypeScript framework for building AI applications. It provides tools for:

- Agents: Autonomous entities that can perform tasks.
- RAG: Retrieval-Augmented Generation for grounding AI in data.
- Workflows: Orchestrating complex sequences of actions.

## Key Components

1. **Mastra Core**: The heart of the framework, managing agents and workflows.
2. **Mastra RAG**: specialized tools for document processing, chunking, and embedding.
3. **Mastra PG**: PostgreSQL integration for vector storage using pgvector.

## How RAG Works in Mastra

RAG involves:

1. **Ingestion**: Loading documents and splitting them into chunks.
2. **Embedding**: Converting chunks into vector representations using an embedding model (e.g., OpenAI).
3. **Storage**: Saving vectors in a database like PostgreSQL with pgvector.
4. **Retrieval**: Querying the database for relevant chunks based on a user's question.
5. **Generation**: Using an LLM to answer the question using the retrieved chunks as context.

Mastra simplifies this pipeline with `MDocument` and vector store integrations.
