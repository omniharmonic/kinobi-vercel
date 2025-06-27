# Kinobi Implementation Plan - Vercel Edition
*Comprehensive implementation strategy for Kinobi migration to Vercel serverless platform*

## Project Overview

This document outlines the implementation strategy for migrating Kinobi from the original SQLite-based system to Vercel's serverless platform with Vercel KV database. The migration preserves all functionality while gaining serverless scalability and zero-configuration deployment.

## Migration Status: SQLite → Vercel 🚀

**✅ COMPLETED MIGRATION PHASES:**
- **Phase 1**: Frontend Migration (100%) - React app fully ported
- **Phase 2**: Database Schema Design (100%) - Vercel KV structure defined
- **Phase 3**: Migration Script (100%) - SQLite to KV data transfer
- **Phase 4**: Vercel Configuration (100%) - Deployment setup complete
- **Phase 5**: Backend API Handler (100%) - Serverless function implementation
- **Phase 6**: Vercel KV Integration (100%) - Database operations
- **Phase 7**: Production Testing (100%) - End-to-end verification

**✅ V2 ENHANCEMENTS COMPLETE:**
- **Phase 8**: Notification System Overhaul (100%)
- **Phase 9**: Gamification Engine (100%)
- **Phase 10**: UI/UX Refinement (100%)

**🎯 VERCEL MIGRATION BENEFITS:**
- Serverless auto-scaling and zero maintenance
- Global CDN for worldwide performance
- 99.99% uptime with automatic failover
- Pay-per-use cost model vs fixed server costs
- One-click deployment vs manual server setup
- Built-in HTTPS, monitoring, and security

## Phase 1: Frontend Migration ✅ COMPLETE

### 1.1 React Application Port ✅ COMPLETE
**Status**: Complete frontend application (2225 lines)

**Completed Tasks:**
- ✅ Ported complete React application from original Kinobi
- ✅ All components and features preserved (countdown, leaderboards, admin)
- ✅ TypeScript interfaces maintained for type safety
- ✅ PWA functionality with service worker
- ✅ Responsive design and accessibility features
- ✅ Visual countdown system with progress rings

**Technical Implementation:**
```typescript
// Complete React app in src/main.tsx (2225 lines)
- App component with PWA shell and routing
- KinobiView with enhanced countdown system
- LeaderboardView with filtering and sorting
- AdminDashboard with chore/tender management
- All original functionality preserved
```

### 1.2 Build System Migration ✅ COMPLETE
**Status**: Vercel-optimized build process

**Completed Tasks:**
- ✅ Vite build system for React compilation
- ✅ Tailwind CSS processing for styling
- ✅ TypeScript compilation pipeline
- ✅ Build output optimized for Vercel deployment
- ✅ Build script with proper asset handling

**Technical Implementation:**
```javascript
// build-client.js - Vercel build process
- TypeScript compilation (tsc)
- Tailwind CSS processing
- Asset optimization
- Production build output to dist/
```

## Phase 2: Database Schema Design ✅ COMPLETE

### 2.1 Vercel KV Schema ✅ COMPLETE
**Status**: Complete schema design for key-value storage

**Completed Tasks:**
- ✅ Designed KV key pattern: `kinobi:${syncId}`
- ✅ Mapped SQLite columns to JSON object structure
- ✅ Preserved all data relationships and integrity
- ✅ Optimized for KV storage patterns
- ✅ Maintained backward compatibility

**Technical Implementation:**
```typescript
// Vercel KV Schema Design
interface KVInstanceData {
  tenders: Tender[]
  tending_log: HistoryEntry[]
  last_tended_timestamp: number | null
  last_tender: string | null
  chores: Chore[]
  config: ChoreConfig
  tender_scores: TenderScore[]
  rewards: Reward[]
  projects: Project[]
}

// Storage operations
await kv.set(`kinobi:${syncId}`, instanceData);
const data = await kv.get(`kinobi:${syncId}`);
```

### 2.2 Data Migration Strategy ✅ COMPLETE
**Status**: Complete migration process designed

**Completed Tasks:**
- ✅ SQLite table structure analysis
- ✅ JSON field parsing and transformation
- ✅ Chore migration with enhanced fields
- ✅ Preserved sync IDs for seamless transition
- ✅ Error handling and validation

## Phase 3: Migration Script ✅ COMPLETE

### 3.1 SQLite to KV Migration Tool ✅ COMPLETE
**Status**: Complete migration utility implemented

**Completed Tasks:**
- ✅ Created migrate-data.js script
- ✅ SQLite database reading functionality
- ✅ JSON parsing and data transformation
- ✅ KV storage simulation (MockKV for testing)
- ✅ Error handling and progress reporting
- ✅ Migration validation and verification

**Technical Implementation:**
```javascript
// migrate-data.js - Migration utility
async function migrateData(dbPath) {
  // Read SQLite kinobi_instances
  const rows = await db.all("SELECT * FROM kinobi_instances");
  
  for (const row of rows) {
    // Transform data structure
    const instanceData = {
      tenders: JSON.parse(row.tenders || '[]'),
      tending_log: JSON.parse(row.tending_log || '[]'),
      chores: JSON.parse(row.chores || '[]').map(migrateChore),
      config: row.config ? JSON.parse(row.config) : getDefaultConfig(),
      tender_scores: JSON.parse(row.tender_scores || '[]'),
      last_tended_timestamp: row.last_tended_timestamp,
      last_tender: row.last_tender,
    };
    
    // Store in KV with same sync ID
    await kv.set(`kinobi:${row.sync_id}`, instanceData);
  }
}
```

## Phase 4: Vercel Configuration ✅ COMPLETE

### 4.1 Deployment Configuration ✅ COMPLETE
**Status**: Complete Vercel setup for serverless deployment

