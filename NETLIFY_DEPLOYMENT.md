# Netlify Deployment Guide for GroupSpark Voice Notes Translator

## Prerequisites

1. **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
2. **Built Frontend**: The production build is ready in the `client/dist` folder

## Deployment Steps

### Method 1: Manual Deploy (Drag & Drop)

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" → "Deploy manually"
3. Drag and drop the entire `client/dist` folder
4. Your site will be deployed with a random URL

### Method 2: Git-based Deploy (Recommended)

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to Netlify Dashboard
3. Click "Add new site" → "Import an existing project"
4. Connect your Git provider and select the repository
5. Configure build settings:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `client/dist`

## Environment Variables

Set up these environment variables in Netlify Dashboard:

1. Go to **Site Settings** → **Environment Variables**
2. Add the following variables:

```
GEMINI_API_KEY=your_gemini_api_key_here
GROUPSPARK_API_URL=https://your-backend-domain.com
NODE_VERSION=18
```

## Post-Deployment Configuration

### Custom Domain (Optional)

1. Go to **Site Settings** → **Domain Management**
2. Click "Add custom domain"
3. Follow DNS configuration instructions

### HTTPS & Security

The Netlify configuration includes security headers:
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy for microphone access

### Backend Integration

Make sure your backend (GroupSpark API) is deployed and accessible:

1. **Update GROUPSPARK_API_URL**: Point to your backend server URL
2. **CORS Configuration**: Ensure your backend allows requests from your Netlify domain
3. **Supabase Configuration**: Verify Supabase settings are correct

## File Structure

```
client/
├── dist/                    # Built files (auto-generated)
│   ├── index.html
│   ├── assets/
│   └── manifest.json
├── netlify.toml            # Netlify configuration
├── vite.config.ts          # Build configuration
└── package.json
```

## Netlify Configuration Features

- **SPA Routing**: All routes redirect to index.html
- **Asset Caching**: Static assets cached for 1 year
- **Service Worker**: No-cache policy for proper PWA updates
- **Build Optimization**: Optimized for production performance

## Troubleshooting

### Build Fails
- Check that Node version is 18 in environment variables
- Verify all dependencies are in package.json
- Check build logs for specific errors

### Environment Variables Not Working
- Ensure variables are set in Netlify dashboard, not just .env files
- Variables must be prefixed correctly in your code

### API Calls Fail
- Verify GROUPSPARK_API_URL is correct
- Check CORS settings on your backend
- Ensure backend is deployed and accessible

## Monitoring

- **Analytics**: Enable Netlify Analytics in site settings
- **Functions**: Monitor serverless function usage if used
- **Form Handling**: Configure form submissions if needed

## Updating the Site

### For Git-based deployments:
- Push changes to your repository
- Netlify automatically rebuilds and deploys

### For manual deployments:
- Run `npm run build` in the client folder
- Drag and drop the new `dist` folder to Netlify

---

Your GroupSpark Voice Notes Translator PWA is now ready for production on Netlify! 🚀