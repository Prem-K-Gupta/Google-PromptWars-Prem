import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Planet, GameState } from '../types';

// Helper to get API Key safely
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

  const systemInstruction = `
    You are the Game Master for "VOID CADET", a procedural sci-fi pinball game.
    Your job is to generate the next planet (level) the player warps to based on their recent performance.
    
    Variables to tweak:
    - Gravity: Standard is -9.8. Lower (e.g., -5) is floaty/space. Higher (e.g., -20) is heavy/industrial.
    - Friction: Standard is 0.1. Lower (0.01) is ice. Higher (0.5) is mud/jungle.
    - Restitution (Bounciness): Standard is 0.5. Higher (0.9) is energetic/rubber. Lower (0.1) is dead/rock.
    - Slope: Standard is 5. Higher means ball rolls down faster.
    
    If the player has a high score, make it harder (higher gravity, unpredictable).
    If low score, make it easier or trippier.
    Create a cool sci-fi name and theme.
  `;

  const prompt = `
    Current Score: ${currentGameState.score}.
    Current Planet: ${currentGameState.currentPlanet.name}.
    Lives Left: ${currentGameState.lives}.
    
    Generate a new Planet unique from the last one.
  `;

  const planetSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Name of the planet" },
      description: { type: Type.STRING, description: "Short lore description" },
      crewMessage: { type: Type.STRING, description: "A message from the ship's AI tactician about this world" },
      bossName: { type: Type.STRING, description: "Name of the boss entity controlling this sector" },
      physics: {
        type: Type.OBJECT,
        properties: {
          gravity: { type: Type.NUMBER, description: "Y-axis gravity force (negative)" },
          friction: { type: Type.NUMBER, description: "Surface friction 0.0 to 1.0" },
          restitution: { type: Type.NUMBER, description: "Bounciness 0.0 to 1.5" },
          slope: { type: Type.NUMBER, description: "Table slope gravity factor" },
        },
        required: ["gravity", "friction", "restitution", "slope"]
      },
      theme: {
        type: Type.OBJECT,
        properties: {
          primaryColor: { type: Type.STRING, description: "Hex color for main structures" },
          secondaryColor: { type: Type.STRING, description: "Hex color for accents" },
          floorColor: { type: Type.STRING, description: "Hex color for the table floor" },
          ambientIntensity: { type: Type.NUMBER, description: "Light intensity 0.1 to 1.0" },
          neonColor: { type: Type.STRING, description: "Emission hex color" },
        },
        required: ["primaryColor", "secondaryColor", "floorColor", "ambientIntensity", "neonColor"]
      }
    },
    required: ["name", "description", "crewMessage", "bossName", "physics", "theme"]
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
    { name: 'Magma Core', color: '#ef4444', sec: '#7f1d1d', floor: '#450a0a', grav: -9.8 },
    { name: 'Cryo Station', color: '#06b6d4', sec: '#155e75', floor: '#083344', grav: -6 },
    { name: 'Neon City', color: '#d946ef', sec: '#86198f', floor: '#2e1065', grav: -12 },
  ];
  const t = themes[Math.floor(Math.random() * themes.length)];
  
  return {
    id: crypto.randomUUID(),
    name: t.name,
    description: "Communications offline. Approaching unknown sector.",
    crewMessage: "Sensors are scrambling. Drive manually!",
    bossName: "Unknown Entity",
    physics: {
      gravity: t.grav,
      friction: 0.1,
      restitution: 0.6,
      slope: 5,
    },
    theme: {
      primaryColor: t.color,
      secondaryColor: t.sec,
      floorColor: t.floor,
      ambientIntensity: 0.6,
      neonColor: t.color,
    }
  };
};
