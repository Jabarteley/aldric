import OpenAI from "openai";
import { getAldricPrompt } from "./promptSettings.service.js";

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY is required to generate AI trading analysis.");
    error.status = 503;
    throw error;
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function generateAiSignal(payload) {
  const client = getClient();
  const systemPrompt = await getAldricPrompt();

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    instructions: systemPrompt,
    input: `Analyze the following realtime market payload and return valid JSON only.\n\n${JSON.stringify(payload)}`,
    text: {
      format: { type: "json_object" }
    },
    store: false
  });

  const content = response.output_text;
  if (!content) throw new Error("OpenAI returned an empty response.");
  return JSON.parse(content);
}
