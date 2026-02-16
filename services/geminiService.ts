
import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { Planet, GameState } from '../types';

const getApiKey = () => process.env.API_KEY || '';

/**
 * Robust retry wrapper with exponential backoff to handle edge cases and API limits.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 429 || error.status >= 500)) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    // Guidelines: Reset key selection state if entity not found
    if (error.message?.includes("Requested entity was not found.")) {
       // @ts-ignore
       if (window.aistudio && window.aistudio.openSelectKey) {
         window.aistudio.openSelectKey();
       }
    }
    throw error;
  }
}

// Manual base64 decode for Guideline compliance
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Manual PCM decoding for raw audio bytes (no header)
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
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
    const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx);
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start();
  } catch (e) {
    console.warn("Audio playback failed", e);
  }
};

export const generateWarpVideo = async (planetName: string): Promise<string | undefined> => {
  const apiKey = getApiKey();
  if (!apiKey) return undefined;
  
  return withRetry(async () => {
    // Guidelines: Create new instance right before API call
    const ai = new GoogleGenAI({ apiKey });
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `Cinematic first-person cockpit view warping towards ${planetName}. Hyper-realistic sci-fi, stars streaking, planet growing in view.`,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    return downloadLink ? `${downloadLink}&key=${apiKey}` : undefined;
  });
};

export const generatePerformanceReview = async (gameState: GameState): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "Mission Log Terminated.";
  
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Analyze this Void Cadet session. Score: ${gameState.score}, Planets: ${gameState.artifacts.length + 1}.`,
      config: { 
        thinkingConfig: { thinkingBudget: 16000 },
        // Fixed: maxOutputTokens must be larger than thinkingBudget to allow for final text output
        maxOutputTokens: 20000 
      }
    });
    return response.text || "Mission Data Corrupted.";
  });
};

export const fetchGalacticData = async () => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Briefly summarize one recent space discovery in 2024 or 2025.",
      config: { tools: [{ googleSearch: {} }] },
    });

    // Guidelines: Extract and display grounding chunks for search
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks.filter(c => c.web).map(c => ({
      title: c.web?.title || 'Galactic News Source',
      uri: c.web?.uri || '#'
    }));

    return {
      text: response.text?.trim() || "Deep space scanning...",
      sources
    };
  } catch (e) {
    return null;
  }
};

export const generateNextPlanet = async (currentGameState: GameState): Promise<Planet> => {
  const apiKey = getApiKey();
  if (!apiKey) return generateFallbackPlanet();
  const ai = new GoogleGenAI({ apiKey });

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
      }
    },
    required: ["name", "description", "crewMessage", "bossName", "physics", "theme"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a new planet config for a sci-fi pinball game based on astronomical discoveries.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: planetSchema,
        // Fixed: Removed googleSearch because grounded responses should not be parsed as JSON per guidelines
      },
    });

    const data = JSON.parse(response.text || "{}");
    
    // Asset generation
    const [imageUrl, videoUrl, audioBase64] = await Promise.allSettled([
      generatePlanetImage(data.name),
      generateWarpVideo(data.name),
      generateCrewSpeech(data.crewMessage)
    ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : undefined));

    return {
      id: crypto.randomUUID(),
      ...data,
      sources: [],
      imageUrl: imageUrl as string,
      videoUrl: videoUrl as string,
      audioBase64: audioBase64 as string
    };
  } catch (error) {
    return generateFallbackPlanet();
  }
};

export const generatePlanetImage = async (prompt: string): Promise<string | undefined> => {
  const apiKey = getApiKey();
  if (!apiKey) return undefined;
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Cinematic orbital view of exoplanet ${prompt}` }] },
    });
    // Guidelines: Iterate parts to find the image inlineData
    const imgPart = response.candidates[0].content.parts.find(p => p.inlineData);
    return imgPart ? `data:image/png;base64,${imgPart.inlineData.data}` : undefined;
  } catch (e) { return undefined; }
};

export const generateCrewSpeech = async (text: string): Promise<string | undefined> => {
  const apiKey = getApiKey();
  if (!apiKey) return undefined;
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (e) { return undefined; }
};

const generateFallbackPlanet = (): Planet => ({
  id: crypto.randomUUID(),
  name: 'Sector Zero',
  description: "Fallback system for lost cadets.",
  crewMessage: "Stay sharp, pilot.",
  physics: { gravity: -12, friction: 0.1, restitution: 0.6, slope: 8 },
  theme: {
    primaryColor: '#3b82f6', secondaryColor: '#1d4ed8',
    floorColor: '#0c111d', ambientIntensity: 0.5, neonColor: '#60a5fa',
  }
});
