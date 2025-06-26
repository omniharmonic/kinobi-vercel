# Kinobi Architecture Document
*System architecture for enhanced chore tracking with time cycles and visual countdown - Vercel Edition*

## System Overview

Kinobi is a sophisticated time-cycle-aware chore tracking system with visual countdown indicators, running on Vercel's serverless platform. This Vercel edition replaces the original SQLite-based backend with Vercel KV (Redis-compatible) for improved scalability and zero-configuration deployment.

## Migration Status: SQLite → Vercel KV 🚀

**✅ COMPLETED MIGRATION ELEMENTS:**
- Frontend React application fully ported
- Database schema adapted for Vercel KV key-value storage
- Migration script created for data transfer
- PWA functionality preserved
- Vercel configuration established

**⏳ PENDING IMPLEMENTATION:**
- Main API handler for serverless functions
- Vercel KV integration in backend endpoints
- Production deployment and testing

## Current Architecture (Vercel Edition)

### Deployment Platform
```
Vercel Serverless Platform
├── Frontend: React SPA (Static Site)
├── Backend: Serverless Functions (Node.js/TypeScript)
├── Database: Vercel KV (Redis-compatible)
├── CDN: Vercel Edge Network
└── Domain: Automatic HTTPS + Custom domains
```

### Frontend Architecture (React/TypeScript) ✅ COMPLETE
```
src/main.tsx (2225 lines)
├── App (Vercel PWA Shell + Router)
├── KinobiView (Enhanced Main Dashboard)
│   └── ChoreTile[] (Enhanced with Countdown)
│       ├── ChoreIcon
│       ├── CountdownRing (SVG Progress Indicator) ✅ IMPLEMENTED
│       ├── TimeDisplay ✅ IMPLEMENTED
│       └── StatusIndicator ✅ IMPLEMENTED
├── TenderSelectionModal
├── HistoryView
├── LeaderboardView ✅ IMPLEMENTED
│   ├── LeaderboardTable ✅ IMPLEMENTED
│   ├── ScoreCard ✅ IMPLEMENTED
│   └── TenderRankings ✅ IMPLEMENTED
└── AdminDashboard (Enhanced)
    ├── ManageChoresComponent (+ Cycle Configuration) ✅ IMPLEMENTED
    ├── ManageTendersComponent
    ├── GlobalConfigComponent ✅ IMPLEMENTED
    └── SyncSettingsComponent ✅ IMPLEMENTED
```

### Backend Architecture (Vercel Serverless) ⏳ PENDING IMPLEMENTATION
```
api/ (Serverless Functions)
├── [...slug].ts          # Main API handler ⏳ NEEDS IMPLEMENTATION
├── [slug].js             # Template placeholder ❌ TO BE REPLACED
├── catchall.js           # Template placeholder ❌ TO BE REPLACED
└── hello.ts              # Template placeholder ❌ TO BE REPLACED

Expected Implementation:
api/
├── [...slug].ts          # Main dynamic API handler
│   ├── GET/POST /api/:syncId/chores
│   ├── GET/POST /api/:syncId/tenders
│   ├── GET /api/:syncId/history
│   ├── POST /api/:syncId/tend
│   ├── GET /api/:syncId/leaderboard
│   ├── GET/PUT /api/:syncId/config
│   └── GET /api/app-version
└── Vercel KV Integration
    ├── Data Storage: `kinobi:${syncId}` keys
    ├── Instance Management
    └── Real-time Updates
```

### Database Architecture: Vercel KV Migration ✅ SCHEMA DESIGNED

**Original SQLite Schema:**
```sql
CREATE TABLE kinobi_instances (
  sync_id TEXT PRIMARY KEY,
  tenders TEXT DEFAULT '[]',
  tending_log TEXT DEFAULT '[]',
  last_tended_timestamp INTEGER,
  last_tender TEXT,
  chores TEXT DEFAULT '[]',
  config TEXT,
  tender_scores TEXT
)
```

