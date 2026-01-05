import { OpenAIEmbeddings } from "@langchain/openai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const VECTOR_STORE_PATH = "vector_store";

async function run() {
  console.log("🚀 开始数据入库流程 (LangChain)...");

  // 1. 读取文档
  const docPath = path.join(__dirname, "../data/sample.md");
  if (!fs.existsSync(docPath)) {
    console.error(`❌ 找不到文件: ${docPath}`);
    process.exit(1);
  }
  const text = fs.readFileSync(docPath, "utf-8");
  console.log("📝 文档读取成功");

  // 2. 切片 (Chunking)
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 50,
  });
  const docs = await splitter.createDocuments([text]);
  console.log(`✂️  文档已切分为 ${docs.length} 个片段`);

  // 3. 初始化 Embedding 模型 (Volcengine)
  // 注意：Volcengine 兼容 OpenAI 接口，但需要指定 modelName
  const embeddings = new OpenAIEmbeddings({
    apiKey: process.env.VOLCENGINE_API_KEY,
    configuration: {
      baseURL: process.env.VOLCENGINE_BASE_URL,
    },
    modelName: process.env.VOLCENGINE_EMBEDDING_MODEL,
  });
  console.log(`🧠 使用 Embedding 模型: ${process.env.VOLCENGINE_EMBEDDING_MODEL}`);

  // 4. 生成向量并存储 (HNSWLib)
  console.log("💾 正在生成向量并存储...");
  const vectorStore = await HNSWLib.fromDocuments(docs, embeddings);

  await vectorStore.save(VECTOR_STORE_PATH);
  console.log(`✅ 向量库已保存至目录: ${VECTOR_STORE_PATH}`);
}

run().catch((error) => {
  console.error("❌ 入库失败:", error);
  process.exit(1);
});
