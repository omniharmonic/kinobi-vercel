#!/bin/bash

echo "🚀 Kinobi Vercel Deployment Script"
echo "=================================="

# Build the application
echo "📦 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix build errors before deploying."
    exit 1
fi

echo "✅ Build successful!"

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
    echo "🎉 Deployment successful!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Set up your Vercel KV database in the Vercel dashboard"
    echo "2. Configure environment variables:"
    echo "   - KV_REST_API_URL"
    echo "   - KV_REST_API_TOKEN" 
    echo "   - KV_REST_API_READ_ONLY_TOKEN"
    echo "3. Test your deployment"
    echo "4. Run data migration if needed: npm run migrate path/to/kinobi.db"
    echo ""
    echo "🔗 Your app should be live at your Vercel URL!"
else
    echo "❌ Deployment failed! Check the error messages above."
    exit 1
fi 