# Kinobi Vercel Setup Guide

## 🚀 Quick Setup

### 1. Environment Variables

Create a `.env.local` file in the project root with your Vercel KV credentials:

```bash
# Get these from your Vercel KV dashboard
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_kv_rest_api_token
KV_REST_API_READ_ONLY_TOKEN=your_kv_rest_api_read_only_token
```

### 2. Vercel KV Database Setup

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Create a new KV database:
   - Click "Storage" in the sidebar
   - Click "Create Database"  
   - Select "KV (Redis)" and choose a region
   - Name it `kinobi-kv` or similar
3. Copy the environment variables from the KV dashboard to your `.env.local`

### 3. Local Development

```bash
# Install dependencies
npm install

# Start local development server
npm run dev
# or 
vercel dev
```

### 4. Deploy to Production

```bash
# Build and deploy
./deploy.sh

# Or manually:
npm run build
vercel --prod
```

### 5. Configure Production Environment Variables

In your Vercel project settings:
1. Go to Settings > Environment Variables
2. Add the same KV variables from your `.env.local`
3. Make sure they're available for "Production" environment

## 🔄 Data Migration

If you have existing Kinobi data in SQLite:

```bash
# Install sqlite3 for migration
npm install sqlite3

# Set your KV environment variables
export KV_REST_API_URL="your_url"
export KV_REST_API_TOKEN="your_token"

# Run migration
npm run migrate path/to/your/kinobi.db
```

## 🧪 Testing

Test your API endpoints:

```bash
# Test app version
curl http://localhost:3000/api/app-version

# Test with a sync ID (will create default data)
curl http://localhost:3000/api/test_sync_123/chores
```

## ✅ Verification Checklist

- [ ] Vercel KV database created
- [ ] Environment variables configured (local and production)
- [ ] `npm run build` succeeds
- [ ] Local development works (`vercel dev`)
- [ ] Production deployment succeeds
- [ ] API endpoints respond correctly
- [ ] Frontend can connect to backend
- [ ] Data migration completed (if applicable)

## 🐛 Troubleshooting

### "KV connection failed"
- Verify your environment variables are correct
- Check that your KV database is active in Vercel dashboard
- Ensure you're using the correct region

### "Build fails"
- Run `npm install` to ensure all dependencies are installed
- Check for TypeScript errors in your terminal
- Verify Node.js version is 18+

### "API returns 404"
- Check that `api/[...slug].ts` exists and is properly formatted
- Verify your `vercel.json` configuration
- Check Vercel function logs in the dashboard

## 📞 Support

- Check the [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- Review [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- Open an issue in the project repository 