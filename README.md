<div align="center">
<img width="1200" height="475" alt="Crucible Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Goal-Locked: The Crucible

**The Crucible** is a high-stakes, physics-driven "Football Battle Royale" that reimagines traditional soccer as a gladiator-style survival match. Unlike standard football where you score to win, in **Goal-Locked**, you score to *eliminate*.

Following a First Principles approach, we are stripping away teams and points, focusing entirely on the **bottleneck of survival**: protecting your space while exploiting the gaps of others.

## Core Loop: "Defend or Delete"

- **The Objective:** Be the last player whose Goal-Gate remains "Unlocked."
- **The Elimination:** When the ball enters your goal, your gate is **Locked** (it physically transforms into a solid wall). Your player character is ejected from the arena, and you are out.
- **Shrinking Arena:** As players are eliminated and their goals turn into walls, the arena becomes progressively more claustrophobic, increasing the pacing and intensity.

## Technical Architecture

- **Engine:** React Three Fiber (R3F)
- **Physics:** Cannon-es (Integrated with custom material properties)
- **State:** Zustand (High-performance reactive game state)
- **Styles:** Vanilla CSS (Chrono-Tactical Aesthetic)

## Development

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`
3. Build for production:
   `npm run build`
