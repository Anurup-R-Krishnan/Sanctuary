# Sanctuary Book Reader

A modern, cross-platform book reader monorepo.

## 🛠️ Code Quality Stack

This project uses a comprehensive set of tools to ensure high code quality, security, and performance.

### Scripts

Run these from the root directory:

#### 🧹 Linting & Formatting
- `npm run lint`: Run ESLint across the monorepo.
- `npm run format`: Format code using Prettier (if configured).
- `npm run syncpack`: Unify dependency versions across workspaces.
- `npm run sort-package-json`: Automatically sort all `package.json` files.

#### 🛡️ Security & Integrity
- `npm run secretlint`: Scan for accidentally committed secrets.
- `npm run depcruise`: Validate project architecture and check for circular dependencies.
- `npm run spellcheck`: Check for typos in code and comments.

#### 📈 Performance & Quality
- `npm run betterer`: Track code quality improvements over time (e.g., reducing TODOs).
- `npm run lhci`: Run Lighthouse audits on the web production build.
- `npm run size-limit`: Check bundle size constraints.
- `npm run jscpd`: Detect code duplication.
- `npm run knip`: Find unused files, dependencies, and exports.

#### 📦 Maintenance
- `npm run ncu`: Check for available package updates.

### ⚓ Git Hooks
We use **Husky** to enforce quality:
- **Pre-commit**: Runs `lint-staged` (ESLint, Prettier, JS-CPD, Sort-Package-JSON).
- **Commit-msg**: Validates commit messages via **Commitlint** (Conventional Commits).

## 🚀 Getting Started

1. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
2. Run development server:
   ```bash
   npm run dev
   ```
