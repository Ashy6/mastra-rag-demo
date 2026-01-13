import { postJson } from "./http-client.mjs";

const result = await postJson("/rag/init", {});
console.log(result);

