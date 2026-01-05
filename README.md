# Mastra RAG Demo Project (Volcengine Edition)

这是一个基于 [Mastra](https://mastra.ai) 框架构建的 RAG (检索增强生成) 示例项目。
本项目已配置为使用 **火山引擎 (Volcengine)** 的方舟大模型 (Doubao) 作为 LLM 和 Embedding 提供商。

## 📋 项目简介

本项目展示了如何使用 Mastra 框架快速搭建一个能够基于私有文档回答问题的 AI Agent。
为了方便演示和运行，本项目默认使用 **LibSQL (SQLite)** 作为本地向量数据库，无需安装 Docker 或 Postgres 即可运行。

## 🛠 技术栈

- **框架**: Mastra (TypeScript)
- **LLM**: Volcengine Doubao Pro (via OpenAI Compatible API)
- **Embedding**: Volcengine Doubao Embedding (via OpenAI Compatible API)
- **Vector Store**: LibSQL (本地文件模式)

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入火山引擎的配置：
1.  **VOLCENGINE_API_KEY**: 你的火山引擎 API Key。
2.  **VOLCENGINE_CHAT_MODEL**: 你的对话模型接入点 ID (Endpoint ID)，例如 `ep-20250106...`。
3.  **VOLCENGINE_EMBEDDING_MODEL**: 你的向量化模型接入点 ID (Endpoint ID)，例如 `ep-20250106...`。

```env
VOLCENGINE_API_KEY=your-api-key
VOLCENGINE_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
VOLCENGINE_CHAT_MODEL=ep-2025xxxxxx-xxxxx
VOLCENGINE_EMBEDDING_MODEL=ep-2025xxxxxx-xxxxx
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

## 📂 目录结构

```
.
├── data/               # 存放源文档
├── src/
│   ├── mastra/
│   │   ├── agents/     # Agent 定义
│   │   └── index.ts    # Mastra 实例与组件配置 (已配置 Volcengine)
│   ├── scripts/
│   │   ├── ingest.ts   # 数据入库脚本
│   │   ├── query.ts    # 查询脚本
│   │   └── test.ts     # 测试脚本
├── PRD.md              # 产品需求文档
└── package.json
```

## ⚠️ 注意事项

- **Endpoint ID**: 火山引擎的模型名称是特定的 Endpoint ID，请务必在火山方舟控制台创建接入点后获取。
- **Embedding 维度**: 默认设置为 1536 维。如果你的 Doubao Embedding 模型使用其他维度（如 1024），请修改 `src/scripts/ingest.ts` 中的 `dimension` 参数。