**Completed Tasks:**
- ✅ Created vercel.json with function and routing configuration
- ✅ Set up TypeScript runtime for serverless functions
- ✅ Configured URL rewrites for SPA routing
- ✅ Added CORS headers for API endpoints
- ✅ Optimized static asset serving

**Technical Implementation:**
```json
// vercel.json - Deployment configuration
{
  "functions": {
    "api/**/*.ts": {
      "runtime": "@vercel/node@3.0.21"
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/dist/index.html" }
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

### 4.2 Package Dependencies ✅ COMPLETE
**Status**: Vercel-optimized dependency management

**Completed Tasks:**
- ✅ Added @vercel/kv for database operations
- ✅ Added @vercel/node runtime for serverless functions
- ✅ Maintained React and TypeScript dependencies
- ✅ Optimized build scripts for Vercel deployment
- ✅ Added migration script command

**Technical Implementation:**
```json
// package.json - Vercel dependencies
{
  "name": "kinobi-vercel",
  "version": "1.0.9",
  "dependencies": {
    "@vercel/kv": "^1.0.1",        // KV database
    "@vercel/node": "^3.0.21",     // Serverless runtime
    "react": "^18.2.0",            // Frontend framework
    "react-router-dom": "^6.16.0"
  },
  "scripts": {
    "dev": "vercel dev",
    "deploy": "vercel --prod",
    "migrate": "node migrate-data.js"
  }
}
```

## Phase 5: Backend API Implementation ✅ COMPLETE

### 5.1 Main API Handler ✅ COMPLETE
**Status**: All handlers implemented in `/api/app/[...slug].ts`

**Completed Tasks:**
- ✅ Created `/api/app/[...slug].ts` serverless function.
- ✅ Implemented dynamic routing for all API resources.
- ✅ Integrated Vercel KV for all data operations.
- ✅ Ported all original API endpoints and added new ones for V2 features.
- ✅ Implemented robust error handling and input validation.
- ✅ Configured CORS and security headers in `vercel.json`.

**Technical Implementation:**
```typescript
// /api/app/[...slug].ts - Main API handler summary
export default async function handler(req, res) {
  // ... route parsing ...
  const instanceData = await getInstanceData(syncId);
  
  // Route to appropriate resource handler
  switch (resource) {
    case 'chores': return handleChores(req, res, instanceData);
    case 'tenders': return handleTenders(req, res, instanceData);
    case 'tend': return handleTend(req, res, instanceData);
    case 'history': return handleHistory(req, res, instanceData);
    case 'leaderboard': return handleLeaderboard(req, res, instanceData);
    case 'config': return handleConfig(req, res, instanceData);
    case 'rewards': return handleRewards(req, res, instanceData);
    case 'projects': return handleProjects(req, res, instanceData);
    // ... and more
  }
}
```

### 5.2 API Endpoint Implementation ✅ COMPLETE
**Status**: All endpoints implemented and tested during development.

**Available Endpoints:**
```
# Core
GET    /api/{syncId}/chores
POST   /api/{syncId}/chores
PUT    /api/{syncId}/chores/{id}
DELETE /api/{syncId}/chores/{id}
PUT    /api/{syncId}/chores/reorder
POST   /api/{syncId}/tend
# Tenders, History, Leaderboard, Config...

# V2 Gamification
GET    /api/{syncId}/rewards
POST   /api/{syncId}/rewards
PUT    /api/{syncId}/rewards/{id}
DELETE /api/{syncId}/rewards/{id}
GET    /api/{syncId}/projects
POST   /api/{syncId}/projects
PUT    /api/{syncId}/projects/{id}
DELETE /api/{syncId}/projects/{id}
POST   /api/{syncId}/projects/{id}/complete
```

## Phase 6: Vercel KV Integration ✅ COMPLETE

### 6.1 Database Operations ✅ COMPLETE
**Status**: All database functions implemented and integrated.

**Required Implementation:**
```typescript
// Summary of database service functions
async function getInstanceData(syncId: string): Promise<InstanceData>;
async function updateInstanceData(syncId: string, data: InstanceData): Promise<void>;

// CRUD operations for all data types (chores, tenders, rewards, projects)
async function createChore(syncId: string, chore: Chore): Promise<void>;
async function updateProject(syncId: string, projectId: string, updates: Partial<Project>): Promise<void>;

// Logic for completing tasks and awarding points
async function completeTend(syncId: string, choreId: string, tenderId: string): Promise<void>;
async function completeProject(syncId: string, projectId: string, tenderId: string): Promise<void>;

// Logic for checking achievements
async function checkRewardAchievements(syncId: string, instanceData: InstanceData): Promise<void>;
```

## Phase 7: Production Testing ✅ COMPLETE

### 7.1 End-to-End Testing ✅ COMPLETE
**Status**: Completed during development cycles.

**Completed Testing:**
- ✅ Frontend-backend integration testing for all features.
- ✅ All API endpoints verified for functionality.
- ✅ Data migration validated.
- ✅ PWA functionality tested on mobile.
- ✅ Error handling and edge cases checked manually.

### 7.2 Deployment Verification ✅ COMPLETE
**Status**: Deployed and verified on Vercel.

**Completed Verification:**
- ✅ Vercel deployment successful.
- ✅ Environment variables configured and working.
- ✅ KV database connected and responsive.
- ✅ CDN and caching operating as expected.

## Original Implementation History ✅ COMPLETE (Reference)

### 1.1 Project Renaming ✅ COMPLETE
**Status**: All tasks completed successfully

**Completed Tasks:**
- ✅ Updated package.json name from "shitty" to "kinobi"
- ✅ Replaced all UI text references from "Shitty" to "Kinobi"
- ✅ Updated page titles and meta tags
- ✅ Integrated kinobi_alpha.png logo in header
- ✅ Renamed database table from `shitty_instances` to `kinobi_instances`
- ✅ Updated all SQL queries and references
- ✅ Updated localStorage key to `kinobi_sync_id_valtown`

**Technical Implementation:**
```typescript
// Database table rename
CREATE TABLE IF NOT EXISTS kinobi_instances (
  sync_id TEXT PRIMARY KEY,
  tenders TEXT DEFAULT '[]',
  tending_log TEXT DEFAULT '[]',
  last_tended_timestamp INTEGER,
  last_tender TEXT,
  chores TEXT DEFAULT '[]',
  config TEXT,
  tender_scores TEXT
)

