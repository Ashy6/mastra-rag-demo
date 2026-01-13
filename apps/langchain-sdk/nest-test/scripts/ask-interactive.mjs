import { createInterface } from "readline/promises";
import { stdin, stdout } from "process";
import { postJson } from "./http-client.mjs";

const rl = createInterface({ input: stdin, output: stdout });

async function askLine(message) {
  const v = await rl.question(message);
  return v.trim();
}

function toBoolean(value, defaultValue) {
  if (typeof value !== "string") return defaultValue;
  if (value === "true") return true;
  if (value === "false") return false;
  return defaultValue;
}

const defaultUseAgent = toBoolean(process.env.USE_AGENT, false);
const useAgentInput = await askLine(`useAgent（true/false，默认 ${defaultUseAgent}）：`);
const useAgent = toBoolean(useAgentInput || undefined, defaultUseAgent);

console.log("输入问题后回车发起请求；空行直接退出。");

while (true) {
  const question = await askLine("\n问题：");
  if (!question) break;

  const result = await postJson("/rag/ask", {
    question,
    config: {
      similarityThreshold: 0.35,
      semanticTopK: 8,
      keywordTopK: 8,
      hybridTopK: 6,
      useAgent,
      strict: false,
    },
  });

  console.log("\n回答：\n", result?.answer ?? "");
  const docs = Array.isArray(result?.documents) ? result.documents : [];
  if (docs.length) {
    const top = docs[0];
    console.log("\nTop 文档：");
    console.log({
      id: top.id,
      score: top.score,
      semanticScore: top.semanticScore,
      keywordScore: top.keywordScore,
      metadata: top.metadata,
      text: typeof top.text === "string" ? (top.text.length > 200 ? `${top.text.slice(0, 200)}...` : top.text) : top.text,
    });
  }

  await askLine("\n回车继续...");
}

rl.close();

