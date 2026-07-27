# Sanctuary Book Reader

A modern, cross-platform book reader monorepo.

## 🚀 Getting Started

Sanctuary utilizes **Bun** for rapid package management and local execution.

### Environment Setup

1. Copy the example environment variables:
   ```bash
   cp .env.example .env
   ```

### 🐳 Containerized Development (Recommended)

To ensure a pristine, reproducible development environment (bypassing native OS library mismatches), use Podman or Docker. This orchestrates both the Vite frontend and Cloudflare Wrangler API backend.

1. Start the containers in the background:
   ```bash
   podman-compose up -d
   ```
2. Verify services are healthy:
   ```bash
   podman-compose ps
   ```
3. Access the application:
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:8788`

### 🖥️ Bare-metal Development

If you prefer to run on the host directly (required for Desktop and Mobile development):

1. Install dependencies:
   ```bash
   bun install
   ```
2. Run development servers (Web & API):
   ```bash
   bun run dev
   ```

## 🛠️ Code Quality Stack

This project uses a comprehensive set of tools to ensure high code quality, security, and performance.

### Scripts
Run these from the root directory:

- `bun run lint`: Run ESLint across the monorepo.
- `bun run check`: Type-check the web app.
- `bun run build`: Build the web app for production.

### ⚓ Git Hooks
We use **Husky** to enforce quality:
- **Pre-commit**: Runs `lint-staged` (ESLint).
- **Commit-msg**: Validates commit messages via **Commitlint** (Conventional Commits).

## Thanks

- [Boxy Svg](https://boxy-svg.com) : simple & effective svg editor
- [Bun](https://bun.sh) : super fast runtime for JavaScript and TypeScript
- [Cloudflare Workers](https://workers.cloudflare.com/) : edge deployment platform
- [Clerk](https://clerk.com/) : authentication and user management
- [Epub.js](https://github.com/futurepress/epub.js/) : epub rendering library
- [Eslint](https://eslint.org) : super tool to find & fix problems
- [Github](https://github.com) : for all their great work year after year, pushing OSS forward
- [React](https://react.dev) : great library for web and native user interfaces
- [Shields.io](https://shields.io) : for the nice badges on top of this readme
- [Svg Omg](https://jakearchibald.github.io/svgomg/) : the great king of svg file size reduction
- [TailwindCss](https://tailwindcss.com) : awesome lib to produce maintainable style
- [Vite](https://vitejs.dev) : next generation frontend tooling
- [Zod](https://github.com/colinhacks/zod) : typeScript-first schema validation

## Page views

[![Views Counter](https://views-counter.vercel.app/badge?pageId=Anurup-R-Krishnan%2FSanctuary&leftColor=5c5c5c&rightColor=07a62f&type=total&label=Visitors&style=none)](https://github.com/Kumara2mahe/Views-Counter)
