import { GoogleGenAI, Type } from "@google/genai";
import { VisualPrompts } from "../types";

// Initialize the client
// NOTE: In a real app, strict error handling for missing API key would be good, 
// but here we assume the environment is set up as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are the "CreatorStudio Visual Engine," a Senior Creative Director specializing in Cross-Platform Brand Identity. 
Your goal is to transform vague user context into precise, platform-aware generation prompts.

# STYLING STRATEGY
- Avoid "Generic AI" aesthetics.
- Prioritize high-end photography, minimalist 3D renders, or professional flat-vector illustrations.
- Ensure "Style-Lock": Use the same lighting, color palette, and textures across all platforms.
- If an image is provided, analyze its style, subject, and color palette, and incorporate these elements into the generated prompts to ensure visual consistency.

# COMPOSITION & SAFE-ZONE RULES (CRITICAL)
1. LinkedIn Cover: The bottom-left area is a "DEAD ZONE". Command the subject to the RIGHT THIRD.
2. Twitter/X Header: Bottom-left overlap. Keep focus centered or to the right.
3. Instagram Square: Subject must be centered.
4. Blog Header: Keep the bottom 20% clear.

# OUTPUT
Return JSON strictly.
`;

const parseBase64 = (base64String: string) => {
  const match = base64String.match(/^data:(.+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
};

// Helper for retry logic with exponential backoff
async function withRetry<T>(operation: () => Promise<T>, retries = 3, initialDelay = 2000): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check for rate limit/quota errors in various formats
      const isQuotaError = 
        error?.status === 429 || 
        error?.code === 429 ||
        error?.message?.includes('429') || 
        error?.message?.includes('quota') ||
        error?.message?.includes('RESOURCE_EXHAUSTED') ||
        error?.status === 'RESOURCE_EXHAUSTED' ||
        (error?.error && error.error.code === 429);

      if (isQuotaError && i < retries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Quota hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If it's not a quota error, or we ran out of retries, throw
      throw error;
    }
  }
  throw lastError;
}

export const generateVisualPrompts = async (userContext: string, imageBase64?: string): Promise<VisualPrompts> => {
  return withRetry(async () => {
    try {
      const parts: any[] = [{ text: userContext }];
      
      if (imageBase64) {
        const parsed = parseBase64(imageBase64);
        if (parsed) {
          parts.push({
            inlineData: {
              mimeType: parsed.mimeType,
              data: parsed.data
            }
          });
        }
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              visualStyleSeed: { type: Type.STRING },
              platforms: {
                type: Type.OBJECT,
                properties: {
                  linkedin: { type: Type.STRING },
                  twitter: { type: Type.STRING },
                  instagram: { type: Type.STRING },
                  blog: { type: Type.STRING },
                },
                required: ["linkedin", "twitter", "instagram", "blog"]
              }
            },
            required: ["visualStyleSeed", "platforms"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("No text returned from Gemini");
      
      return JSON.parse(text) as VisualPrompts;
    } catch (error) {
      console.error("Error generating prompts:", error);
      throw error;
    }
  });
};

export const generateImage = async (prompt: string, aspectRatio: '16:9' | '1:1', referenceImageBase64?: string): Promise<string> => {
  return withRetry(async () => {
    try {
      const parts: any[] = [{ text: prompt }];

      if (referenceImageBase64) {
         const parsed = parseBase64(referenceImageBase64);
         if (parsed) {
           parts.push({
             inlineData: {
               mimeType: parsed.mimeType,
               data: parsed.data
             }
           });
         }
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: parts
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
          }
        }
      });

      const responseParts = response.candidates?.[0]?.content?.parts;
      if (!responseParts) throw new Error("No content parts returned");

      // Iterate to find the image part
      for (const part of responseParts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }

      throw new Error("No image data found in response");
    } catch (error) {
      console.error("Error generating image:", error);
      throw error;
    }
  });
};