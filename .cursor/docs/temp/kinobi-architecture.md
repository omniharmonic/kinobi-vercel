# Kinobi Architecture Document
*System architecture for enhanced chore tracking with Telegram integration - Vercel Edition*

## System Overview

Kinobi is a sophisticated time-cycle-aware chore tracking system with visual countdown indicators, running on Vercel's serverless platform. This Vercel edition uses Vercel KV for scalable, zero-configuration data storage and is fully integrated with a Telegram bot for notifications and remote interaction.

## Core Architecture

### Deployment Platform
```
Vercel Serverless Platform
├── Frontend: React SPA (Static Site)
├── Backend: Serverless Functions (Node.js/TypeScript)
├── Database: Vercel KV (Redis-compatible)
├── Cron Jobs: Scheduled function execution
├── CDN: Vercel Edge Network
└── Domain: Automatic HTTPS + Custom domains
```

### Frontend Architecture (React/TypeScript) ✅ COMPLETE
The frontend is a single-page application built with React and TypeScript, providing a rich, interactive user experience.

- **`src/main.tsx`**: The core application entry point containing all UI components and routing logic.
- **Key Components**:
    - `KinobiLayout`: The main application shell with a sticky header and navigation.
    - `KinobiView`: The primary dashboard displaying all `ChoreTile` components.
    - `ChoreTile`: An individual chore's visual representation, including the `ProgressRing`.
    - `TenderSelectionModal`: Modal for logging chore completion.
    - `LeaderboardView`: Displays rankings with filtering and sorting.
    - `RewardsView`, `ProjectsView`: UI for managing new gamification features.
    - `SyncSettingsView`: Container for all configuration components, including the redesigned `ManageChoresComponent`.
    - `TelegramSettingsComponent`: UI for configuring Telegram integration and generating linking tokens.

### Backend Architecture (Vercel Serverless) ✅ COMPLETE

The backend consists of serverless functions that handle API requests, cron jobs, and Telegram webhooks.

- **`/api/app/[...slug].ts`**: The main API handler responsible for all CRUD operations related to chores, tenders, projects, rewards, history, and configuration. It serves as the backbone for the web application.
- **`/api/telegram.ts`**: The Telegram webhook handler. It processes all incoming messages, commands (`/start`, `/log`, `/help`), and callback queries from the Telegram bot, enabling interactive chore logging.
- **`/api/cron/update-statuses.ts`**: A high-frequency endpoint intended to be called by an external scheduler (e.g., cron-job.org). It iterates through all user instances, checks for chore status transitions (`good` -> `warning`, etc.), and sends notifications to the configured Telegram channel. This endpoint is secured with a `CRON_SECRET`.

### Database Architecture: Vercel KV ✅ COMPLETE

The application leverages Vercel's KV store (Redis-compatible) for all data persistence.

- **`kinobi:{syncId}`**: The primary key for each user's instance data, storing chores, tenders, history, and configuration in a single JSON object.
- **`kinobi:all_sync_ids`**: A Redis Set containing all known `syncId`s, used by the cron job to discover which instances to check.
- **`kinobi:token:{token}`**: A temporary (10-minute expiry) key used for securely linking a Telegram account to a Kinobi instance. It maps a one-time token to a `syncId`.
- **`kinobi:telegram_user:{userId}`**: A permanent key that maps a Telegram user ID to their corresponding `syncId`, enabling fast and reliable user lookups for bot commands.
- **`kinobi:{syncId}:chore_statuses`**: A key storing the last known status of each chore for an instance, used to prevent duplicate "overdue" notifications.

## Telegram Bot Integration Architecture ✅ COMPLETE

The Telegram integration allows for seamless interaction with Kinobi from outside the web app.

```mermaid
graph TD
    subgraph "Telegram Platform"
        User(Telegram User) -- Interacts with --> Bot(Kinobi Telegram Bot)
    end

    subgraph "Vercel Platform"
        Webhook[API: /api/telegram.ts]
        StatusUpdater[API: /api/cron/update-statuses.ts]
        CoreAPI[API: /api/app/[...slug].ts]
        KV(Vercel KV Store)
        Frontend(Kinobi React App)
    end
    
    subgraph "External Services"
        Scheduler[External Scheduler e.g., Inngest]
    end
    
    AdminUser[Admin User] -- Configures --> Frontend
    Frontend -- Manages Chores, Projects, Rewards --> CoreAPI

    Bot -- Webhooks (Commands, Callbacks) --> Webhook
    Webhook -- Responds to --> Bot
    Webhook -- Uses --> CoreAPI
    
    CoreAPI -- Reads/Writes Chores, Projects, Rewards --> KV
    CoreAPI -- Triggers Celebration Notification --> Bot

    Scheduler -- Triggers Frequently --> StatusUpdater
    StatusUpdater -- Reads data via --> CoreAPI
    StatusUpdater -- Sends Status Change & Leaderboard Alerts --> Bot
```

### Key Data Flows:

1.  **Account Linking**:
    -   User generates a 6-digit code in the **Frontend**.
    -   The **Core API** creates a temporary `kinobi:token:{token}` -> `syncId` mapping in **KV**.
    -   User sends the code to the **Bot**.
    -   The **Webhook** handler looks up the token, finds the `syncId`, and creates a permanent `kinobi:telegram_user:{userId}` -> `syncId` mapping in **KV**.

