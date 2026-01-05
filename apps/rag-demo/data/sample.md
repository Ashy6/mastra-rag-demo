# Mastra 框架指南

Mastra 是一个 TypeScript 优先的 AI 框架，旨在简化 AI Agent 和 RAG 系统的开发。

## 核心组件
1. **Agents (智能体)**: 能够使用工具和 LLM 的自主实体。
2. **Workflows (工作流)**: 基于图的任务编排。
3. **RAG (检索增强生成)**: 用于将 AI 基于数据落地的技术。

## RAG 流程
要在 Mastra 中实现 RAG，你需要:
- 从文本创建 MDocument。
- 使用递归分割等策略对文档进行切片 (Chunking)。
- 使用 OpenAI 或其他提供商生成 Embedding (向量)。
- 将向量存储在 LibSQL 或 PgVector 中。

## 优势
Mastra 提供类型安全、与 Vercel AI SDK 的轻松集成以及强大的可观测性。