**New Vercel KV Schema:**
```typescript
// Key Pattern: `kinobi:${syncId}`
interface KVInstanceData {
  tenders: Tender[]
  tending_log: HistoryEntry[]
  last_tended_timestamp: number | null
  last_tender: string | null
  chores: Chore[]           // Enhanced with cycle data + points
  config: ChoreConfig       // Global configuration
  tender_scores: TenderScore[]  // Points tracking per person
}

// Storage Pattern
await kv.set(`kinobi:${syncId}`, instanceData);
const data = await kv.get(`kinobi:${syncId}`);
```

### Data Model (Vercel Edition) ✅ FRONTEND IMPLEMENTED
```typescript
interface Chore {
  id: string
  name: string
  icon: string
  cycleDuration: number      // Hours between completions
  points: number            // Points awarded for completion
  lastCompleted?: number     // Timestamp of last completion
  dueDate?: number          // Calculated due date
}

interface ChoreConfig {
  defaultCycleDuration: number  // Default 24 hours
  defaultPoints: number         // Default points per chore (10)
  warningThreshold: number      // When to show yellow (75%)
  urgentThreshold: number       // When to show red (90%)
}

interface TenderScore {
  tenderId: string
  name: string
  totalPoints: number
  completionCount: number
  lastActivity: number         // Timestamp of last completion
}

interface LeaderboardEntry {
  tender: Tender
  score: TenderScore
  rank: number
  recentCompletions: HistoryEntry[]  // Last 5 completions
}
```

## Vercel Deployment Configuration ✅ COMPLETE

### Project Structure
```
kinobi-vercel/
├── api/
│   ├── [slug].js             # ❌ Template (to be replaced)
│   ├── catchall.js           # ❌ Template (to be replaced)
│   └── hello.ts              # ❌ Template (to be replaced)
├── src/
│   └── main.tsx              # ✅ Complete React app (2225 lines)
├── public/
│   ├── index.html            # ✅ PWA entry point
│   ├── manifest.json         # ✅ PWA manifest
│   ├── sw.js                 # ✅ Service worker
│   ├── tailwind.css          # ✅ Styles
│   └── kinobi_alpha.gif      # ✅ Logo
├── dist/                     # ✅ Build output
├── vercel.json               # ✅ Vercel configuration
├── package.json              # ✅ Dependencies (Vercel-optimized)
├── build-client.js           # ✅ Build script
├── migrate-data.js           # ✅ SQLite → KV migration
└── README.md                 # ✅ Documentation
```

### Vercel Configuration ✅ COMPLETE
```json
// vercel.json
{
  "functions": {
    "api/**/*.ts": {
      "runtime": "@vercel/node@3.0.21"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/(manifest.json|sw.js|kinobi_alpha.gif)",
      "destination": "/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/dist/index.html"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, PUT, DELETE, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type" }
      ]
    }
  ]
}
```

### Dependencies ✅ COMPLETE
```json
// package.json (Vercel-optimized)
{
  "name": "kinobi-vercel",
  "version": "1.0.9",
  "dependencies": {
    "@vercel/kv": "^1.0.1",        // ✅ Vercel KV database
    "@vercel/node": "^3.0.21",     // ✅ Serverless runtime
    "react": "^18.2.0",            // ✅ Frontend framework
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.16.0"
  },
  "scripts": {
    "dev": "vercel dev",
    "build": "npm run build:css && vite build",
    "deploy": "vercel --prod",
    "migrate": "node migrate-data.js"
  }
}
```

## Migration Strategy ✅ DESIGN COMPLETE

### SQLite to Vercel KV Migration ✅ SCRIPT READY
```javascript
// migrate-data.js - Data migration utility
async function migrateData(dbPath) {
  // Read SQLite kinobi_instances table
  const rows = await db.all("SELECT * FROM kinobi_instances");
  
  for (const row of rows) {
    // Parse JSON fields
    const instanceData = {
      tenders: JSON.parse(row.tenders || '[]'),
      tending_log: JSON.parse(row.tending_log || '[]'),
      chores: JSON.parse(row.chores || '[]').map(migrateChore),
      config: row.config ? JSON.parse(row.config) : getDefaultConfig(),
      tender_scores: JSON.parse(row.tender_scores || '[]'),
      last_tended_timestamp: row.last_tended_timestamp,
      last_tender: row.last_tender,
    };
    
    // Store in Vercel KV
    await kv.set(`kinobi:${row.sync_id}`, instanceData);
  }
}
```

