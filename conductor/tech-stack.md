# Technology Stack

## Core Architecture
- **Framework:** React 18+ (via Vite)
- **Language:** TypeScript (Strict Mode)
- **Architecture:** Single Page Application (SPA) with separate route-based views.

## 3D and Rendering
- **Engine:** Three.js
- **React Abstraction:** React Three Fiber (R3F)
- **Helpers:** `@react-three/drei` for common 3D utilities and camera controls.

## Routing and State
- **Routing:** TanStack Router (Provides type-safe routing, crucial for handling complex data parameters between the different scale views).
- **State Management:** Zustand (Lightweight, crisp state management for UI settings, active selections, and navigation state).

## Styling and UI System
- **Styling:** CSS Modules with global CSS Custom Properties (Variables) for design tokens.
- **Component Workbench:** Storybook (First-class citizen in the workflow for building, testing, and cataloging UI components in isolation).
- **Philosophy:** Strict component-based architecture. No inline styles or utility-class soup. All UI elements must pull from the central design token variables for consistency.

## Data and Content
- **Data Source:** Preprocessed static JSON files fetched at runtime (`public/data/stars.json`), generated offline via streaming Node.js pipeline (`scripts/build-data.ts`).
- **Editorial Content:** MDX (Allows rendering React/3D components directly inside Markdown for the reference guides).

## Testing
- **Test Runner:** Vitest (Fast Vite-native test runner for unit and integration testing)
- **Coverage Provider:** `@vitest/coverage-v8` (V8 AST code coverage analysis)

## Build and CI/CD
- **Build Tool:** Vite
- **Deployment:** GitHub Pages (via GitHub Actions).
