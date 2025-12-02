
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ProjectPlan, StyleOption, CategoryOption, SurpriseResult, ChatMessage } from '../types';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Utility for rate limiting management
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry wrapper for API calls that might hit rate limits
async function retryOperation<T>(operation: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const isRateLimit = error.status === 429 || 
                        error.code === 429 || 
                        (error.message && (error.message.includes('429') || error.message.includes('quota')));
    
    if (retries > 0 && isRateLimit) {
      console.warn(`Rate limit hit (429). Retrying in ${baseDelay}ms...`);
      await wait(baseDelay);
      return retryOperation(operation, retries - 1, baseDelay * 2);
    }
    throw error;
  }
}

const PLAN_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    styleSummary: {
      type: Type.STRING,
      description: "A 1-2 sentence evocative summary of the design vibe/style (e.g., 'A warm, grounded aesthetic featuring raw oak textures and matte black hardware to create a serene focal point.')."
    },
    steps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Detailed step-by-step execution instructions. Must strictly follow the VIBE format with **TOOL:** and **MATERIAL:** callouts and [Image of: ...] placeholders."
    },
    costEstimate: {
      type: Type.STRING,
      description: "Estimated cost range in USD (e.g., '$50 - $100')."
    },
    timeEstimate: {
      type: Type.STRING,
      description: "Estimated time to complete (e.g., '3-4 hours')."
    },
    materials: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Summary list of materials (for shopping list purposes)."
    },
    tools: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Summary list of tools required."
    },
    safety: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Important safety warnings."
    },
    itemDescription: {
      type: Type.STRING,
      description: "A concise visual description of the furniture or room found in the image, capturing shape, material, and key features."
    }
  },
  required: ["styleSummary", "steps", "costEstimate", "timeEstimate", "materials", "tools", "safety", "itemDescription"]
};

const SURPRISE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    itemDescription: {
      type: Type.STRING,
      description: "A concise visual description of the furniture or room found in the image."
    },
    styles: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of 5 distinct, creative, and aesthetically pleasing styles suitable for this item.",
      minItems: 5,
      maxItems: 5
    }
  },
  required: ["itemDescription", "styles"]
};

/**
 * Generates the structured project plan using the multimodal model.
 */
export const generateProjectPlan = async (
  imageBase64: string,
  style: string,
  category: CategoryOption
): Promise<ProjectPlan> => {
  return retryOperation(async () => {
    try {
      const prompt = `
        You are Homey, a DIY furniture flipping and home renovation expert.
        Analyze this image. The user wants to improve this item/space.
        
        SELECTED CATEGORY: ${category}
        DESIRED STYLE: ${style}

        **Objective:** Generate a complete, step-by-step guide for this DIY project. The guide must prioritize **maximum scannability** and **ease of use** by presenting tools and materials *only* when they are first required, using highly detailed specifications and clear visual cues.

        **VIBE Code Requirements:**

        **I. Step-by-Step Instructions:**
        * Output the steps as a clean JSON array of strings.
        * **CRITICAL: Do NOT include numbers (e.g., "1.", "Step 1") or list bullets (e.g., "-") at the start of the text.** The UI handles the numbering.
        * Keep steps concise.
        * Include all necessary measurements and safety notes.

        **II. Integrated Materials & Tools Callouts:**
        * **Before the first use** of any tool or material in a step, introduce it using a clear, **bolded** callout.
        * The callout **must** include the item's name and its specific **Brand Name**, **Model/Product Name**, or **Key Specification/Supplier Link** (e.g., "**TOOL:** Miter Saw (e.g., DeWalt DWS780 12-inch)," or "**MATERIAL:** 2-inch exterior-grade deck screws (e.g., GRK R4 Multi-Purpose Screws)").
        * Prioritize providing Brand/Model names that are easily searchable on Google (e.g., 'Behr Premium Plus Ultra Pure White' instead of just 'White Paint').

        **III. Visual Cue Integration:**
        * For **every 1-2 steps**, or whenever a new technique or component is introduced, insert a clear, descriptive placeholder for an image/diagram.
        * The placeholder **must** use the exact format: [Image of: brief, precise description of the visual]

        **Instructions:**
        1. Identify the item or room in the image.
        2. Provide a "itemDescription" summarizing visual features.
        3. Generate a "styleSummary" that succinctly captures the mood, colors, and textures of the proposed design.
        4. Generate the "steps" array following the VIBE format exactly.
        5. Populate "materials" and "tools" arrays as a summary checklist.
        
        Output must be pure JSON adhering to the schema.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: PLAN_SCHEMA,
          systemInstruction: "You are a helpful, warm, and safety-conscious DIY expert. You strictly adhere to the VIBE formatting rules.",
          temperature: 0.4,
        }
      });

      if (!response.text) {
        throw new Error("No text response received from Gemini.");
      }

      return JSON.parse(response.text) as ProjectPlan;

    } catch (error) {
      console.error("Error generating project plan:", error);
      throw error;
    }
  });
};

/**
 * Analyzes an uploaded inspiration image to extract style, vibe, and colors.
 */
export const analyzeStyleFromImage = async (inspirationBase64: string): Promise<string> => {
  return retryOperation(async () => {
    try {
      const prompt = `
        You are an expert interior designer. 
        Analyze this inspiration image provided by the user.
        
        Describe the specific "Style Name" and "Vibe" of this image.
        Include the color palette, material textures, and key aesthetic features.
        
        Output a single concise string that describes this style (e.g., "Moody Industrial with brass accents and dark teal walls" or "Airy Coastal with bleached oak and linen").
        Keep it under 20 words.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: inspirationBase64 } },
            { text: prompt }
          ]
        },
        config: {
          temperature: 0.4,
        }
      });

      if (!response.text) {
        throw new Error("Could not analyze inspiration image.");
      }

      return response.text.trim();
    } catch (error) {
      console.error("Error analyzing inspiration image:", error);
      throw error;
    }
  });
};

