import { Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "crypto";

// 这是一个“pgvector 版 RAG Service”的示例：
// - ingestText：文本切片 -> embedding -> 写入 Postgres 表（embedding 存 vector 列）
// - query：对问题做 embedding -> 用 pgvector 距离算子排序检索 TopK ->（可选）LLM 生成回答
//
// 注意：为了不强依赖某个 PG 客户端库，这里用 PgQueryExecutor 抽象 DB 执行器。
// 你可以用 pg / prisma / typeorm / kysely 等任意实现，把 query(sql, params) 注入进来即可。
export type PgQueryExecutor = {
  query<T = any>(
    sql: string,
    params?: any[]
  ): Promise<{
    rows: T[];
  }>;
};

export type PgvectorRagConfig = {
  // OpenAI Compatible 的认证与模型配置（火山方舟同样兼容）
  apiKey: string;
  baseUrl: string;
  chatModel: string;
  embeddingModel: string;
  // 存储向量的表名（默认 rag_documents）
  tableName?: string;
  // 切片配置：用于把长文本切成多个 chunk，提高召回与写入稳定性
  chunkSize?: number;
  chunkOverlap?: number;
};

export type PgvectorDocumentRow = {
  id: string;
  text: string;
  metadata: Record<string, any>;
  contentHash: string;
  createdAt: string;
};

export type PgvectorRetrievedDocument = {
  id: string;
  text: string;
  metadata: Record<string, any>;
  similarity: number;
};

export type PgvectorQueryOptions = {
  // 返回 TopK 条相似文档
  topK?: number;
  // strict=true 时用 similarityThreshold 过滤（仅保留足够相似的结果）
  similarityThreshold?: number;
  strict?: boolean;
  // answerMode 控制是否调用大模型：
  // - llm：检索 + LLM 生成 answer
  // - extractive：不调用 LLM，基于 top 文档做抽取式回答
  // - none：只返回 documents
  answerMode?: "llm" | "extractive" | "none";
  systemPrompt?: string;
  temperature?: number;
};

export type PgvectorQueryResult = {
  answer?: string;
  documents: PgvectorRetrievedDocument[];
  usedConfig: Required<
    Pick<
      PgvectorQueryOptions,
      | "topK"
      | "similarityThreshold"
      | "strict"
      | "answerMode"
      | "systemPrompt"
      | "temperature"
    >
  >;
};

function sha256(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

// 朴素切片：按字符数切分并做 overlap（真实生产可以替换为更“语义化”的切片策略）
function chunkText(text: string, chunkSize: number, chunkOverlap: number) {
  const normalized = (text ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const size = Math.max(1, chunkSize);
  const overlap = Math.max(0, Math.min(chunkOverlap, size - 1));
  const step = size - overlap;

  const chunks: string[] = [];
  for (let start = 0; start < normalized.length; start += step) {
    const chunk = normalized.slice(start, start + size).trim();
    if (chunk) chunks.push(chunk);
  }
  return chunks;
}

function buildExtractiveAnswer(documents: PgvectorRetrievedDocument[]) {
  if (!documents.length) return "我不知道";
  const text = documents[0].text ?? "";
  try {
    const parsed = JSON.parse(text);
    const topic = typeof parsed?.topic === "string" ? parsed.topic : undefined;
    const description =
      typeof parsed?.description === "string" ? parsed.description : undefined;
    if (topic && description) return `推荐：${topic}\n\n理由：${description}`;
    if (topic) return `推荐：${topic}`;
  } catch {}
  return text.length > 800 ? `${text.slice(0, 800)}...` : text;
}

@Injectable()
export class RagPgvectorService {
  private readonly tableName: string;
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  constructor(
    // db 需要提供 query(sql, params)，返回 { rows }
    private readonly db: PgQueryExecutor,
    private readonly config: PgvectorRagConfig
  ) {
    this.tableName = config.tableName ?? "rag_documents";
    this.chunkSize = config.chunkSize ?? 512;
    this.chunkOverlap = config.chunkOverlap ?? 50;
  }

  // pgvector 必需的建表 SQL 示例（包含 extension、表结构、索引）
  // - embedding 列类型是 vector（实际需要指定维度时可改成 vector(1536) 等）
  // - ivfflat 索引适合近似检索；生产建议根据数据量与召回要求调整 lists
  getCreateTableSql() {
    return `
      create extension if not exists vector;

      create table if not exists ${this.tableName} (
        id uuid primary key,
        text text not null,
        metadata jsonb not null default '{}'::jsonb,
        embedding vector,
        content_hash text not null unique,
        created_at timestamptz not null default now()
      );

      create index if not exists ${this.tableName}_embedding_idx
        on ${this.tableName} using ivfflat (embedding vector_cosine_ops) with (lists = 100);

      create index if not exists ${this.tableName}_metadata_gin_idx
        on ${this.tableName} using gin (metadata);
      `.trim();
  }

  // 直接通过 OpenAI Compatible embeddings 接口获取向量
  // 如果你已经在别处封装了 embeddings client，可以把这块替换为你的实现
  private async embed(text: string): Promise<number[]> {
    const res = await fetch(
      `${this.config.baseUrl.replace(/\/+$/, "")}/embeddings`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.embeddingModel,
          input: text,
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Embeddings request failed: ${res.status} ${errText}`);
    }

    const json = (await res.json()) as {
      data?: Array<{ embedding?: number[] }>;
    };
    const embedding = json?.data?.[0]?.embedding;
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error("Embeddings response missing embedding vector");
    }
    return embedding;
  }

  // 直接通过 OpenAI Compatible chat/completions 获取回答
  private async chat(params: {
    system: string;
    user: string;
    temperature: number;
  }): Promise<string> {
    const res = await fetch(
      `${this.config.baseUrl.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.chatModel,
          temperature: params.temperature,
          messages: [
            { role: "system", content: params.system },
            { role: "user", content: params.user },
          ],
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Chat request failed: ${res.status} ${errText}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("Chat response missing message content");
    }
    return content;
  }

  // pgvector 的 vector literal 形如：[0.1,0.2,0.3]
  // 这里走参数绑定（$1::vector），避免手写 SQL 拼接导致注入风险
  private toVectorLiteral(vector: number[]) {
    return `[${vector.map((v) => Number(v)).join(",")}]`;
  }

  // 写入流程：
  // 1) 切片（chunkText）
  // 2) 对每个 chunk 做 embedding
  // 3) insert into pgvector 表
  // 4) 用 content_hash 做去重（on conflict do nothing）
  async ingestText(
    text: string,
    metadata: Record<string, any> = {}
  ): Promise<{ added: number; skipped: number }> {
    const chunks = chunkText(text, this.chunkSize, this.chunkOverlap);
    if (!chunks.length) return { added: 0, skipped: 0 };

    let added = 0;
    let skipped = 0;

    for (const chunk of chunks) {
      const contentHash = sha256(`${chunk}\n${JSON.stringify(metadata ?? {})}`);
      const embedding = await this.embed(chunk);
      const vector = this.toVectorLiteral(embedding);

      const sql = `
        insert into ${this.tableName} (id, text, metadata, embedding, content_hash)
        values ($1::uuid, $2::text, $3::jsonb, $4::vector, $5::text)
        on conflict (content_hash) do nothing
        returning id;
        `.trim();

      const res = await this.db.query<{ id: string }>(sql, [
        randomUUID(),
        chunk,
        metadata ?? {},
        vector,
        contentHash,
      ]);

      if (res.rows.length) added++;
      else skipped++;
    }

    return { added, skipped };
  }

  // 检索流程：
  // 1) 对 question 做 embedding
  // 2) 用 pgvector 距离算子排序取 TopK：
  //    - <=> 是 cosine distance（配合 vector_cosine_ops）
  // 3) 可选 strict 过滤相似度
  // 4) answerMode 决定是否生成 answer
  async query(
    question: string,
    options: PgvectorQueryOptions = {}
  ): Promise<PgvectorQueryResult> {
    const usedConfig = {
      topK: options.topK ?? 6,
      similarityThreshold: options.similarityThreshold ?? 0.35,
      strict: options.strict ?? false,
      answerMode: options.answerMode ?? "llm",
      temperature: options.temperature ?? 0.7,
      systemPrompt:
        options.systemPrompt ??
        "你是一个严谨的 RAG 助手。你必须仅基于给定上下文回答；如果上下文不足，请直接回答“我不知道”。",
    } as const;

    const q = (question ?? "").trim();
    if (!q) return { documents: [], usedConfig };

    const qEmbedding = await this.embed(q);
    const qVector = this.toVectorLiteral(qEmbedding);

    // 这里用 order by embedding <=> query_vector asc（越小越相似）
    // 同时计算 similarity = 1 - distance，方便做阈值过滤与展示
    const sql = `
      select
        id::text as id,
        text,
        metadata,
        (1 - (embedding <=> $1::vector))::float as similarity
      from ${this.tableName}
      where embedding is not null
      order by embedding <=> $1::vector asc
      limit $2::int;
      `.trim();

    const res = await this.db.query<{
      id: string;
      text: string;
      metadata: Record<string, any>;
      similarity: number;
    }>(sql, [qVector, usedConfig.topK]);

    const documents = res.rows
      .map((r) => ({
        id: r.id,
        text: r.text,
        metadata: r.metadata ?? {},
        similarity: Number(r.similarity ?? 0),
      }))
      .filter((d) => {
        if (!usedConfig.strict) return true;
        return d.similarity >= usedConfig.similarityThreshold;
      });

    if (usedConfig.answerMode === "none") return { documents, usedConfig };
    if (usedConfig.answerMode === "extractive") {
      return {
        answer: buildExtractiveAnswer(documents),
        documents,
        usedConfig,
      };
    }

    const context = documents
      .map((d, idx) => {
        const meta =
          d.metadata && Object.keys(d.metadata).length
            ? `\nmetadata: ${JSON.stringify(d.metadata)}`
            : "";
        return `# Document ${idx + 1}\n${d.text}${meta}`;
      })
      .join("\n\n");

    const answer = await this.chat({
      system: usedConfig.systemPrompt,
      temperature: usedConfig.temperature,
      user: `Context:\n${context}\n\nQuestion:\n${q}\n\nAnswer:`,
    });

    return { answer, documents, usedConfig };
  }
}