### Backward Compatibility ✅ PRESERVED
- Same sync codes work across versions
- Identical API endpoint structure
- Preserved data formats and relationships
- No loss of functionality during migration

## Implementation Status Summary

### ✅ COMPLETED COMPONENTS:
- **Frontend Application**: Complete React app with all features (2225 lines)
- **Visual Countdown System**: Full implementation with progress rings
- **Scoring & Leaderboards**: Complete with filtering and sorting
- **PWA Support**: Service worker, manifest, offline capabilities
- **Vercel Configuration**: Deployment, routing, headers
- **Build System**: TypeScript compilation, CSS processing
- **Migration Script**: SQLite to KV data transfer utility

### ⏳ PENDING IMPLEMENTATION:
- **Main API Handler**: `/api/[...slug].ts` serverless function
- **Vercel KV Integration**: Database operations in backend
- **API Endpoints**: 20+ endpoints for full functionality
- **Production Testing**: End-to-end deployment verification

### 🎯 NEXT STEPS:
1. **Implement Main API Handler** (`/api/[...slug].ts`)
2. **Integrate Vercel KV** in all database operations
3. **Deploy and Test** complete functionality
4. **Run Migration** for existing users
5. **Update Documentation** with live deployment URLs

## Vercel Platform Benefits

### Scalability & Performance
- **Serverless Functions**: Auto-scaling based on demand
- **Global CDN**: Sub-100ms response times worldwide
- **Edge Optimization**: Static assets cached globally
- **Zero Configuration**: No server management required

### Reliability & Security
- **99.99% Uptime**: Vercel's SLA guarantee
- **Automatic HTTPS**: SSL certificates managed automatically
- **DDoS Protection**: Built-in security layer
- **Monitoring**: Real-time error tracking and analytics

### Cost Efficiency
- **Pay-per-Use**: Only charged for actual usage
- **Free Tier**: Generous limits for personal use
- **No Infrastructure**: No server costs or maintenance
- **Instant Scaling**: Handle traffic spikes without planning

## Comparison: Original vs Vercel Edition

| Feature | Original (SQLite) | Vercel Edition |
|---------|------------------|----------------|
| **Database** | SQLite file | Vercel KV (Redis) |
| **Hosting** | Self-hosted server | Vercel serverless |
| **Scaling** | Manual server management | Auto-scaling |
| **Deployment** | Manual server setup | One-click deploy |
| **Maintenance** | Server updates required | Zero maintenance |
| **Cost** | Server + domain costs | Pay-per-use |
| **Performance** | Single server location | Global CDN |
| **Reliability** | Depends on server uptime | 99.99% SLA |
| **Features** | ✅ All features | ✅ Same features |
| **Data Migration** | N/A | ✅ Automated script |

## Production Readiness Status

**🟡 PARTIALLY READY** - Frontend complete, backend pending

### Ready for Production:
- ✅ Complete frontend application with all features
- ✅ PWA support for mobile installation
- ✅ Vercel deployment configuration
- ✅ Data migration strategy
- ✅ Performance optimizations
- ✅ Visual design and UX

### Requires Implementation:
- ⏳ Main API handler with Vercel KV integration
- ⏳ Backend endpoint implementations
- ⏳ Production testing and validation
- ⏳ Live deployment and monitoring

**Estimated Completion Time**: 2-3 hours for backend implementation

## Future Architecture Enhancements

### Advanced Vercel Features ⏳ FUTURE
- **Edge Functions**: Ultra-fast API responses
- **Analytics**: User behavior insights
- **A/B Testing**: Feature experimentation
- **Preview Deployments**: Branch-based testing
- **Team Collaboration**: Multiple developer support

### Integration Possibilities ⏳ FUTURE
- **Vercel Postgres**: Relational data if needed
- **Vercel Blob**: File storage for chore attachments
- **Vercel Cron**: Scheduled notifications
- **GitHub Integration**: Automated deployments
- **Custom Domains**: Branded URLs

This architecture provides a solid foundation for transitioning Kinobi to a modern, scalable, serverless platform while maintaining all existing functionality and user experience.

# Kinobi Telegram Bot Architecture

This document outlines the architecture for integrating a Telegram bot with the Kinobi application. The bot will provide proactive reminders and allow users to interact with the Kinobi system directly from Telegram.

