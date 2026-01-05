# Mastra RAG Demo Project

这是一个基于 [Mastra](https://mastra.ai) 框架构建的 RAG (检索增强生成) 示例项目。

## 📋 项目简介

本项目展示了如何使用 Mastra 框架快速搭建一个能够基于私有文档回答问题的 AI Agent。
为了方便演示和运行，本项目默认使用 **LibSQL (SQLite)** 作为本地向量数据库，无需安装 Docker 或 Postgres 即可运行。

## 🛠 技术栈

- **框架**: Mastra (TypeScript)
- **LLM**: OpenAI GPT-4o-mini
- **Embedding**: OpenAI text-embedding-3-small
- **Vector Store**: LibSQL (本地文件模式)

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填入你的 OpenAI API Key：

```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
OPENAI_API_KEY=sk-proj-your-api-key-here
DATABASE_URL=file:./mastra.db
```

### 3. 数据入库 (Ingest)

运行以下命令，系统会自动创建一个关于 Mastra 的示例文档 (`data/sample.md`)，并将其切片向量化存入本地数据库。

```bash
npm run ingest
```

### 4. 提问 (Query)

向 Agent 提问：

```bash
npm run query "What is Mastra?"
```

或者自定义问题：

```bash
npm run query "How does RAG work in Mastra?"
```

### 5. 运行测试

```bash
ts-node src/scripts/test.ts
```

## 📂 目录结构

```
.
├── data/               # 存放源文档
├── src/
│   ├── mastra/
│   │   ├── agents/     # Agent 定义
│   │   └── index.ts    # Mastra 实例与组件配置
│   ├── scripts/
│   │   ├── ingest.ts   # 数据入库脚本
│   │   ├── query.ts    # 查询脚本
│   │   └── test.ts     # 测试脚本
├── PRD.md              # 产品需求文档
└── package.json
```

## ⚠️ 注意事项

- **API Key**: 必须拥有有效的 OpenAI API Key 才能运行。
- **数据库**: 本演示使用本地文件数据库。生产环境建议切换为 PgVector (PostgreSQL)。
