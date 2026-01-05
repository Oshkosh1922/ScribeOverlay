# ScribeOverlay

A Chrome extension + web app that helps you understand any text on the web. Select text, click "Explain", and get a clear, intelligent breakdown.

## Features

- **Instant Explanations** - Select any text on a webpage and get a thorough explanation
- **Clean Analysis** - Summary, key takeaways, context, implications, and critical analysis
- **No Clutter** - Focused, readable output without emoji spam or confusing modules
- **Web App** - Paste text at `/explain` for mobile or desktop use

## Tech Stack

- **Frontend**: Next.js 14, Tailwind CSS
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **AI**: OpenAI GPT-4o
- **Extension**: Chrome Manifest V3

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL database (or Supabase account)
- OpenAI API key

### Installation

1. Clone the repo:
```bash
git clone https://github.com/Oshkosh1922/ScribeOverlay.git
cd ScribeOverlay
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `.env.local` with your credentials:
```
DATABASE_URL="your-postgres-url"
DIRECT_URL="your-direct-postgres-url"
NEXTAUTH_SECRET="generate-a-secret"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="sk-your-key"
```

4. Set up the database:
```bash
cd apps/web
pnpm prisma generate
pnpm prisma db push
pnpm seed
```

5. Start development:
```bash
pnpm dev
```

### Loading the Extension

1. Build the extension:
```bash
cd apps/extension
npm run build
```

2. Open Chrome and go to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `apps/extension/dist` folder

## Usage

1. Sign up at `http://localhost:3000`
2. Go to the Connect page to link your extension
3. Select any text on a webpage
4. Click the "Explain" button that appears
5. Read the analysis in the side panel

## Project Structure

```
scribeoverlay/
├── apps/
│   ├── web/          # Next.js web application
│   └── extension/    # Chrome extension
├── packages/
│   └── shared/       # Shared types and utilities
└── package.json      # Monorepo root
```

## License

MIT
