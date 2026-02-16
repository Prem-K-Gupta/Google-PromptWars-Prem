import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { Planet, GameState } from '../types';

const getApiKey = () => process.env.API_KEY || '';

// Decoding helper for TTS
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

export const fetchNearbySpaceHubs = async (lat: number, lng: number) => {
  const apiKey = getApiKey();
  if (!apiKey) return [];
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite-latest",
      contents: "List 3 real-world space centers, planetariums, or observatories near these coordinates.",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: lat, longitude: lng }
          }
        }
      },
    });
    return response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(c => ({
      title: c.maps?.title || "Space Observation Point",
      uri: c.maps?.uri || "#"
    })) || [];
  } catch (e) {
    console.error("Maps grounding failed", e);
    return [];
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
            prebuiltVoiceConfig: { voiceName: 'Kore' },
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
        parts: [{ text: `A cinematic sci-fi digital art painting of the planet ${prompt}. Ultra-detailed, space aesthetic.` }],
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

export const fetchGalacticNews = async () => {
  const apiKey = getApiKey();
  if (!apiKey) return undefined;
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Briefly summarize one recent space discovery in 2024 or 2025.",
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    const web = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.find(c => c.web)?.web;
    return {
      text: response.text?.trim() || "Deep space scanning...",
      url: web?.uri || null,
      title: web?.title || "Galactic Feed"
    };
  } catch (e) {
    return undefined;
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
      contents: `Previous sector: ${currentGameState.currentPlanet.name}. Scout a real exoplanet discovered recently for our next jump.`,
      config: {
        systemInstruction: "You are the Game Master. Generate a JSON planet config.",
        responseMimeType: "application/json",
        responseSchema: planetSchema,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 4000 }
      },
    });

    const data = JSON.parse(response.text || "{}");
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(c => c.web?.uri).filter((uri): uri is string => !!uri) || [];

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
    return generateFallbackPlanet();
  }
};

const generateFallbackPlanet = (): Planet => ({
  id: crypto.randomUUID(),
  name: 'Sector Zero',
  description: "An unmapped dark matter pocket.",
  crewMessage: "Systems critical. Stay on course.",
  physics: { gravity: -12, friction: 0.1, restitution: 0.6, slope: 8 },
  theme: {
    primaryColor: '#6366f1', secondaryColor: '#4338ca',
    floorColor: '#0c0a09', ambientIntensity: 0.5, neonColor: '#818cf8',
  },
  artifact: {
      name: "Standard Cell", description: "Minimal power boost.",
      icon: "🔋", effectType: "warp_charge_boost"
  }
});