2.  **Interactive Chore Logging**:
    -   User sends `/log` to the **Bot**.
    -   The **Webhook** handler uses the permanent mapping to find the user's `syncId`, fetches data via the **Core API**, and presents interactive keyboards.
    -   The final selection is logged via the **Core API**.

3.  **Real-Time Status Notifications**:
    -   An **External Scheduler** triggers `api/cron/update-statuses.ts` frequently (e.g., every 5-10 minutes).
    -   The function iterates through all users, calculates chore statuses, and compares them to the last known statuses stored in **KV**.
    -   If a chore's status has changed, a "cheeky" notification is sent via the **Bot** to the user's configured channel.

This architecture provides a robust, scalable, and feature-rich chore tracking system with deep Telegram integration, all running on a modern serverless platform.

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

**✅ READY FOR PRODUCTION**

### Completed Implementation:
- ✅ Complete frontend application with all features, including V2 enhancements.
- ✅ Full backend API implementation with Vercel KV integration for all data models.
- ✅ PWA support for mobile installation.
- ✅ Vercel deployment configuration.
- ✅ Data migration strategy and script.
- ✅ Performance optimizations and responsive design.
- ✅ Real-time notification endpoint ready for external scheduling.
- ✅ End-to-end functionality has been tested during development.

### Immediate Next Steps (Required for Full V2 Functionality):
- 🟡 **Activate Notification System**: Configure an external scheduling service (e.g., cron-job.org, Inngest) to send a `POST` request to the `/api/cron/update-statuses` endpoint every 5-10 minutes. **This is required to make the V2 notification system operational.**
- 🚀 **Final Deployment & Live Monitoring**: Monitor the live application for any issues under real-world usage.

## V2 Architecture Enhancements 🟡 PENDING DEPLOYMENT

The following enhancements transform Kinobi from a simple chore tracker into a dynamic and interactive household management system. They introduce event-driven notifications, gamification through rewards, and flexible task management with special projects. The backend and frontend code is complete, but the notification system requires external configuration to become fully operational.

### Notification System: From CRON to Real-Time Nudging 🟡 PENDING DEPLOYMENT

To provide more immediate feedback, the notification system will be upgraded from a single daily cron job to a more frequent, intelligent monitoring system.

**The Challenge of Serverless Scheduling:** A truly "event-driven" system for time-based status changes (e.g., a chore becoming `urgent`) in a serverless environment is challenging. Vercel's built-in CRON jobs are limited to once per day on the Hobby plan, which is insufficient for real-time nudging. Relying on user activity to trigger checks is unreliable, as notifications would only be sent when someone is actively using the app.

**The Solution: External Scheduling Service:** To solve this reliably without upgrading to a paid Vercel plan, we will integrate a dedicated external scheduler like [Inngest](https://www.inngest.com/) or [Trigger.dev](https://trigger.dev/). These services provide generous free tiers and are purpose-built for triggering serverless functions on a reliable, high-frequency schedule. The external service must be configured to call a Vercel endpoint every 5-10 minutes.

This approach provides a robust, near real-time user experience using best-practice serverless architecture. It also supports other notification-based features:
- **Celebration Posts:** Instant notifications when a chore or project is completed (triggered directly by the API).
- **Leaderboard Updates:** Scheduled summaries of player rankings (triggered by the external scheduler).

### Gamification Engine: Points, Projects, and Prizes ✅ COMPLETE

To boost engagement, we will introduce a configurable gamification engine.

-   **Toggleable Points System:** The core points system can be enabled or disabled globally.
-   **Special Projects:** A new data type for one-off tasks with custom point values, distinct from recurring chores. This allows for flexible, ad-hoc task assignment.
-   **Rewards & Prizes:** A system for defining prizes based on performance. This creates clear goals for users to strive for.
    -   **Individual Prizes:** Awarded when a single user reaches a specific point threshold.
    -   **Collective Prizes:** Awarded when the entire group's combined score reaches a target.

### Architectural Impact ✅ COMPLETE

These changes have introduced new data models within the `kinobi:{syncId}` KV store object and required new API endpoints. The core data flow for notifications has been significantly enhanced.

```mermaid
graph TD
    subgraph "Telegram Platform"
        User(Telegram User) -- Interacts with --> Bot(Kinobi Telegram Bot)
    end

    subgraph "Vercel Platform"
        Webhook[API: /api/telegram.ts]
        StatusUpdater[API: /api/cron/update-statuses.ts]
        CoreAPI[API: /api/app/[...slug].ts]
        KV(Vercel KV Store)
        Frontend(Kinobi React App)
    end
    
    subgraph "External Services"
        Scheduler[External Scheduler e.g., Inngest]
    end
    
    AdminUser[Admin User] -- Configures --> Frontend
    Frontend -- Manages Chores, Projects, Rewards --> CoreAPI

    Bot -- Webhooks (Commands, Callbacks) --> Webhook
    Webhook -- Responds to --> Bot
    Webhook -- Uses --> CoreAPI
    
    CoreAPI -- Reads/Writes Chores, Projects, Rewards --> KV
    CoreAPI -- Triggers Celebration Notification --> Bot

    Scheduler -- Triggers Frequently --> StatusUpdater
    StatusUpdater -- Reads data via --> CoreAPI
    StatusUpdater -- Sends Status Change & Leaderboard Alerts --> Bot
```

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