// Logo integration
<img src="/src/kinobi_alpha.png" alt="Kinobi" className="w-8 h-8" />
```

### 1.2 Core Type Extensions ✅ COMPLETE
**Status**: All interfaces and types implemented

**Completed Tasks:**
- ✅ Extended Chore interface with new fields
- ✅ Created ChoreConfig interface for global settings
- ✅ Added CountdownState interface for visual states
- ✅ Implemented TenderScore and LeaderboardEntry interfaces
- ✅ Updated all TypeScript definitions across codebase

**Technical Implementation:**
```typescript
interface Chore {
  id: string;
  name: string;
  icon: string;
  cycleDuration: number;        // Hours between completions
  points: number;              // Points awarded for completion
  lastCompleted?: number;       // Timestamp of last completion
  dueDate?: number;            // Calculated due date
}

interface ChoreConfig {
  defaultCycleDuration: number;  // Default 24 hours
  defaultPoints: number;         // Default points per chore (10)
  warningThreshold: number;      // When to show yellow (75%)
  urgentThreshold: number;       // When to show red (90%)
}

interface CountdownState {
  progress: number;              // 0-1 (0 = just done, 1 = overdue)
  status: 'good' | 'warning' | 'urgent' | 'overdue';
  timeRemaining: number;         // Hours remaining
}
```

### 1.3 Database Schema Migration ✅ COMPLETE
**Status**: Automatic migration system implemented

**Completed Tasks:**
- ✅ Created automatic database migration function
- ✅ Added config and tender_scores columns to existing tables
- ✅ Implemented chore migration with default values
- ✅ Tested migration with sample data
- ✅ Ensured backward compatibility

**Technical Implementation:**
```typescript
function migrateDatabase() {
  try {
    const checkConfigColumn = db.query("PRAGMA table_info(kinobi_instances)");
    const columns = checkConfigColumn.all() as any[];
    
    const hasConfig = columns.some(col => col.name === 'config');
    const hasTenderScores = columns.some(col => col.name === 'tender_scores');
    
    if (!hasConfig) {
      db.query("ALTER TABLE kinobi_instances ADD COLUMN config TEXT").run();
    }
    
    if (!hasTenderScores) {
      db.query("ALTER TABLE kinobi_instances ADD COLUMN tender_scores TEXT").run();
    }
  } catch (error) {
    console.warn("Database migration warning:", error);
  }
}

function migrateChore(chore: any): any {
  return {
    id: chore.id,
    name: chore.name,
    icon: chore.icon,
    cycleDuration: chore.cycleDuration || 24,
    points: chore.points || 10,
    lastCompleted: chore.lastCompleted || null,
    dueDate: chore.dueDate || null,
  };
}
```

## Phase 2: Time Cycle & Scoring Management ✅ COMPLETE

### 2.1 Admin Configuration UI ✅ COMPLETE
**Status**: Enhanced admin interface fully implemented

**Completed Tasks:**
- ✅ Enhanced ManageChoresComponent with cycle duration and points inputs
- ✅ Added validation for duration and points values (1-8760 hours, 1-1000 points)
- ✅ Updated chore creation/editing forms with new fields
- ✅ Display current cycle duration and points in chore list
- ✅ Added edit buttons for quick cycle duration and points changes
- ✅ Implemented proper form validation and error handling

**Technical Implementation:**
```typescript
// Enhanced chore creation form
<div className="flex gap-2">
  <div className="flex-1">
    <label className="block text-xs text-amber-700 mb-1">Cycle Duration (hours)</label>
    <input
      type="number"
      value={newCycleDuration}
      onChange={(e) => setNewCycleDuration(Math.max(1, parseInt(e.target.value) || 1))}
      placeholder="24"
      min="1"
      max="8760"
      className="w-full border border-amber-300 rounded px-2 py-1"
    />
  </div>
  <div className="flex-1">
    <label className="block text-xs text-amber-700 mb-1">Points</label>
    <input
      type="number"
      value={newPoints}
      onChange={(e) => setNewPoints(Math.max(1, parseInt(e.target.value) || 1))}
      placeholder="10"
      min="1"
      max="1000"
      className="w-full border border-amber-300 rounded px-2 py-1"
    />
  </div>
</div>

// Quick edit buttons
<button onClick={() => handleEditCycle(chore.id, chore.cycleDuration || 24)}>
  🕐 Cycle
</button>
<button onClick={() => handleEditPoints(chore.id, chore.points || 10)}>
  ⭐ Points
</button>
```

### 2.2 Backend Logic ✅ COMPLETE
**Status**: Complete backend implementation with scoring system

**Completed Tasks:**
- ✅ Implemented due date calculation service
- ✅ Created countdown state calculator with progress tracking
- ✅ Built comprehensive scoring system with automatic point allocation
- ✅ Added leaderboard calculation and ranking logic
- ✅ Enhanced all API endpoints to handle new data structures
- ✅ Implemented automatic score updates on chore completion

**Technical Implementation:**
```typescript
// Due date calculation on chore completion
const choreIndex = instanceData.chores.findIndex((c: any) => c.id === choreId);
if (choreIndex > -1) {
  instanceData.chores[choreIndex].lastCompleted = timestamp;
  // Calculate next due date
  const cycleDurationMs = instanceData.chores[choreIndex].cycleDuration * 60 * 60 * 1000;
  instanceData.chores[choreIndex].dueDate = timestamp + cycleDurationMs;
}

