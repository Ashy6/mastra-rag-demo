import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { RagClient } from "rag";

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

function loadDemoDataFromTsFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const transformed = raw.replace(
    /export\s+const\s+demoData\s*=/,
    "const demoData =",
  );
  const loader = new Function(`${transformed}\nreturn demoData;`);
  return loader();
}

const embeddingModel = process.env.VOLCENGINE_EMBEDDING_MODEL ?? "embedding";
const storeFileSafe = embeddingModel.replace(/[^a-zA-Z0-9_-]+/g, "_");
const storePath = path.resolve(process.cwd(), `vector_store.${storeFileSafe}.json`);
const demoPath = path.resolve(process.cwd(), "../demo.ts");

const driver = new RagClient({
  apiKey: process.env.VOLCENGINE_API_KEY ?? "your_api_key",
  baseUrl: process.env.VOLCENGINE_BASE_URL ?? "https://ark.cn-beijing.volces.com/api/v3",
  chatModel: process.env.VOLCENGINE_CHAT_MODEL ?? "gpt-4",
  embeddingModel: process.env.VOLCENGINE_EMBEDDING_MODEL ?? "gpt-4abding",
  vectorStorePath: storePath,
});

const demoData = loadDemoDataFromTsFile(demoPath);
if (!Array.isArray(demoData)) {
  throw new Error("demo.ts 中的 demoData 不是数组");
}

for (let i = 0; i < demoData.length; i++) {
  const item = demoData[i];
  const text = JSON.stringify(item);
  const topic = item?.topic;
  await driver.ingestText(text, {
    source: "demo.ts",
    index: i,
    topic: typeof topic === "string" ? topic : undefined,
  });
}

console.log("初始化完成");
