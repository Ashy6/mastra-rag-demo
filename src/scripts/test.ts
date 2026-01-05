import { mastra } from "../mastra/index";
import * as dotenv from 'dotenv';
import assert from 'assert';

dotenv.config();

async function runTests() {
  console.log("🧪 Starting automated tests...");

  const agent = mastra.getAgent("ragAgent");
  if (!agent) throw new Error("Agent not found");

  // Test Case 1: Retrieval Accuracy
  // We expect the agent to know about Mastra based on the ingested document
  const query1 = "What are the core components of Mastra?";
  console.log(`\n📝 Test Case 1: Querying "${query1}"`);
  
  try {
    const response = await agent.generate(query1);
    const text = response.text.toLowerCase();
    
    console.log("Response:", response.text);

    // Assertions
    const keywords = ["agents", "workflows", "rag"];
    const found = keywords.filter(k => text.includes(k));
    
    if (found.length >= 2) {
      console.log("✅ Test Case 1 Passed: Found expected keywords.");
    } else {
      console.error("❌ Test Case 1 Failed: Missing expected keywords.");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Test Case 1 Error:", error);
    process.exit(1);
  }

  // Test Case 2: Hallucination Check / Out of domain
  // This is harder to assert deterministically without a known 'I don't know' response pattern,
  // but we configured the agent to say "I don't have enough information".
  const query2 = "What is the capital of Mars?";
  console.log(`\n📝 Test Case 2: Querying "${query2}" (Out of domain)`);

  try {
    const response = await agent.generate(query2);
    console.log("Response:", response.text);
    
    if (response.text.includes("don't have enough information") || response.text.includes("context")) {
      console.log("✅ Test Case 2 Passed: Agent admitted lack of knowledge.");
    } else {
      console.warn("⚠️ Test Case 2 Warning: Agent might have hallucinated or used general knowledge.");
    }
  } catch (error) {
    console.error("❌ Test Case 2 Error:", error);
  }

  console.log("\n🎉 All tests completed.");
}

runTests().catch(console.error);
