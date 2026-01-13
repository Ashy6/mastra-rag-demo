import dotenv from "dotenv";
import path from "path";
import { RagClient } from "rag";

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const question = process.argv[2] ?? "我想找个工具，它可以对物体进行测量，有什么推荐吗？";
const embeddingModel = process.env.VOLCENGINE_EMBEDDING_MODEL ?? "embedding";
const storeFileSafe = embeddingModel.replace(/[^a-zA-Z0-9_-]+/g, "_");
const storePath = path.resolve(process.cwd(), `vector_store.${storeFileSafe}.json`);

const driver = new RagClient({
  apiKey: process.env.VOLCENGINE_API_KEY ?? "your_api_key",
  baseUrl: process.env.VOLCENGINE_BASE_URL ?? "https://ark.cn-beijing.volces.com/api/v3",
  chatModel: process.env.VOLCENGINE_CHAT_MODEL ?? "gpt-4",
  embeddingModel: process.env.VOLCENGINE_EMBEDDING_MODEL ?? "gpt-4abding",
  vectorStorePath: storePath,
});

const result = await driver.query(question, {
  similarityThreshold: 0.35,
  semanticTopK: 8,
  keywordTopK: 8,
  hybridTopK: 6,
  answerMode: "llm",
  strict: false,
});

console.log("相似文档：", result.documents);
if (result.answer) console.log("\n回答：\n", result.answer);
