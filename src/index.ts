import { mastra } from "./mastra";

async function main() {
  const query = process.argv[2] || "How does RAG work in Mastra?";
  console.log(`\n🤖 User Query: ${query}\n`);

  const agent = mastra.getAgent("ragAgent");
  
  if (!agent) {
    console.error("Agent not found!");
    return;
  }

  try {
    console.log("Thinking...");
    const response = await agent.generate(query);
    console.log("\n💡 Agent Response:");
    console.log(response.text);
  } catch (error) {
    console.error("Error generating response:", error);
  }
}

main().catch(console.error);
