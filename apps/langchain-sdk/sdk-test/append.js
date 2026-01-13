import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { RagClient } from "rag";

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

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

const argText = process.argv[2];
const appendPath = path.resolve(process.cwd(), "append.txt");
const fallbackText = fs.existsSync(appendPath) ? fs.readFileSync(appendPath, "utf-8") : "";
const text = typeof argText === "string" && argText.trim() ? argText : fallbackText;

await driver.ingestText(text, { source: "append" });
console.log("追加完成");