## 1. Core Components

The architecture will consist of the following new and existing components:

-   **Telegram Bot**: The user-facing interface within the Telegram app. Created and managed via Telegram's BotFather.
-   **Vercel Serverless Function (Webhook Handler)**: A new endpoint (`api/telegram.ts`) to process incoming messages and callbacks from Telegram. This is the bot's "brain."
-   **Vercel Cron Job (Status Checker)**: A new scheduled job (`api/cron/check-chores.ts`) that runs periodically to check for chore status changes and trigger reminders.
-   **Kinobi Core API (`api/[...slug].ts`)**: The existing API will be used by the bot to fetch data (chores, tenders) and perform actions (log tending).
-   **Vercel KV Store**: The existing database will be extended to store Telegram-specific configurations (bot tokens, channel IDs) and the last known status of each chore for reminder logic.
-   **Kinobi Frontend (Settings Page)**: The existing settings UI will be updated to allow users to configure their Telegram integration.

## 2. System Architecture Diagram

```mermaid
graph TD
    subgraph "Telegram Platform"
        User(Telegram User)
        Bot(Kinobi Telegram Bot)
    end

    subgraph "Vercel Platform"
        Webhook[API: /api/telegram.ts]
        CronJob[CRON: /api/cron/check-chores.ts]
        CoreAPI[API: /api/[...slug].ts]
        KV(Vercel KV Store)
        Frontend(Kinobi React App)
    end

    User -- Interacts with --> Bot
    Bot -- Webhooks --> Webhook
    Webhook -- Responds to --> Bot

    Webhook -- Reads/Writes --> CoreAPI
    CronJob -- Reads --> CoreAPI
    CoreAPI -- Reads/Writes --> KV

    CronJob -- Sends alerts to --> Bot

    AdminUser[Admin User] -- Configures --> Frontend
    Frontend -- Writes config --> CoreAPI
```

## 3. Data and Logic Flow

### A. Interactive Chore Logging

1.  A user sends a command (e.g., `/log`) to the **Kinobi Telegram Bot**.
2.  Telegram sends a webhook to the **Vercel Serverless Function** (`api/telegram.ts`).
3.  The function authenticates the request and calls the **Kinobi Core API** to fetch the list of chores for that user's `syncId`.
4.  The function formats the chores as an inline keyboard and sends it back to the user via the Telegram API.
5.  The user selects a chore. Telegram sends another webhook (a `callback_query`).
6.  The function repeats the process for selecting a "Tender."
7.  Once the chore and tender are selected, the function calls the `tend` endpoint on the **Kinobi Core API**.
8.  The function sends a final confirmation message to the user in Telegram.

### B. Overdue Chore Reminders

1.  The **Vercel Cron Job** is triggered on a schedule (e.g., every hour).
2.  The cron job's function (`api/cron/check-chores.ts`) executes.
3.  It fetches all `syncId` instances that have Telegram notifications enabled from the **Vercel KV Store**.
4.  For each instance, it fetches all chores via the **Kinobi Core API**.
5.  For each chore, it calculates the current status using the `CountdownService` logic.
6.  It compares the current status with the last known status stored in the **Vercel KV Store**.
7.  If a chore's status has changed to `overdue`, it sends a notification message to the configured Telegram channel via the **Telegram Bot API**.
8.  It updates the **Vercel KV Store** with the new chore statuses.

## 4. Key Considerations

-   **Security**: The Telegram Bot Token is highly sensitive and must be stored securely as a Vercel environment variable. The webhook endpoint should also validate that incoming requests are genuinely from Telegram.
-   **Scalability**: Using serverless functions and Vercel's infrastructure ensures the solution is scalable and cost-effective.
-   **State Management**: For interactive commands (like logging a chore), the bot will need to manage a simple state machine to track the user's progress through the conversation (e.g., "user has selected a chore, now waiting for a tender").
-   **Error Handling**: The bot should provide clear feedback to the user in case of errors (e.g., API is down, invalid command).
-   **Discoverability**: A new mechanism will be needed for the cron job to discover all `syncId`s that need to be checked. This will likely involve maintaining a separate set of `syncId`s in the KV store.