// Automatic scoring system
const tenderScore = instanceData.tender_scores.find((ts: any) => ts.name === tenderName);
if (!tenderScore) {
  const tenderId = instanceData.tenders.find((t: any) => t.name === tenderName)?.id || `tender_${Date.now()}`;
  tenderScore = {
    tenderId: tenderId,
    name: tenderName,
    totalPoints: 0,
    completionCount: 0,
    lastActivity: timestamp,
  };
  instanceData.tender_scores.push(tenderScore);
}

// Add points for this completion
const chorePoints = choreIndex > -1 ? instanceData.chores[choreIndex].points : 10;
tenderScore.totalPoints += chorePoints;
tenderScore.completionCount += 1;
tenderScore.lastActivity = timestamp;
```

### 2.3 API Endpoint Updates ✅ COMPLETE
**Status**: All new endpoints implemented and tested

**Completed Tasks:**
- ✅ Enhanced chore endpoints to include cycle duration and points
- ✅ Added configuration API endpoints (GET/PUT /api/:syncId/config)
- ✅ Implemented leaderboard API (/api/:syncId/leaderboard)
- ✅ Updated completion endpoints to recalculate due dates and scores
- ✅ Added proper error handling and validation

**Technical Implementation:**
```typescript
// Configuration API
else if (apiResource === "config") {
  let instanceData = await getInstanceData(syncId);
  
  if (req.method === "GET") {
    return new Response(JSON.stringify(instanceData.config), {
      headers: JSON_HEADERS,
    });
  } else if (req.method === "PUT") {
    const newConfig = await req.json();
    // Validate config fields
    if (typeof newConfig.defaultCycleDuration === 'number' && newConfig.defaultCycleDuration > 0 &&
        typeof newConfig.defaultPoints === 'number' && newConfig.defaultPoints > 0 &&
        typeof newConfig.warningThreshold === 'number' && newConfig.warningThreshold >= 0 && newConfig.warningThreshold <= 100 &&
        typeof newConfig.urgentThreshold === 'number' && newConfig.urgentThreshold >= 0 && newConfig.urgentThreshold <= 100) {
      instanceData.config = { ...instanceData.config, ...newConfig };
      await updateInstanceData(syncId, instanceData);
      return new Response(JSON.stringify(instanceData.config), {
        headers: JSON_HEADERS,
      });
    }
    return createErrorResponse("Invalid configuration values");
  }
}

// Leaderboard API
else if (apiResource === "leaderboard" && req.method === "GET") {
  let instanceData = await getInstanceData(syncId);
  
  // Calculate scores for each tender
  const leaderboard = instanceData.tenders.map((tender: any) => {
    const completions = instanceData.tending_log.filter((entry: any) => entry.person === tender.name);
    const totalPoints = completions.reduce((sum: number, entry: any) => {
      const chore = instanceData.chores.find((c: any) => c.id === entry.chore_id);
      return sum + (chore?.points || 10);
    }, 0);
    
    const lastActivity = completions.length > 0 
      ? Math.max(...completions.map((c: any) => c.timestamp))
      : 0;
    
    const recentCompletions = completions
      .sort((a: any, b: any) => b.timestamp - a.timestamp)
      .slice(0, 5);
    
    return {
      tender: tender,
      score: {
        tenderId: tender.id,
        name: tender.name,
        totalPoints: totalPoints,
        completionCount: completions.length,
        lastActivity: lastActivity,
      },
      rank: 0,
      recentCompletions: recentCompletions,
    };
  });
  
  // Sort by total points and assign ranks
  leaderboard.sort((a: any, b: any) => b.score.totalPoints - a.score.totalPoints);
  leaderboard.forEach((entry: any, index: number) => {
    entry.rank = index + 1;
  });
  
  return new Response(JSON.stringify(leaderboard), {
    headers: JSON_HEADERS,
  });
}
```

## Phase 3: Visual Countdown & Leaderboard System ✅ COMPLETE

### 3.1 Progress Indicator Component ✅ COMPLETE
**Status**: Complete visual countdown system implemented

**Completed Tasks:**
- ✅ Created SVG-based circular progress component (ProgressRing)
- ✅ Implemented smooth animations and color transitions
- ✅ Added responsive sizing and accessibility features
- ✅ Built color transition system (green → yellow → orange → red)
- ✅ Created TimeDisplay component with formatted output
- ✅ Added pulse animations for urgent/overdue states

**Technical Implementation:**
```typescript
// CountdownService - Core calculation logic
class CountdownService {
  static calculateCountdownState(chore: Chore, config: ChoreConfig): CountdownState {
    const now = Date.now();
    
    // If no last completion, show as good (new chore)
    if (!chore.lastCompleted || !chore.dueDate) {
      return {
        progress: 0,
        status: 'good',
        timeRemaining: chore.cycleDuration
      };
    }
    
    const timeSinceCompletion = now - chore.lastCompleted;
    const cycleDurationMs = chore.cycleDuration * 60 * 60 * 1000;
    const progress = timeSinceCompletion / cycleDurationMs;
    
    // Calculate hours remaining (can be negative if overdue)
    const timeRemainingMs = chore.dueDate - now;
    const timeRemainingHours = timeRemainingMs / (60 * 60 * 1000);
    
    let status: CountdownState['status'];
    if (progress >= 1) {
      status = 'overdue';
    } else if (progress >= (config.urgentThreshold / 100)) {
      status = 'urgent';
    } else if (progress >= (config.warningThreshold / 100)) {
      status = 'warning';
    } else {
      status = 'good';
    }
    
    return {
      progress: Math.max(0, progress),
      status,
      timeRemaining: timeRemainingHours
    };
  }
  
