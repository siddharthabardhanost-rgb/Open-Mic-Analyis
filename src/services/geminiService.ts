import { GoogleGenAI, Type } from "@google/genai";

export async function analyzeTranscriptsAndChats(vttTexts: string[], chatTexts: string[]) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `
You are an intelligent assistant analyzing Zoom Open Mic session files.
I am providing you with the transcripts (VTT) and the chat logs (TXT) from the sessions.

Your tasks:
1. Extract ALL the Questions and Answers discussed during the sessions. Look closely at both the chat logs and transcripts.
2. Extract ALL the URLs/Links shared in the chat logs.
3. Provide a brief summary of the sessions.

CRITICAL: You must completely omit the following links from your output (do not include them in the links list or the summary):
- https://wa.me/+918910125705
- https://forms.gle/EuJBdyBHdNhRpbCL9
- https://link.be10x.in/brainfish-24/7-Support-Bot
- https://forms.gle/gQ42fB3pRniV5GPv7

Return the result in JSON format corresponding to this schema:
{
  "summary": "Brief summary of the session",
  "qna": [
    { "question": "The question asked", "answer": "The answer given (or 'Not answered' if no answer was provided)" }
  ],
  "links": ["https://...", "https://..."]
}

Transcripts:
${vttTexts.map((text, i) => `--- VTT File ${i + 1} ---\n${text}`).join('\n\n')}

Chats:
${chatTexts.map((text, i) => `--- Chat File ${i + 1} ---\n${text}`).join('\n\n')}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "General summary of the Q&A sessions"
            },
            qna: {
              type: Type.ARRAY,
              description: "List of Questions and Answers",
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING }
                },
                required: ["question", "answer"]
              }
            },
            links: {
              type: Type.ARRAY,
              description: "List of links/URLs extracted",
              items: {
                type: Type.STRING
              }
            }
          },
          required: ["summary", "qna", "links"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("The AI returned an empty response. Please try again.");

    try {
      return JSON.parse(text) as {
        summary: string;
        qna: { question: string; answer: string }[];
        links: string[];
      };
    } catch (parseError) {
      throw new Error("Failed to parse the response from the AI as JSON. The model may have returned an invalid format. Please try running the analysis again.");
    }
  } catch (error: any) {
    // If we've thrown a custom error above, let it bubble up
    if (error.message && (error.message.includes("parse") || error.message.includes("empty response"))) {
      throw error;
    }
    
    // Improved error messages based on common Gemini API failures
    if (error.status === 429) {
      throw new Error("Too many requests to the AI service (Rate Limit). Please wait a moment and try again.");
    } else if (error.status === 400) {
      throw new Error("The AI service rejected the request (Bad Request). Please check if your files are too large or contain unsupported content.");
    } else if (error.status === 403) {
      throw new Error("Access forbidden. Please ensure your Gemini API Key is valid and has correct permissions.");
    } else if (error.status === 500 || error.status === 503) {
      throw new Error("The AI service is currently unavailable or experiencing issues. Please try again later.");
    } else {
      throw new Error(error.message || "An unexpected error occurred while communicating with the AI service. Please try again.");
    }
  }
}
