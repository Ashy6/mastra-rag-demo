import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { formatDocumentsAsString } from "langchain/util/document";
import * as dotenv from "dotenv";

dotenv.config();

const VECTOR_STORE_PATH = "vector_store";

async function run() {
  const question = process.argv[2] || "LangChain RAG 是如何工作的？";
  console.log(`❓ 问题: ${question}`);

  // 1. 初始化 Embedding 模型 (用于查询向量化)
  const embeddings = new OpenAIEmbeddings({
    apiKey: process.env.VOLCENGINE_API_KEY,
    configuration: {
      baseURL: process.env.VOLCENGINE_BASE_URL,
    },
    modelName: process.env.VOLCENGINE_EMBEDDING_MODEL,
  });

  // 2. 加载向量数据库
  console.log("📂 加载向量知识库...");
  let vectorStore;
  try {
    vectorStore = await HNSWLib.load(VECTOR_STORE_PATH, embeddings);
  } catch (error) {
    console.error("❌ 无法加载向量库。请先运行 'npm run ingest'。");
    process.exit(1);
  }

  // 3. 初始化 Chat 模型 (Volcengine)
  const model = new ChatOpenAI({
    apiKey: process.env.VOLCENGINE_API_KEY,
    configuration: {
      baseURL: process.env.VOLCENGINE_BASE_URL,
    },
    modelName: process.env.VOLCENGINE_CHAT_MODEL,
    temperature: 0.7,
  });

  // 4. 构建 RAG Chain
  const retriever = vectorStore.asRetriever(2); // 获取最相关的 2 个切片

  const prompt = PromptTemplate.fromTemplate(`
    你是一个乐于助人的助手。请根据以下上下文回答用户的问题。
    如果上下文没有包含足够的信息，请直接说“我不知道”。
    
    上下文:
    {context}
    
    问题:
    {question}
    
    回答:
  `);

  const chain = RunnableSequence.from([
    {
      context: async (input: string) => {
        const relevantDocs = await retriever.invoke(input);
        console.log(`🔍 检索到 ${relevantDocs.length} 条相关信息`);
        return formatDocumentsAsString(relevantDocs);
      },
      question: (input: string) => input,
    },
    prompt,
    model,
    new StringOutputParser(),
  ]);

  // 5. 执行查询
  console.log("🤖 思考中...");
  const stream = await chain.stream(question);

  console.log("\n💡 回答:");
  for await (const chunk of stream) {
    process.stdout.write(chunk);
  }
  console.log("\n");
}

run().catch((error) => {
  console.error("❌ 查询失败:", error);
  process.exit(1);
});
