# VOID CADET: The Infinite Arcade (2026 Edition)

**Vertical:** Entertainment / Generative Gaming  
**Tech Stack:** React 18, React Three Fiber, Cannon.js, Google Gemini API

## Advanced Google Services Integration
This version implements a high-tier integration of Google's newest multimodal services:

- **Cinematic Warp (Veo 3.1)**: Every warp sequence triggers the `veo-3.1-fast-generate-preview` model to generate a custom 720p 16:9 video of the spacecraft approaching the next generated planet.
- **Thinking Debriefs (Gemini 3 Pro)**: On Game Over, the model uses a high `thinkingBudget` (16,000 tokens) to analyze game stats and provide a grounded, contextual performance review.
- **Grounding & Maps**: 
    - **Google Maps**: Identifies real-world space research centers near the player's physical location.
    - **Google Search**: Feeds real-time 2024/2025 space news into the HUD and generates planet lore based on recent exoplanet discoveries.
- **Speech (TTS)**: The AI commander uses `gemini-2.5-flash-preview-tts` for dynamic mission briefings.

## Compliance & Security
- **Billing Integrity**: Implements the mandatory `window.aistudio.openSelectKey()` flow to ensure users provide valid billing for the high-compute Veo generation models.
- **Accessibility**: Optimized ARIA regions for AI speech and performance debriefs, ensuring screen readers can follow the narrative flow.
- **Resource Efficiency**: 3D geometries are optimized for low-overhead rendering, and video assets are loaded as direct streams with secure API key appending.
