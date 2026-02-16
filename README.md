# VOID CADET: The Infinite Arcade

**Vertical:** Entertainment / Gaming  
**Tech Stack:** React, React Three Fiber, Cannon.js, Google Gemini API

## Overview
Void Cadet is a reimagining of the classic space pinball game for the AI era. Instead of a static table, the game features an infinite, procedurally generated universe. Every time the player activates the "Warp Gate", Google Gemini generates a completely new planet with unique physics (gravity, friction), visual themes, and lore.

## How It Works
1.  **Core Loop:** The player scores points to charge the Warp Drive.
2.  **GenAI Injection:** Upon entering the Warp Gate, the game snapshot (score, lives, playstyle) is sent to Gemini.
3.  **Procedural Generation:** Gemini hallucinates a JSON configuration for the next level, including:
    -   **Physics:** Modifying the physics engine's gravity, restitution (bounciness), and friction.
    -   **Visuals:** Defining a color palette and lighting scheme.
    -   **Lore:** Generating a name, description, and "Tactician" crew message.
4.  **Real-time Adaptation:** The React frontend hydrates the state with this new config instantly, creating an endless "Roguelite" pinball experience.

## Assumptions
-   The user has a valid `API_KEY` for Google GenAI in their environment.
-   The browser supports WebGL.
