import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Planet, GameState } from '../types';

const getApiKey = () => {
  return process.env.API_KEY || '';
};

export const generateNextPlanet = async (currentGameState: GameState): Promise<Planet> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("No API Key found. Returning default random variation.");
    return generateFallbackPlanet();
  }

  const ai = new GoogleGenAI({ apiKey });

  // Analyze performance
  const isHighPerformance = currentGameState.score > 10000;
  
  const context = isHighPerformance 
    ? "Player is dominating. Generate a hostile, high-gravity world with a powerful artifact."
    : "Player is struggling. Generate a wondrous, low-gravity world with a helpful artifact.";

  const systemInstruction = `
    You are the Game Master for "VOID CADET".
    Generate the next planet in this infinite procedural pinball journey.
    
    ${context}
    
    Physics:
    - Normal Gravity is -12. Go lower (-5) for space/floaty, higher (-20) for heavy.
    - Normal Slope is 8.
    
    Artifacts:
    - Create a cool sci-fi upgrade item found on this planet.
    - Effect types: 'score_multiplier', 'extra_life', 'warp_charge_boost'.
  `;

  const prompt = `
    Previous Planet: ${currentGameState.currentPlanet.name}.
    Current Score: ${currentGameState.score}.
    Lives: ${currentGameState.lives}.
    
    Generate next planet JSON.
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
            icon: { type: Type.STRING, description: "A single emoji representing the artifact" },
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
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: planetSchema,
      },
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);
    
    return {
      id: crypto.randomUUID(),
      ...data
    };

  } catch (error) {
    console.error("Gemini generation failed, using fallback", error);
    return generateFallbackPlanet();
  }
};

const generateFallbackPlanet = (): Planet => {
  const themes = [
    { name: 'Obsidian Sanctum', color: '#7f1d1d', sec: '#ef4444', floor: '#2a0a0a', grav: -15, neon: '#fca5a5' },
    { name: 'Azure Expanse', color: '#0ea5e9', sec: '#0284c7', floor: '#082f49', grav: -8, neon: '#7dd3fc' },
    { name: 'Xenon Prime', color: '#d946ef', sec: '#a21caf', floor: '#2e1065', grav: -12, neon: '#f0abfc' },
  ];
  const t = themes[Math.floor(Math.random() * themes.length)];
  
  return {
    id: crypto.randomUUID(),
    name: t.name,
    description: "Navigational data corrupted. Entering unmapped sector.",
    crewMessage: "Systems rebooting. Adapt to local gravity immediately.",
    bossName: "Signal Ghost",
    physics: {
      gravity: t.grav,
      friction: 0.1,
      restitution: 0.6,
      slope: 8,
    },
    theme: {
      primaryColor: t.color,
      secondaryColor: t.sec,
      floorColor: t.floor,
      ambientIntensity: 0.6,
      neonColor: t.neon,
    },
    artifact: {
        name: "Emergency Battery",
        description: "A standard issue power cell.",
        icon: "🔋",
        effectType: "warp_charge_boost"
    }
  };
};
