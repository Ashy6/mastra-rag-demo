import fs from "fs";
import path from "path";
import { createInterface } from "readline/promises";
import { stdin, stdout } from "process";
import { postJson } from "./http-client.mjs";

const rl = createInterface({ input: stdin, output: stdout });

function resolveDefaultDataFile() {
  const fileUrl = new URL(import.meta.url);
  const dir = path.dirname(fileUrl.pathname);
  return path.resolve(dir, "static-data.json");
}

function normalizeItem(raw, index) {
  if (typeof raw === "string") {
    return { text: raw, metadata: { source: "static", index } };
  }
  if (raw && typeof raw === "object") {
    if (typeof raw.text === "string") {
      return { text: raw.text, metadata: raw.metadata ?? { source: "static", index } };
    }
    return { text: JSON.stringify(raw), metadata: { source: "static", index } };
  }
  return { text: String(raw), metadata: { source: "static", index } };
}

async function waitEnter(message) {
  const v = await rl.question(message);
  return v.trim().toLowerCase();
}

const dataFile = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : resolveDefaultDataFile();
const rawJson = fs.readFileSync(dataFile, "utf-8");
const parsed = JSON.parse(rawJson);

const list = Array.isArray(parsed) ? parsed : [parsed];
const items = list.map((x, idx) => normalizeItem(x, idx));

console.log(`将追加 ${items.length} 条静态数据：${dataFile}`);
const start = await waitEnter("回车开始（输入 q 退出）：");
if (start === "q") process.exit(0);

for (let i = 0; i < items.length; i++) {
  const item = items[i];
  const preview = item.text.length > 120 ? `${item.text.slice(0, 120)}...` : item.text;
  console.log(`\n[${i + 1}/${items.length}] ${preview}`);
  const res = await postJson("/rag/append", item);
  console.log(res);
  const next = await waitEnter("回车继续（输入 q 退出）：");
  if (next === "q") break;
}

rl.close();

