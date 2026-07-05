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
   docker compose up -d
   # or
   podman-compose up -d
   ```
2. Verify services are healthy:
   ```bash
   docker compose ps
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
- `bun run lhci`: Run Lighthouse audits on the web production build.
- `bun run size`: Check bundle size constraints.
- `bun run jscpd`: Detect code duplication.
- `bun run knip`: Find unused files, dependencies, and exports.

### ⚓ Git Hooks
We use **Husky** to enforce quality:
- **Pre-commit**: Runs `lint-staged` (ESLint, Prettier, JS-CPD, Sort-Package-JSON).
- **Commit-msg**: Validates commit messages via **Commitlint** (Conventional Commits).
