# Kinobi Implementation Task List - Vercel Edition ✅ COMPLETE

## Migration Status: SQLite → Vercel KV 🚀 ✅ COMPLETE
All migration, implementation, and refinement tasks are complete. The application is fully functional on Vercel with a complete Telegram Bot integration.

---

## Core Migration & API Tasks ✅ COMPLETE

### Phase 1: Vercel Platform Migration ✅ COMPLETE
- [x] **React Application Port**: Complete frontend application migration.
- [x] **Build System Migration**: Vercel-optimized build process.
- [x] **Vercel KV Schema**: Key-value storage structure design.
- [x] **Data Migration Strategy**: SQLite to KV transformation plan.
- [x] **Migration Script Development**: Data transfer utility created.
- [x] **Deployment Configuration**: Vercel setup for serverless deployment.
- [x] **Package Dependencies**: Vercel-optimized dependency management.
- [x] **Project Structure**: Organized for Vercel deployment.
- [x] **Environment Setup**: Vercel platform integration.

### Phase 2: Backend API Implementation ✅ COMPLETE
- [x] **Main API Handler**: Serverless function `api/[...slug].ts` created and fully implemented.
- [x] **API Endpoint Implementation**: All CRUD operations for chores, tenders, history, and config are complete.
- [x] **Database Integration**: All endpoints are fully integrated with Vercel KV for data operations.

---

## Telegram Bot Implementation Tasks ✅ COMPLETE

### Phase 3: Bot Infrastructure & Configuration ✅ COMPLETE
- [x] **Setup & Configuration**
    - [x] Created a new bot on Telegram using `BotFather`.
    - [x] Added `TELEGRAM_BOT_TOKEN` and `CRON_SECRET` as secret environment variables.
    - [x] Created the webhook handler: `api/telegram.ts`.
    - [x] Created the `scripts/set-telegram-webhook.ts` utility.
- [x] **API & Data Model**
    - [x] Updated the `Config` interface to include `telegramChatId` and `telegramUserId`.
    - [x] Updated API endpoints to manage the new config fields.
    - [x] Implemented logic to add new `syncId`s to the global `kinobi:all_sync_ids` set.
- [x] **Frontend UI**
    - [x] Created and integrated the `TelegramSettingsComponent`.
    - [x] Implemented UI for setting Channel ID and generating/entering linking tokens.

### Phase 4: Bot Interactive Features ✅ COMPLETE
- [x] **User-to-SyncID Mapping**
    - [x] Implemented a secure, token-based account linking system.
    - [x] Created temporary (`kinobi:token:{token}`) and permanent (`kinobi:telegram_user:{userId}`) keys for reliable and efficient lookups.
- [x] **Bot Command Logic (`api/telegram.ts`)**
    - [x] Implemented command handlers for `/log`, `/start`, and `/help`.
    - [x] Built a multi-step interactive flow for logging chores using inline keyboards.
    - [x] Ensured the bot only responds to commands in channels, not all messages.

### Phase 5: Bot Automated Reminders ✅ COMPLETE
- [x] **Cron Job Setup**
    - [x] Created the cron job handler: `api/cron/check-chores.ts`.
    - [x] Secured the endpoint using `CRON_SECRET`.
    - [x] Configured a daily schedule in `vercel.json`.
- [x] **Reminder Logic (`api/cron/check-chores.ts`)**
    - [x] Implemented logic to iterate through all instances.
    - [x] Implemented status-change detection using `kinobi:{syncId}:chore_statuses` to prevent duplicate notifications.
    - [x] Implemented logic to send a message to the configured channel when a chore becomes overdue.

---

## Final Refinement & Polishing ✅ COMPLETE

### Phase 6: Debugging & Hardening ✅ COMPLETE
- [x] Fixed Vercel Hobby plan cron schedule conflict.
- [x] Hardened account linking and user lookup logic against race conditions.
- [x] Fixed callback data parsing errors by changing the separator.
- [x] Resolved `CRON_SECRET` authorization issues.
- [x] Prevented the bot from replying to non-command messages in channels.

### Phase 7: Frontend Polishing ✅ COMPLETE
- [x] Adjusted CSS to center chore tiles correctly on mobile devices.
- [x] Improved the page's scrolling behavior by implementing a sticky header.

---
All tasks are completed. The project is production-ready.

---

## V2 Enhancements - Scoping ⏳ PENDING

This section outlines the next wave of features to transform Kinobi into a more dynamic and interactive platform.

### Phase 8: Notification System Overhaul ⏳ PENDING
- [ ] **Setup External Scheduler**: Configure an external service (e.g., Inngest) to trigger the `api/cron/update-statuses` endpoint every 5-10 minutes.
- [ ] **Create Status Updater Endpoint**: Create and deploy the `api/cron/update-statuses.ts` serverless function.
- [ ] **Multi-Status Detection**: Implement logic to detect transitions between all chore statuses (e.g., `good` -> `warning`, `warning` -> `urgent`).
- [ ] **"Cheeky" Notifications**: Create a library of varied and engaging notification messages for each status transition.
- [ ] **Celebration & Leaderboard Posts**: Implement instant notifications for chore/project completions and scheduled leaderboard updates via the Telegram bot.

### Phase 9: Gamification Engine ⏳ PENDING
- [ ] **Toggleable Points**: Add a `pointsEnabled` flag to the global config and integrate it across the UI and backend logic.
- [ ] **Rewards Data Model**: Define the `Reward` interface and add `rewards: Reward[]` to the main instance data.
- [ ] **Rewards API**: Create CRUD endpoints for managing rewards (`/api/{syncId}/rewards`).
- [ ] **Rewards UI**: Develop a new `RewardsView` to allow users to create, manage, and track progress towards prizes.
- [ ] **Project Data Model**: Define the `Project` interface for special one-off tasks and add `projects: Project[]` to instance data.
- [ ] **Project API**: Create CRUD endpoints for managing projects (`/api/{syncId}/projects`).
- [ ] **Project UI**: Develop a `ProjectsView` to create, assign, and complete special projects.
- [ ] **Achievement Logic**: Update the backend to check for and award prizes when point thresholds are met.

### Phase 10: UI/UX Refinement ⏳ PENDING
- [ ] **Chore Settings Redesign**: Refactor the `ManageChoresComponent` to be more "sleek" and mobile-friendly, using modals or inline editing.
- [ ] **New Navigation**: Add links to the new `RewardsView` and `ProjectsView` in the main application layout.
- [ ] **Integrate Points Toggle**: Add a UI switch in the settings to enable or disable the points and leaderboard system.