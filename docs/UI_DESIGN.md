# UI Design Document - Whispers of the Abyss (Mobile)

## 1. Design Philosophy
The mobile user interface is designed to maximize immersion in the game world while providing comprehensive control through a layered, non-intrusive "Demon King" interface. The design prioritizes thumb-friendly interactions and screen real estate efficiency.

## 2. Layer Structure

The interface is conceptually divided into two distinct z-index layers:

### Layer 1: The Game World (Background)
*   **Description**: This is the bottom-most layer where the actual gameplay renders.
*   **Components**:
    *   **Map & Terrain**: The game world tiles.
    *   **Entities**: Buildings, NPCs, Enemies, and the Player Avatar.
    *   **Visual Effects**: Particles, lighting, and environmental animations.
*   **Interaction**: Users interact directly with this layer (tap to move, tap to select) primarily when the upper layer is in its minimized state.

### Layer 2: The Demon King Interface (Control Panel)
*   **Description**: This is the "Operating System" or HUD of the Demon King. It floats above the game world and handles all management, combat controls, and system menus.
*   **Behavior**: It employs a "Drawer" interaction model with two distinct modes.

#### Mode A: Minimized (Combat & Exploration)
*   **State**: The default state during active gameplay.
*   **Visuals**:
    *   **Position**: Anchored to the **Bottom Left** of the screen.
    *   **Footprint**: Minimal screen coverage to allow maximum visibility of Layer 1.
*   **Components**:
    *   **Status Bar (Compact)**: Shows essential vital statistics (e.g., HP, Mana/Energy) in a simplified bar or gauge format.
    *   **Quick Actions**: A small cluster of buttons for the most frequently used skills or items (3-4 slots max).
*   **Interaction**:
    *   Tap buttons to execute skills.
    *   **Gesture**: Swipe Up (or tap a specific handle) to transition to Mode B.

#### Mode B: Full Panel (Management & Strategy)
*   **State**: Activated by the user when detailed management is required.
*   **Visuals**:
    *   **Animation**: Slides up from the bottom like a drawer, covering a significant portion (50% - 100%) of the screen, or expands into a modal view.
    *   **Background**: Semi-transparent or opaque to focus attention on the UI elements.
*   **Components**:
    *   **Full Dashboard**: Detailed attributes, currency, and resource counts.
    *   **Inventory**: Grid view of items.
    *   **Skill Tree**: Full view of available and learned skills.
    *   **Quests/Tasks**: List of current objectives.
    *   **System Settings**: Audio, graphics, and account settings.
*   **Interaction**:
    *   Full touch interaction for scrolling lists, equipping items, etc.
    *   **Gesture**: Swipe Down (or tap a "Close/Minimize" button) to return to Mode A.

## 3. Visual Style Guidelines
*   **Theme**: Dark, magical, abyss-themed (purples, deep blues, blacks) with high-contrast highlights for interactive elements (gold, bright red/cyan).
*   **Typography**: Legible sans-serif for body text; stylized fantasy font for headers (sparse usage).
*   **Feedback**: Immediate visual response (glow, scale) on touch.

## 4. Interaction Flow Example
1.  **Exploration**: Player sees the game world. The Demon King Interface is **Minimized**. They tap the ground to move.
2.  **Encounter**: An enemy appears. Player uses the **Quick Action** buttons in the bottom-left to cast a fireball.
3.  **Looting**: The enemy drops an item. Player swipes up the interface to enter **Full Panel** mode.
4.  **Management**: The inventory screen covers the view. The player equips the new item.
5.  **Return**: Player swipes down the panel. The interface returns to **Minimized**, and the view of the game world is restored.