/**
 * Analyzes image and suggests 5 styles for Surprise Me mode.
 */
export const generateSurpriseAnalysis = async (
  imageBase64: string,
  category: CategoryOption
): Promise<{ itemDescription: string, styles: string[] }> => {
  return retryOperation(async () => {
    try {
      const prompt = `
        You are Homey, a DIY design assistant.
        The user selected the "Surprise Me" style.
        Category: ${category}
        
        Analyze the image provided.
        1. Extract a description of the furniture or room ("itemDescription").
        2. Automatically generate 5 different style suggestions that would look amazing for this specific item.
        
        Output JSON with:
        - itemDescription
        - styles: array of 5 distinct style names.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: SURPRISE_SCHEMA,
          temperature: 0.7, // Higher temperature for creativity
        }
      });

      if (!response.text) {
        throw new Error("No text response received.");
      }

      return JSON.parse(response.text) as { itemDescription: string, styles: string[] };

    } catch (error) {
      console.error("Error generating surprise analysis:", error);
      throw error;
    }
  });
};

/**
 * Generates a single inspiration image based on category and description.
 * Wrapper that includes Retry logic for rate limits.
 */
const generateSingleImage = async (
  style: string, 
  category: CategoryOption, 
  description: string,
  viewContext: string,
  referenceUrl?: string
): Promise<string | null> => {
  return retryOperation(async () => {
    try {
      let prompt = "";
      
      // Construct Reference Context
      const refContext = referenceUrl ? `\nReference this real-world product style: ${referenceUrl}\n` : "";

      if (category === CategoryOption.FurnitureFlipping) {
        prompt = `
          You are Homey, a DIY and furniture flipping design assistant.

          Below is a description of the user’s furniture extracted from their photo:
          "${description}"
          ${refContext}

          Using this description, generate a realistic "after" inspiration image.

          Your task:
          - Keep the furniture’s core shape, proportions, and structure the same.
          - Apply the style: ${style}.
          - The result should look like a redesigned version of the same item, not a different piece of furniture.
          - Maintain coherence with the uploaded item’s size, silhouette, leg shape, drawer count, hardware position, etc.
          - Enhance finishes, materials, colors, and visual details to match the chosen style.
          - Use warm, cozy lighting and a clean, simple background (no full room environments).
          - Avoid generating unrelated furniture or scenes.
          - The generated image must clearly resemble the original item, just transformed.
          - View: ${viewContext}
          - Composition: Compact, centered, clear detail suitable for gallery display (400x400px equivalent).

          Constraints:
          - The furniture must remain recognizable as the same item.
          - The redesign should be realistic, DIY-friendly, and achievable by the user.
        `;
      } else {
        // Room Refresh Prompt
        prompt = `
          High quality, photorealistic interior design photography.
          A beautiful "after" shot of a room refresh project.
          
          Room Description: "${description}"
          Target Style: ${style}
          ${refContext}
          
          The image should show the room transformed with ${style} decor, colors, and furniture arrangement.
          Warm, cozy, clean, earthy tones.
          Professional architectural digest style photography.
          View: ${viewContext}
          Composition: Compact, centered, clear detail suitable for gallery display (400x400px equivalent).
        `;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1" // Enforces square aspect ratio for compact gallery layouts
          }
        }
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            return part.inlineData.data;
          }
        }
      }
      return null;
    } catch (error) {
      console.error(`Error generating image for ${style}:`, error);
      // If it's a rate limit error inside here, re-throw it so retryOperation catches it
      // Otherwise return null for non-transient errors (like safety block)
      if (error instanceof Error && (error as any).status === 429) throw error;
      return null;
    }
  }); // End retry
};

/**
 * Generates a specific visual for a step in the instruction plan.
 * Retries on rate limit.
 */
export const generateStepImage = async (
  description: string,
  style: string
): Promise<string | null> => {
  // We use a simpler try/catch here or just return null if it fails to avoid blocking the UI too much
  // But we can add a single retry for 429s.
  try {
    return await retryOperation(async () => {
      const prompt = `
        Create a helpful, clear, and photorealistic DIY tutorial image.
        Subject: ${description}
        Context: DIY workshop or home renovation setting.
        Style: Clean, bright, instructional photography. Matches the vibe of "${style}".
        
        Focus: Close-up and clear visibility of the action or tool described.
        Background: Simple, uncluttered, neutral (white or light wood).
        Aspect Ratio: Square (1:1).
        
        CRITICAL: Do NOT include any text, numbers, arrows, watermarks, or overlay graphics in the image. 
        The image must be a pure, clean photograph or realistic 3D render illustrating the step.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: { aspectRatio: "1:1" }
        }
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (parts && parts.length > 0) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            return part.inlineData.data;
          }
        }
      }
      return null;
    }, 1, 3000); // 1 retry only for step images
  } catch (error) {
    console.warn(`Could not generate step image for: ${description}`, error);
    return null;
  }
}

