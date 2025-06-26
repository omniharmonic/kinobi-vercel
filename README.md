# Kinobi Vercel Edition

> **Smart chore tracker with time cycles, point scoring, and leaderboards - Now on Vercel!**

This is the Vercel-optimized version of Kinobi that uses Vercel KV for data storage instead of SQLite, making it perfect for serverless deployment.

## 🚀 Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/kinobi-vercel)

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel KV Database**: Create a KV database in your Vercel dashboard
3. **Node.js 18+**: For local development

## 🛠️ Setup Instructions

### 1. Environment Variables

In your Vercel project settings, add these environment variables:

```bash
# Vercel KV (get these from your Vercel KV dashboard)
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_kv_rest_api_token
KV_REST_API_READ_ONLY_TOKEN=your_kv_rest_api_read_only_token
```

### 2. Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### 3. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## 📊 Migrating from SQLite Version

If you're migrating from the original Kinobi (SQLite version), use the migration script:

### Step 1: Prepare Migration

```bash
# In the kinobi-vercel directory
npm install sqlite3

# Copy your existing database
cp ../kinobi.db ./
```

### Step 2: Update Migration Script

Edit `migrate-data.js` and replace `MockKV` calls with real Vercel KV:

```javascript
// Replace MockKV with actual Vercel KV
import { kv } from '@vercel/kv';

class RealKV {
  static async set(key, value) {
    return await kv.set(key, value);
  }
  
  static async get(key) {
    return await kv.get(key);
  }
}
```

### Step 3: Run Migration

```bash
# Set your KV environment variables
export KV_REST_API_URL="your_url"
export KV_REST_API_TOKEN="your_token"

# Run migration
node migrate-data.js kinobi.db
```

### Step 4: Verify Migration

1. Deploy to Vercel
2. Visit your Vercel URL
3. Use your existing sync codes - all data should be there!

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **React Router** for navigation  
- **Tailwind CSS** for styling
- **PWA** support with service worker

### Backend
- **Vercel Serverless Functions** (Node.js)
- **Vercel KV** for data storage (Redis-compatible)
- **RESTful API** matching original Kinobi

### Data Storage
- **Vercel KV**: Replaces SQLite for serverless compatibility
- **Same data structure**: Full compatibility with existing sync codes
- **Automatic migration**: Handles schema updates seamlessly

## 📁 Project Structure

```
kinobi-vercel/
├── api/
│   └── [...slug].ts          # Main API handler (serverless function)
├── public/
│   ├── index.html            # Main HTML file
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service worker
│   └── kinobi_alpha.gif      # Logo
├── src/
│   └── main.tsx              # React client application
├── package.json              # Dependencies and scripts
├── vercel.json               # Vercel configuration
├── tsconfig.json             # TypeScript configuration
├── build-client.js           # Build script
├── migrate-data.js           # Data migration utility
└── README.md                 # This file
```

## 🔄 API Endpoints

All original Kinobi endpoints are supported:

```
GET    /api/app-version                    # App version
GET    /api/{syncId}/chores                # Get chores
POST   /api/{syncId}/chores                # Create chore
PUT    /api/{syncId}/chores/{id}           # Update chore
DELETE /api/{syncId}/chores/{id}           # Delete chore
GET    /api/{syncId}/tenders               # Get tenders
POST   /api/{syncId}/tenders               # Create tender
PUT    /api/{syncId}/tenders/{id}          # Update tender
DELETE /api/{syncId}/tenders/{id}          # Delete tender
POST   /api/{syncId}/tend                  # Complete chore
GET    /api/{syncId}/history               # Get history
DELETE /api/{syncId}/history/{id}          # Delete history entry
GET    /api/{syncId}/leaderboard           # Get leaderboard
GET    /api/{syncId}/config                # Get configuration
PUT    /api/{syncId}/config                # Update configuration
```

## 🎯 Features

✅ **Complete Feature Parity** with original Kinobi
- Time-cycle aware chore tracking (1-8760 hours)
- Visual countdown indicators with color coding
- Point scoring system with leaderboards
- Real-time updates with background optimization
- Drag-and-drop chore management
- PWA support for mobile installation

✅ **Vercel Optimizations**
- Serverless functions for infinite scalability
- Vercel KV for fast, reliable data storage
- Edge-optimized deployment
- Automatic HTTPS and CDN
- Zero-config deployment

✅ **Data Compatibility**
- Same sync codes work across versions
- Seamless migration from SQLite
- No data loss during transition
- All existing features preserved

## 🚀 Performance Benefits

### Vercel vs. Self-Hosted
- **🌍 Global CDN**: Faster loading worldwide
- **⚡ Serverless**: Instant scaling, no server maintenance
- **💾 KV Storage**: Sub-millisecond data access
- **🔒 Built-in Security**: HTTPS, DDoS protection
- **💰 Cost Effective**: Pay only for usage

### Production Ready
- **99.99% Uptime**: Vercel's reliability guarantee
- **Auto-scaling**: Handles traffic spikes automatically
- **Monitoring**: Built-in analytics and error tracking
- **Backups**: Automatic data replication

## 🔧 Customization

### Environment Configuration
```bash
# Optional: Customize app behavior
KINOBI_DEFAULT_CYCLE_HOURS=24
KINOBI_DEFAULT_POINTS=10
KINOBI_WARNING_THRESHOLD=75
KINOBI_URGENT_THRESHOLD=90
```

### Theming
Modify `public/index.html` to customize:
- Color schemes
- Fonts
- Animations
- PWA settings

## 🐛 Troubleshooting

### Common Issues

**Q: Migration script fails**
A: Ensure KV environment variables are set and the SQLite file exists

**Q: API returns 500 errors**
A: Check Vercel function logs and KV configuration

**Q: Frontend doesn't load**
A: Verify build succeeded and check browser console

**Q: Sync codes don't work**
A: Confirm migration completed and data exists in KV

### Getting Help

1. Check Vercel function logs
2. Test API endpoints manually
3. Verify KV data in Vercel dashboard
4. Review browser developer tools

## 📚 Learn More

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Original Kinobi](../README.md)

## 🎉 Success!

Once deployed, your Kinobi will be available at:
```
https://your-project-name.vercel.app
```

Share your sync codes and enjoy your serverless chore tracking! 🏠✨ 