import { postJson } from "./http-client.mjs";

const question = process.argv[2] ?? "香蕉的特点是什么？";
const useAgentRaw = process.argv[3] ?? process.env.USE_AGENT;
const useAgent = typeof useAgentRaw === "string" ? useAgentRaw !== "false" : true;
const result = await postJson("/rag/ask", {
  question,
  config: {
    similarityThreshold: 0.35,
    semanticTopK: 8,
    keywordTopK: 8,
    hybridTopK: 6,
    useAgent,
  },
});
console.log(result);
