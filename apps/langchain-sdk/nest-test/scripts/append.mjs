import { postJson } from "./http-client.mjs";

const text = process.argv[2] ?? "这是一个追加的字符串，用于测试 append。";
const result = await postJson("/rag/append", { text });
console.log(result);