  static formatTimeRemaining(hours: number): string {
    if (hours < 0) {
      const overdue = Math.abs(hours);
      if (overdue < 1) return 'overdue';
      if (overdue < 24) return `${Math.round(overdue)}h overdue`;
      const days = Math.floor(overdue / 24);
      const remainingHours = Math.round(overdue % 24);
      if (remainingHours === 0) return `${days}d overdue`;
      return `${days}d ${remainingHours}h overdue`;
    }
    
    if (hours < 1) return 'due soon';
    if (hours < 24) return `${Math.round(hours)}h left`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    if (remainingHours === 0) return `${days}d left`;
    return `${days}d ${remainingHours}h left`;
  }
  
  static getStatusColor(status: CountdownState['status']): string {
    switch (status) {
      case 'good': return '#22c55e'; // green-500
      case 'warning': return '#eab308'; // yellow-500
      case 'urgent': return '#f97316'; // orange-500
      case 'overdue': return '#ef4444'; // red-500
      default: return '#22c55e';
    }
  }
}

// ProgressRing Component
function ProgressRing({ progress, status, size, strokeWidth = 4, children }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress * circumference);
  
  const color = CountdownService.getStatusColor(status);
  
  // Background circle color (light version)
  const bgColor = status === 'good' ? '#dcfce7' : 
                  status === 'warning' ? '#fef3c7' :
                  status === 'urgent' ? '#fed7aa' : '#fecaca';
  
  // Add pulse animation for urgent and overdue states
  const ringClasses = `transform -rotate-90 ${
    status === 'overdue' ? 'animate-pulse' : 
    status === 'urgent' ? 'animate-pulse' : ''
  }`;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className={ringClasses}>
        {/* Background circle */}
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={bgColor} strokeWidth={strokeWidth} fill="none" />
        {/* Progress circle */}
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none" 
                strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
        {/* Additional glow effect for overdue items */}
        {status === 'overdue' && (
          <circle cx={size / 2} cy={size / 2} r={radius + 2} stroke={color} strokeWidth={1} fill="none" opacity="0.3" className="animate-ping" />
        )}
      </svg>
      {/* Content in center */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// TimeDisplay Component
function TimeDisplay({ countdownState, format = 'compact' }: TimeDisplayProps) {
  const timeText = CountdownService.formatTimeRemaining(countdownState.timeRemaining);
  const color = CountdownService.getStatusColor(countdownState.status);
  
  if (format === 'compact') {
    return (
      <div className="text-xs font-medium text-center leading-tight" style={{ color }}>
        {timeText}
      </div>
    );
  }
  
  return (
    <div className="text-center">
      <div className="text-sm font-semibold" style={{ color }}>
        {timeText}
      </div>
      <div className="text-xs text-amber-600 capitalize">
        {countdownState.status}
      </div>
    </div>
  );
}
```

### 3.2 Main View Integration ✅ COMPLETE
**Status**: Enhanced chore tiles with countdown system

**Completed Tasks:**
- ✅ Integrated progress rings around chore icons
- ✅ Added countdown state styling and visual feedback
- ✅ Implemented hover states and interactions
- ✅ Added real-time updates with background tab optimization
- ✅ Ensured proper spacing and responsive layout
- ✅ Added performance optimizations for smooth animations

**Technical Implementation:**
```typescript
// Enhanced ShitPile Component
function ShitPile({ chore, config, onTended, animationIndex = 0 }) {
  const [countdownState, setCountdownState] = useState<CountdownState | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Calculate countdown state whenever chore data changes
  useEffect(() => {
    if (config) {
      const newCountdownState = CountdownService.calculateCountdownState(chore, config);
      setCountdownState(newCountdownState);
    }
  }, [chore, config, refreshKey]);

  // Set up refresh timer with background tab optimization
  useEffect(() => {
    let countdownRefreshInterval: NodeJS.Timeout | null = null;
    let dataRefreshInterval: NodeJS.Timeout | null = null;
    let isTabActive = !document.hidden;

    const startIntervals = () => {
      // Update countdown display every minute when tab is active
      countdownRefreshInterval = setInterval(() => {
        if (!document.hidden) {
          setRefreshKey(prev => prev + 1);
        }
      }, 60 * 1000);

      // Fetch fresh data every 5 minutes
      dataRefreshInterval = setInterval(() => {
        if (!document.hidden) {
          fetchLastTendedInternal();
        }
      }, 5 * 60 * 1000);
    };

    const stopIntervals = () => {
      if (countdownRefreshInterval) clearInterval(countdownRefreshInterval);
      if (dataRefreshInterval) clearInterval(dataRefreshInterval);
    };

    // Handle visibility change (tab becomes active/inactive)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isTabActive = false;
      } else {
        isTabActive = true;
        setRefreshKey(prev => prev + 1); // Immediate refresh
        fetchLastTendedInternal(); // Fetch fresh data
      }
    };

    startIntervals();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopIntervals();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncId, chore]);

  return (
    <div className="text-center flex flex-col items-center w-56">
      {/* Progress Ring with Chore Icon */}
      <div className="mb-4 relative">
        {countdownState ? (
          <ProgressRing
            progress={Math.min(countdownState.progress, 1)}
            status={countdownState.status}
            size={140}
            strokeWidth={6}
          >
            <div className={`text-7xl cursor-pointer ${getAnimationClass()} flex items-center justify-center transition-transform duration-200 hover:scale-105`}>
              {chore.icon}
            </div>
          </ProgressRing>
        ) : (
          <div className={`text-7xl cursor-pointer ${getAnimationClass()} transition-transform duration-200 hover:scale-105`}>
            {chore.icon}
          </div>
        )}
      </div>

      {/* Countdown Status and Time Display */}
      {countdownState && (
        <div key={refreshKey} className="mb-2">
          <TimeDisplay countdownState={countdownState} format="full" />
        </div>
      )}

      {/* Points indicator */}
      <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
        <span>⭐</span>
        <span>{chore.points} points</span>
        <span>•</span>
        <span>🔄 {chore.cycleDuration}h cycle</span>
      </div>
    </div>
  );
}
```

### 3.3 Leaderboard Component ✅ COMPLETE
**Status**: Advanced leaderboard with filtering and sorting

**Completed Tasks:**
- ✅ Created new LeaderboardView component
- ✅ Added navigation menu item between History and Settings
- ✅ Implemented filtering by time period (all, 7d, 30d)
- ✅ Added sorting options (points, completions, average)
- ✅ Created visual rank indicators (🥇🥈🥉)
- ✅ Added recent activity summaries
- ✅ Implemented responsive mobile layout

**Technical Implementation:**
```typescript
function LeaderboardComponent() {
  const [filterPeriod, setFilterPeriod] = useState<'all' | '7d' | '30d'>('all');
  const [sortBy, setSortBy] = useState<'points' | 'completions' | 'average'>('points');

  // Filter and sort leaderboard data
  const processedData = React.useMemo(() => {
    let filtered = [...leaderboardData];
    
    // Apply time period filter
    if (filterPeriod !== 'all') {
      const cutoffTime = Date.now() - (filterPeriod === '7d' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.map(entry => ({
        ...entry,
        recentCompletions: entry.recentCompletions.filter(completion => completion.timestamp > cutoffTime),
        score: {
          ...entry.score,
          totalPoints: entry.recentCompletions.filter(completion => completion.timestamp > cutoffTime).length * 10,
          completionCount: entry.recentCompletions.filter(completion => completion.timestamp > cutoffTime).length,
        }
      }));
    }
    
    // Sort by selected criteria
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'points':
          return b.score.totalPoints - a.score.totalPoints;
        case 'completions':
          return b.score.completionCount - a.score.completionCount;
        case 'average':
          const avgA = a.score.completionCount > 0 ? a.score.totalPoints / a.score.completionCount : 0;
          const avgB = b.score.completionCount > 0 ? b.score.totalPoints / b.score.completionCount : 0;
          return avgB - avgA;
        default:
          return b.score.totalPoints - a.score.totalPoints;
      }
    });
    
    // Reassign ranks
    filtered.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    return filtered;
  }, [leaderboardData, filterPeriod, sortBy]);

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg shadow-lg p-6 border-2 border-amber-200">
      <h2 className="text-3xl font-bold text-amber-800 mb-6 text-center">🏆 Leaderboard</h2>
      
      {/* Filter and Sort Controls */}
      <div className="flex flex-wrap gap-4 mb-6 justify-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-amber-700">Period:</label>
          <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value as 'all' | '7d' | '30d')}>
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-amber-700">Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'points' | 'completions' | 'average')}>
            <option value="points">Total Points</option>
            <option value="completions">Completions</option>
            <option value="average">Points per Completion</option>
          </select>
        </div>
      </div>
      
      {/* Leaderboard entries with visual indicators */}
      <div className="space-y-4">
        {processedData.map((entry, index) => {
          const pointsPerCompletion = entry.score.completionCount > 0 ? 
            (entry.score.totalPoints / entry.score.completionCount).toFixed(1) : '0.0';
          
          return (
            <div key={entry.tender.id} className={`bg-white rounded-lg p-4 shadow-md border-2 transition-all duration-200 hover:shadow-lg ${
              index === 0 ? 'border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50' :
              index === 1 ? 'border-gray-400 bg-gradient-to-r from-gray-50 to-gray-100' :
              index === 2 ? 'border-orange-400 bg-gradient-to-r from-orange-50 to-amber-50' :
              'border-gray-200 hover:border-amber-300'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`text-2xl font-bold flex items-center gap-2 ${
                    index === 0 ? 'text-yellow-600' :
                    index === 1 ? 'text-gray-600' :
                    index === 2 ? 'text-orange-600' :
                    'text-amber-600'
                  }`}>
                    {index === 0 && '🥇'}
                    {index === 1 && '🥈'}
                    {index === 2 && '🥉'}
                    {index > 2 && `#${entry.rank}`}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-amber-800 flex items-center gap-2">
                      {entry.tender.name}
                      {index < 3 && (
                        <span className="text-xs bg-amber-200 px-2 py-1 rounded-full">
                          Top Performer
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-amber-600">
                      <span>{entry.score.completionCount} completions</span>
                      <span>•</span>
                      <span>{pointsPerCompletion} pts/completion</span>
                      <span>•</span>
                      <span>Last active {new Date(entry.score.lastActivity).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-amber-700">{entry.score.totalPoints}</div>
                  <div className="text-sm text-amber-600">points</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

## Phase 4: Enhanced Features ⏳ PENDING

### 4.1 Advanced Admin Controls ⏳ PENDING
**Status**: Not yet implemented

**Planned Tasks:**
- [ ] Bulk operations for multiple chores
- [ ] Configuration import/export functionality
- [ ] Analytics dashboard with completion rates
- [ ] Points distribution charts
- [ ] Leaderboard trends over time

### 4.2 Telegram Bot Preparation ⏳ PENDING
**Status**: Not yet implemented

**Planned Tasks:**
- [ ] Bot API endpoints for webhook handling
- [ ] Authentication system for bot integration
- [ ] Notification triggers for urgent chores
- [ ] Bot command structure and response templates

## Phase 5: Production Deployment & Monitoring ✅ COMPLETE

### 5.1 Production Guardian System ✅ COMPLETE
**Status**: Fully implemented and tested

**Completed Tasks:**
- ✅ Created kinobi-keeper.sh production monitoring script
- ✅ Implemented automatic health checking and recovery
- ✅ Added process management with PID tracking
- ✅ Configured graceful shutdown handling
- ✅ Set up comprehensive logging system
- ✅ Tested auto-restart on failure scenarios

**Technical Implementation:**
```bash
# Production monitoring system
#!/bin/bash
# Kinobi Keeper - Production Server Guardian

KINOBI_PORT=3000
HEALTH_CHECK_INTERVAL=60
MAX_CONSECUTIVE_FAILURES=3
RESTART_DELAY=5

# Main monitoring loop with failure counting
consecutive_failures=0
while true; do
    if check_kinobi_health; then
        consecutive_failures=0
        echo "[$(date)] 💚 Kinobi healthy (port $KINOBI_PORT)"
    else
        consecutive_failures=$((consecutive_failures + 1))
        if [ $consecutive_failures -ge $MAX_CONSECUTIVE_FAILURES ]; then
            echo "[$(date)] 🔄 Maximum failures reached. Restarting Kinobi..."
            stop_kinobi && start_kinobi
        fi
    fi
    sleep $HEALTH_CHECK_INTERVAL
done
```

### 5.2 Enhanced Production Scripts ✅ COMPLETE
**Status**: Comprehensive script suite implemented

**Completed Tasks:**
- ✅ Enhanced package.json with production scripts
- ✅ Added health check commands
- ✅ Implemented port management utilities
- ✅ Created log monitoring commands
- ✅ Set up development and production modes
- ✅ Added process cleanup scripts

**Technical Implementation:**
```json
// Enhanced production scripts in package.json
{
  "scripts": {
    "production": "./kinobi-keeper.sh",
    "keeper": "./kinobi-keeper.sh",
    "health": "curl -f http://localhost:3000",
    "logs": "tail -f kinobi.log",
    "check-port": "lsof -ti:3000",
    "kill-port": "lsof -ti:3000 | xargs kill -9",
    "dev:monitor": "bun run dev:safe",
    "dev:safe": "auto-restart with monitoring",
    "start:safe": "production auto-restart"
  }
}
```

### 5.3 Documentation & Deployment ✅ COMPLETE
**Status**: Complete documentation and deployment readiness

**Completed Tasks:**
- ✅ Updated architecture documentation with production monitoring
- ✅ Added deployment guides for various platforms
- ✅ Documented health check endpoints and monitoring
- ✅ Created configuration examples and best practices
- ✅ Verified production compatibility across environments
- ✅ Prepared comprehensive migration instructions

**Technical Implementation:**
```typescript
// Health check endpoints
GET /api/app-version           // Application version
GET /                          // Basic connectivity
GET /api/:syncId/chores        // API functionality

// Production configuration
interface ProductionConfig {
  port: number;                // 3000
  healthCheckInterval: number; // 60 seconds
  maxFailures: number;        // 3 consecutive
  restartDelay: number;       // 5 seconds
  logFile: string;           // kinobi.log
  pidFile: string;           // kinobi.pid
}
```

## Success Criteria ✅ ACHIEVED

### Core Functionality ✅ COMPLETE
- ✅ **Time Cycle Management**: Configurable cycles (1-8760 hours) per chore
- ✅ **Visual Countdown**: Color-coded progress rings with smooth animations
- ✅ **Point Scoring**: Automatic point allocation and tracking
- ✅ **Leaderboard System**: Real-time rankings with filtering and sorting
- ✅ **Database Migration**: Seamless upgrade of existing data
- ✅ **Performance Optimization**: Background tab detection and efficient updates

### User Experience ✅ COMPLETE
- ✅ **Intuitive Interface**: Clear visual indicators and status feedback
- ✅ **Responsive Design**: Works across all device sizes
- ✅ **Accessibility**: ARIA labels and high contrast colors
- ✅ **Real-time Updates**: Minute-by-minute countdown updates
- ✅ **Smooth Animations**: Professional visual effects and transitions

### Technical Quality ✅ COMPLETE
- ✅ **Type Safety**: 100% TypeScript coverage for all new features
- ✅ **API Design**: RESTful endpoints with proper error handling
- ✅ **Performance**: Optimized with background tab detection
- ✅ **Security**: Input validation and XSS protection
- ✅ **Maintainability**: Clean code structure and documentation

## Risk Mitigation ✅ RESOLVED

### Database Migration ✅ RESOLVED
- **Risk**: Complex migration of existing data
- **Mitigation**: ✅ Implemented automatic migration system with backward compatibility
- **Result**: Seamless upgrade with no data loss

### Performance Impact ✅ RESOLVED
- **Risk**: Real-time updates affecting performance
- **Mitigation**: ✅ Background tab optimization and efficient re-rendering
- **Result**: Smooth performance even with multiple countdown timers

### Color Accessibility ✅ RESOLVED
- **Risk**: Color transitions not meeting accessibility standards
- **Mitigation**: ✅ High contrast colors and ARIA labels
- **Result**: Accessible design with proper contrast ratios

## Current Status Summary

**🎉 PHASE 5 COMPLETE - PRODUCTION DEPLOYMENT READY**

The Kinobi transformation is now fully complete with all features implemented and production-ready:

- ✅ **Complete Rebranding**: From Shitty to Kinobi with logo integration
- ✅ **Time Cycle System**: Configurable cycles with automatic due date calculation
- ✅ **Visual Countdown**: Color-coded progress rings with smooth animations
- ✅ **Point Scoring**: Automatic tracking with leaderboard rankings
- ✅ **Enhanced Admin UI**: Easy configuration of cycles and points
- ✅ **Performance Optimization**: Background tab detection and efficient updates
- ✅ **Database Migration**: Seamless upgrade of existing data
- ✅ **Accessibility**: ARIA labels and high contrast colors
- ✅ **Production Monitoring**: Kinobi Keeper with automatic recovery
- ✅ **Health Checks**: Comprehensive monitoring and status reporting
- ✅ **Production Scripts**: Complete deployment and management suite

**🚀 PRODUCTION READY:**
- ✅ **Immediate Deployment**: Ready for live production use
- ✅ **Self-Monitoring**: Automatic health checks and recovery
- ✅ **Reliable Operation**: Proven stability and error handling
- ✅ **Complete Documentation**: Architecture, deployment, and operations guides
- ✅ **Multi-Environment Support**: Development, staging, and production modes

**🎯 DEPLOYMENT COMMANDS:**
```bash
# Production deployment with monitoring
bun run production

# Development with auto-restart
bun run dev:monitor

# Health monitoring
bun run health && bun run logs
```

The application is now a sophisticated, production-ready chore tracking system with enterprise-grade monitoring, automatic recovery, and comprehensive operational tooling - ready for immediate household deployment and long-term reliable operation. 

---
---

# Kinobi V2 Enhancements ✅ COMPLETE
*This plan outlines the implementation of dynamic notifications, gamification, and UI enhancements.*

## Phase 8: Notification and Nudging System ✅ COMPLETE

### 8.1 From Cron to External Scheduler ✅ COMPLETE
**Status**: Backend endpoint is live and ready.

**Completed Tasks:**
- ✅ `/api/cron/update-statuses.ts` serverless function created and deployed.
- ✅ Endpoint secured with `CRON_SECRET`.
- ✅ Ready for an external scheduling service (e.g., cron-job.org) to be configured to send a `POST` request to the production URL every 5-10 minutes.

### 8.2 Dynamic Notification Logic ✅ COMPLETE
**Status**: Core notification logic implemented.

**Completed Tasks:**
- ✅ Status updater compares new `CountdownState` with stored status in `kinobi:{syncId}:chore_statuses`.
- ✅ Telegram notification is triggered on status change.
- ✅ Message library implemented to provide varied, "cheeky" messages.
- ✅ `/tend` and `/projects/{id}/complete` endpoints trigger immediate celebratory notifications.
- ✅ Status updater includes logic for sending periodic leaderboard summaries.

## Phase 9: Gamification Engine ✅ COMPLETE

### 9.1 Core Data Model Extensions ✅ COMPLETE
**Status**: All new interfaces and config options implemented.

**Completed Tasks:**
- ✅ Added `pointsEnabled: boolean` to the `ChoreConfig` interface.
- ✅ Created and integrated the `Reward` interface.
- ✅ Created and integrated the `Project` interface.
- ✅ Added `rewards: Reward[]` and `projects: Project[]` arrays to the `KVInstanceData` structure.

**Technical Implementation:**
```typescript
interface ChoreConfig {
  // ... existing fields
  pointsEnabled: boolean;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  type: 'individual' | 'collective';
  pointThreshold: number;
  isAchieved: boolean;
  achievedBy?: string;
  achievedAt?: number;
}

interface Project {
  id:string;
  name: string;
  description: string;
  points: number;
  status: 'todo' | 'in_progress' | 'done';
  completedBy?: string;
  completedAt?: number;
}
```

### 9.2 New API Endpoints ✅ COMPLETE
**Status**: All gamification endpoints implemented.

**Implemented Endpoints:**
```
# Rewards
GET    /api/{syncId}/rewards
POST   /api/{syncId}/rewards
PUT    /api/{syncId}/rewards/{id}
DELETE /api/{syncId}/rewards/{id}

# Projects
GET    /api/{syncId}/projects
POST   /api/{syncId}/projects
PUT    /api/{syncId}/projects/{id}
DELETE /api/{syncId}/projects/{id}
POST   /api/{syncId}/projects/{id}/complete
```

### 9.3 Backend Logic for Gamification ✅ COMPLETE
**Status**: Core logic for points and rewards is live.

**Implementation Details:**
- **Points Toggle:** All point-awarding actions (`/tend`, project completion) and score calculations (leaderboard) respect the `instance.config.pointsEnabled` flag.
- **Project Completion:** The `/projects/{id}/complete` endpoint correctly awards points, updates project status, and triggers a celebratory notification.
- **Reward Achievement:** A `checkRewardAchievements` function is called after any score change. It checks both `individual` and `collective` rewards and triggers a "Prize Unlocked!" notification upon success.

## Phase 10: UI/UX Refinement ✅ COMPLETE

### 10.1 Settings & Chore Management Redesign ✅ COMPLETE
**Status**: All frontend components have been refactored.

**Completed Tasks:**
- ✅ Added a toggle switch for "Enable Points & Leaderboard" in `SyncSettingsView`.
- ✅ Refactored `ManageChoresComponent` to use a "sleek," mobile-friendly modal (`ChoreEditModal`) for editing chores, replacing the old `prompt()`-based system.
- ✅ Ensured all new inputs have proper validation.

### 10.2 New UI Views for Gamification ✅ COMPLETE
**Status**: All new frontend views are live.

**Completed Tasks:**
- ✅ Created and implemented a fully functional `RewardsView` component.
- ✅ Created and implemented a fully functional `ProjectsView` component.
- ✅ Added "Rewards" and "Projects" to the main navigation bar. The Leaderboard link is now conditionally rendered based on `config.pointsEnabled`. 