
import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { Planet, GameState } from '../types';

const getApiKey = () => process.env.API_KEY || '';

// Decoding helper for TTS as per guidelines
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const playCrewAudio = async (base64Audio: string) => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start();
  } catch (e) {
    console.warn("Audio playback failed", e);
  }
};

export const generateCrewSpeech = async (text: string): Promise<string | undefined> => {
  const apiKey = getApiKey();
  if (!apiKey) return undefined;
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say this with the authority of a starship tactician: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Strong military-style voice
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (e) {
    return undefined;
  }
};

export const generatePlanetImage = async (prompt: string): Promise<string | undefined> => {
  const apiKey = getApiKey();
  if (!apiKey) return undefined;
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A sci-fi digital art painting of the planet ${prompt}. cinematic lighting, high detail, alien architecture, orbital view.` }],
      },
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    return undefined;
  }
};

// fetchGalacticNews fix: Added missing export used by App.tsx
export const fetchGalacticNews = async (): Promise<{ text: string; url: string | null; title: string } | undefined> => {
  const apiKey = getApiKey();
  if (!apiKey) return undefined;
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Summarize one recent (2024 or 2025) space discovery in a short sentence.",
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const firstWeb = groundingChunks?.find(c => c.web)?.web;

    return {
      text: response.text?.trim() || "Deep space scanning for news...",
      url: firstWeb?.uri || null,
      title: firstWeb?.title || "Galactic Update"
    };
  } catch (e) {
    console.error("News fetch failed", e);
    return undefined;
  }
};

export const generateNextPlanet = async (currentGameState: GameState): Promise<Planet> => {
  const apiKey = getApiKey();
  if (!apiKey) return generateFallbackPlanet();

  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `
    You are the Game Master for "VOID CADET".
    Generate a JSON object for the next planet.
    Use Google Search to find real astronomical objects for inspiration.
    Physics: Gravity (-20 heavy to -5 floaty), Normal is -12.
    Artifacts: Choose one from 'score_multiplier', 'extra_life', 'warp_charge_boost'.
  `;

  const planetSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      description: { type: Type.STRING },
      crewMessage: { type: Type.STRING },
      bossName: { type: Type.STRING },
      physics: {
        type: Type.OBJECT,
        properties: {
          gravity: { type: Type.NUMBER },
          friction: { type: Type.NUMBER },
          restitution: { type: Type.NUMBER },
          slope: { type: Type.NUMBER },
        },
        required: ["gravity", "friction", "restitution", "slope"]
      },
      theme: {
        type: Type.OBJECT,
        properties: {
          primaryColor: { type: Type.STRING },
          secondaryColor: { type: Type.STRING },
          floorColor: { type: Type.STRING },
          ambientIntensity: { type: Type.NUMBER },
          neonColor: { type: Type.STRING },
        },
        required: ["primaryColor", "secondaryColor", "floorColor", "ambientIntensity", "neonColor"]
      },
      artifact: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            icon: { type: Type.STRING },
            effectType: { type: Type.STRING, enum: ['score_multiplier', 'extra_life', 'warp_charge_boost'] }
        },
        required: ["name", "description", "icon", "effectType"]
      }
    },
    required: ["name", "description", "crewMessage", "bossName", "physics", "theme", "artifact"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Search for a real exoplanet discovered in 2024/2025. Previous: ${currentGameState.currentPlanet.name}. Generate next planet.`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: planetSchema,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 4000 } // Use thinking for creative lore & physics balancing
      },
    });

    const data = JSON.parse(response.text || "{}");
    
    // Extract search grounding sources as required by guidelines
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks?.map(c => c.web?.uri).filter((uri): uri is string => !!uri) || [];

    // Concurrently generate multimodal assets
    const [imageUrl, audioBase64] = await Promise.all([
      generatePlanetImage(data.name),
      generateCrewSpeech(data.crewMessage)
    ]);
    
    return {
      id: crypto.randomUUID(),
      ...data,
      sources,
      imageUrl,
      audioBase64
    };
  } catch (error) {
    console.error("Gemini failed", error);
    return generateFallbackPlanet();
  }
};

const generateFallbackPlanet = (): Planet => {
  return {
    id: crypto.randomUUID(),
    name: 'Sector Zero',
    description: "A dark matter anomaly where time stands still.",
    crewMessage: "Stay alert. The void is watching.",
    bossName: "Anomaly-9",
    physics: { gravity: -12, friction: 0.1, restitution: 0.6, slope: 8 },
    theme: {
      primaryColor: '#6366f1',
      secondaryColor: '#4338ca',
      floorColor: '#0c0a09',
      ambientIntensity: 0.5,
      neonColor: '#818cf8',
    },
    artifact: {
        name: "Backup Drive",
        description: "Standard issue recovery module.",
        icon: "💾",
        effectType: "warp_charge_boost"
    }
  };
};
