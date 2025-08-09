# Netlify Setup Guide

## 🎉 Your GitHub Repository is Ready!
**Repository**: https://github.com/mikeA911/groupspark-voice-translator

## Step-by-Step Netlify Deployment

### 1. Connect to Netlify
1. Go to [netlify.com](https://netlify.com) and log in (or sign up)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **"GitHub"** as your Git provider
4. Authorize Netlify to access your GitHub account if prompted

### 2. Select Repository
1. Find and click **"groupspark-voice-translator"** from your repository list
2. If you don't see it, click **"Configure Netlify on GitHub"** to grant access

### 3. Configure Build Settings
Set these **exact** settings:

```
Owner: mikeA911
Branch to deploy: main
Base directory: client
Build command: npm run build
Publish directory: client/dist
```

**Important**: Make sure "Base directory" is set to `client` - this tells Netlify to build from the client folder.

### 4. Add Environment Variables
Before deploying, click **"Advanced build settings"** and add these environment variables:

```
GEMINI_API_KEY = your_gemini_api_key_here
GROUPSPARK_API_URL = https://your-backend-domain.com
NODE_VERSION = 18
```

⚠️ **Note**: You'll need to deploy your backend first or use a placeholder URL for now.

### 5. Deploy
1. Click **"Deploy site"**
2. Netlify will automatically build and deploy your site
3. You'll get a random URL like `https://wonderful-name-123456.netlify.app`

## Post-Deployment Steps

### Custom Domain (Optional)
1. In Netlify dashboard → **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Follow DNS configuration instructions

### Environment Variables Update
1. Go to **Site settings** → **Environment variables**
2. Add/update variables as needed:
   - Update `GROUPSPARK_API_URL` when backend is ready
   - Add production API keys

### Automatic Deployments
✅ Every time you push to the `main` branch, Netlify will automatically rebuild and deploy!

## Troubleshooting

### Build Fails
- Check build logs in Netlify dashboard
- Verify `NODE_VERSION = 18` is set
- Ensure `client/package.json` has all dependencies

### Site Loads but API Fails
- Check `GROUPSPARK_API_URL` environment variable
- Verify backend is deployed and accessible
- Check browser console for CORS errors

### Environment Variables Not Working
- Variables must be set in Netlify dashboard (not just .env files)
- Redeploy after adding variables
- Check variable names match your code exactly

## Your Deployment Configuration

The following files ensure optimal deployment:

### `client/netlify.toml`
- ✅ SPA routing configuration
- ✅ Security headers
- ✅ Asset caching rules
- ✅ Service worker handling

### `client/vite.config.ts`
- ✅ Environment variable injection
- ✅ Build optimization
- ✅ Production asset handling

## Next Steps After Deployment

1. **Test the deployment** - Visit your Netlify URL
2. **Deploy your backend** - Get GROUPSPARK_API_URL ready  
3. **Update environment variables** - Add production values
4. **Set up custom domain** - Optional but recommended
5. **Monitor performance** - Use Netlify Analytics

---

🚀 **Your GroupSpark Voice Notes Translator is ready for production!**