/**
 * Searches for real-world references to ground the generation.
 */
const getRealWorldReferences = async (
  style: string, 
  category: CategoryOption, 
  description: string,
  count: number = 3
): Promise<string[]> => {
  return retryOperation(async () => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [{ 
            text: `Find ${count} high-quality, real-world ${category === CategoryOption.FurnitureFlipping ? 'furniture product' : 'interior design'} images that match this description: "${description}" and are in the style of "${style}". Return ONLY a JSON array of image URLs.` 
          }]
        },
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const urls: string[] = [];
      
      if (chunks) {
        chunks.forEach(chunk => {
          if (chunk.web?.uri) {
            urls.push(chunk.web.uri);
          }
        });
      }
      
      while(urls.length < count) {
        urls.push("");
      }
      
      return urls.slice(0, count);
    } catch (e) {
      return Array(count).fill("");
    }
  });
}

/**
 * Generates inspiration images using the plan description.
 * Executes SEQUENTIALLY to avoid Rate Limits.
 */
export const generateInspirationImages = async (
  style: string, 
  category: CategoryOption,
  description: string,
  customViews?: string[]
): Promise<string[]> => {
  // 1. Get references
  const references = await getRealWorldReferences(style, category, description, 3);
  
  const views = customViews || ["straight on view", "slightly angled view", "detail focused view"];
  const results: string[] = [];
  
  // 2. Generate images SEQUENTIALLY with delays
  for (let i = 0; i < views.length; i++) {
    const view = views[i];
    const ref = references[i % references.length];
    
    // Add delay between requests to be kind to the rate limiter (2s)
    if (i > 0) await wait(2000);
    
    try {
      const img = await generateSingleImage(style, category, description, view, ref);
      if (img) results.push(img);
    } catch (e) {
      console.error(`Skipping image ${i} due to error`, e);
      // Continue to next image even if one fails
    }
  }
  
  return results;
};

/**
 * Generates 1 image for each of the 5 surprise styles.
 * Executes SEQUENTIALLY to avoid Rate Limits.
 */
export const generateSurpriseImages = async (
  styles: string[],
  category: CategoryOption,
  description: string
): Promise<SurpriseResult['suggestions']> => {
  
  const results: SurpriseResult['suggestions'] = [];

  for (let i = 0; i < styles.length; i++) {
    const style = styles[i];
    
    // Add significant delay between requests (3s)
    if (i > 0) await wait(3000);
    
    try {
      // Hybrid: Get 1 reference for this style (lightweight text call)
      const refs = await getRealWorldReferences(style, category, description, 1);
      
      // Generate image
      const image = await generateSingleImage(style, category, description, "straight on view, photorealistic", refs[0]);
      
      if (image) {
        results.push({ style, image });
      }
    } catch (e) {
      console.error(`Skipping surprise style ${style}`, e);
    }
  }

  return results;
};

/**
 * Handles chat interactions regarding a specific project plan.
 */
export const sendProjectChat = async (
  plan: ProjectPlan,
  history: ChatMessage[],
  newMessage: string
): Promise<string> => {
  return retryOperation(async () => {
    try {
      const historyText = history.map(msg => `${msg.role === 'user' ? 'User' : 'Homey'}: ${msg.text}`).join('\n');
      
      const prompt = `
        You are Homey, the user's friendly DIY assistant.
        The user is currently looking at a specific project plan you generated.
        
        CONTEXT - CURRENT PROJECT PLAN:
        ${JSON.stringify(plan, null, 2)}
        
        CHAT HISTORY:
        ${historyText}
        
        USER'S NEW QUESTION:
        ${newMessage}
        
        INSTRUCTIONS:
        - Answer the user's question specifically based on the Context provided above.
        - Be helpful, encouraging, and concise.
        - If they ask for clarification on a step, explain it in more simple terms.
        - If they ask about materials, refer to the specific brands/items listed in the plan.
        - Keep the tone warm, earthy, and professional.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
        config: {
          temperature: 0.5,
        }
      });

      return response.text || "I'm having a little trouble connecting right now. Could you ask that again?";
    } catch (error) {
      console.error("Chat Error:", error);
      throw error;
    }
  });
};
