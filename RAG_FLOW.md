# Mastra RAG 项目流程文档

本文档详细说明了本项目 (Mastra RAG Demo) 的工作流程、数据流向以及核心组件的交互方式。

## 1. 核心流程图 (Flowchart)

```mermaid
graph TD
    subgraph "数据入库阶段 (Ingestion Phase)"
        A[原始文档 (data/sample.md)] -->|读取| B(MDocument)
        B -->|切片 (Chunking)| C[文本切片 (Chunks)]
        C -->|API 请求| D{火山引擎 Embedding 模型}
        D -->|返回向量| E[向量数据 (Vectors)]
        E -->|存储| F[(本地数据库 mastra.db)]
        
        style A fill:#e1f5fe
        style F fill:#fff9c4
    end

    subgraph "检索问答阶段 (Query Phase)"
        G[用户提问 (CLI)] -->|API 请求| H{火山引擎 Embedding 模型}
        H -->|返回问题向量| I[查询向量]
        I -->|向量相似度搜索| F
        F -->|返回相关切片| J[上下文 (Context)]
        
        J -->|组合| K[提示词 (System Prompt + Context + Question)]
        K -->|API 请求| L{火山引擎 Chat 模型}
        L -->|流式生成| M[最终回答]
        
        style G fill:#e1f5fe
        style M fill:#dcedc8
    end
```

## 2. 详细步骤说明

整个 RAG 系统分为两个主要阶段：**数据准备（入库）** 和 **问答（检索与生成）**。

### 第一阶段：数据入库 (Ingestion)

*对应脚本*: `src/scripts/ingest.ts`

1. **数据源 (Source)**:
    - 项目读取本地文件 `data/sample.md`。
    - 内容是关于 Mastra 框架的中文介绍文档。

2. **文档处理 (Processing)**:
    - 使用 Mastra 的 `MDocument` 类加载文本。
    - **切片 (Chunking)**: 将长文档按逻辑（递归策略）切分为较小的片段（Max size: 512字符）。
    - *目的*: 确保每个片段都包含完整的语义，且不超过 Embedding 模型的处理窗口。

3. **向量化 (Embedding)**:
    - 调用火山引擎 (Doubao-Embedding) 接口。
    - 将每个文本切片转化为高维向量（如 1536 维或 1024 维数组）。
    - *目的*: 将语义转化为计算机可计算的数学形式。

4. **存储 (Storage)**:
    - 使用 `LibSQLVector` 组件。
    - 将 **向量** + **原始文本** + **元数据** 存储到本地 SQLite 数据库文件 `mastra.db` 中。

---

### 第二阶段：检索与生成 (Retrieval & Generation)

*对应脚本*: `src/scripts/query.ts` & `src/mastra/index.ts`

1. **用户提问**:
    - 用户通过命令行输入问题，例如："Mastra 是什么？"。

2. **问题向量化**:
    - Agent 使用相同的 Embedding 模型将用户的自然语言问题转化为向量。

3. **语义检索 (Retrieval)**:
    - 在 `mastra.db` 中搜索与“问题向量”空间距离最近（最相似）的 N 个文档切片。
    - 这就是所谓的“检索增强”——找到了与问题最相关的知识。

4. **生成回答 (Generation)**:
    - Agent 构建 Prompt（提示词）：
        > "你是一个助手。请基于以下上下文回答问题：[检索到的相关内容] \n\n 用户问题：[Mastra 是什么？]"
    - 将 Prompt 发送给火山引擎 Chat 模型 (Doubao-Pro)。
    - 模型生成基于事实的回答，并通过流式传输 (Streaming) 返回给用户。

## 3. 关键文件与组件对应

| 文件路径 | 作用 | 核心代码引用 |
| :--- | :--- | :--- |
| `src/mastra/index.ts` | **系统配置** | 定义 `LibSQLVector` (数据库连接) 和 `Agent` (智能体逻辑)。 |
| `src/scripts/ingest.ts` | **写入数据** | 执行文档读取、切片、Embedding 和入库操作。 |
| `src/scripts/query.ts` | **读取/交互** | 调用 Agent 接口，执行问答流程。 |
| `mastra.db` | **存储介质** | 实际存储向量数据的 SQLite 文件。 |
| `data/sample.md` | **原始知识** | 被摄入系统的源文档。 |
