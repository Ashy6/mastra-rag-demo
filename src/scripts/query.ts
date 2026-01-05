import { mastra } from "../mastra/index";
import * as dotenv from 'dotenv';

dotenv.config();

async function query() {
  const agent = mastra.getAgent("ragAgent");
  
  if (!agent) {
    throw new Error("Agent not found");
  }

  const question = process.argv[2] || "What is Mastra?";
  
  console.log(`❓ Question: ${question}`);
  console.log("🤖 Agent is thinking...");

  try {
    const result = await agent.generate(question);
    console.log("\n💡 Answer:");
    console.log(result.text);
  } catch (error) {
    console.error("❌ Error querying agent:", error);
  }
}

query().catch(console.error);
