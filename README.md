# VOID CADET: The Infinite Arcade (2026 Edition)

**Vertical:** Entertainment / Gaming / Roguelite Arcade  
**Tech Stack:** React 18, React Three Fiber, Cannon.js (Physics), Google Gemini API (Multimodal)

## Overview
Void Cadet is the ultimate evolution of the classic pinball genre. Instead of a single static table, it offers an infinite, procedurally generated galaxy. Every time you score enough to "Warp," the entire universe—physics, visuals, and narrative—is reconstructed in real-time by Gemini.

## Approach & Logic
- **The "Warp" Cycle**: The core gameplay loop involves scoring to charge a "Warp Gate." Once entered, the current game context (score, artifact count, playstyle) is passed to Gemini 3 Flash.
- **Multimodal Generation**: 
    - **Visuals**: `gemini-2.5-flash-image` generates unique planetary backdrops.
    - **Physics**: Gemini dictates gravity, friction, and slope variables, which are hot-swapped into the Cannon.js physics engine.
    - **Audio**: `gemini-2.5-flash-preview-tts` provides real-time tactical voice lines for the Starship AI.
- **Grounding Integration**:
    - **Search Grounding**: Planet names and lore are derived from real astronomical discoveries (exoplanets) found via Google Search.
    - **Maps Grounding**: The main menu syncs with the player's physical location (Geolocation) to show real-world observatories and space centers, turning a virtual game into a real-world exploration hub.

## How it Works
1. **Frontend**: React handles the state and UI. React Three Fiber renders the 3D table.
2. **Physics**: Cannon.js simulates a high-speed pinball.
3. **AI Layer**: `geminiService.ts` acts as the "Game Master," coordinating multimodal API calls.
4. **Synchronization**: When a "Warp" occurs, the UI enters a 6-second transition state. During this time, the next planet's configuration, image, and voice line are fetched concurrently to ensure a seamless arrival.

## Security & Reliability
- **Safety**: No API keys are stored in the client; they are injected via environment variables.
- **Robustness**: Fallback planet configurations are provided to ensure the game never crashes if an API limit is reached.
- **Efficiency**: 3D assets use shared geometries and materials to maintain high FPS on mobile and desktop.

## Accessibility
- **Screen Readers**: All AI crew messages use ARIA live regions.
- **Navigation**: Keyboard-centric controls (Arrows/Space) allow for precise play without a mouse.
- **Visuals**: High-contrast neon themes ensure HUD visibility.