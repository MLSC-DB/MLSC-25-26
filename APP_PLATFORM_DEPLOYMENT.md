# DigitalOcean App Platform Deployment Guide

This guide walks you through deploying the MLSC Registration app to DigitalOcean App Platform.

## Prerequisites

✅ **Completed Setup:**

- [x] MongoDB Atlas cluster configured and tested
- [x] Rotated all credentials (Gmail SMTP + Google Service Account)
- [x] Repository pushed to GitHub with latest changes
- [x] Base64 service account generated

## Step 1: Create App Platform Application

1. **Login to DigitalOcean Console**

   - Go to [DigitalOcean Console](https://cloud.digitalocean.com/)
   - Navigate to **Apps** → **Create App**

2. **Connect GitHub Repository**

   - Choose **GitHub** as source
   - Select repository: `MLSC-DB/MLSC-25-26`
   - Branch: `main`
   - Autodeploy: ✅ **Enabled**

3. **Configure Service**
   - **Service Name**: `web`
   - **Source Directory**: `/` (root)
   - **Build Command**: `npm install && npm run build:css`
   - **Run Command**: `npm start`
   - **HTTP Port**: `8080` (App Platform default)
   - **Instance Size**: `Basic ($12/month)` or `Pro ($24/month)`
   - **Instance Count**: `1`

## Step 2: Configure Environment Variables

⚠️ **SECURITY WARNING**: Never include actual credential values in documentation!

Set these **encrypted** environment variables in App Platform:

### Required Production Variables

```bash
# Server Configuration
NODE_ENV=production
PORT=8080

# Database (Use your Atlas connection string - DO NOT COMMIT ACTUAL VALUES)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Session Security (Generate a new secure random key)
SESSION_SECRET=your-generated-session-secret-here
SESSION_COOKIE_SECURE=true

# Email Configuration (Use your rotated SMTP credentials)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@domain.com
SMTP_PASS=your-new-app-password
MAIL_FROM=Your App Name <your-email@domain.com>

# Google Sheets (Use base64 from prepare-app-platform.js)
GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=your-base64-encoded-service-account-json
GOOGLE_SHEETS_ID=your-google-sheets-id

# Application Configuration
DISCORD_INVITE=https://discord.gg/your-invite-code
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-admin-password-change-me-in-production
```

## Step 3: Configure Health Checks

In App Platform settings:

- **Health Check Path**: `/healthz`
- **Port**: `8080`
- **Initial Delay**: `60 seconds`
- **Period**: `30 seconds`
- **Timeout**: `10 seconds`
- **Failure Threshold**: `3`

## Step 4: Configure Custom Domain (Optional)

1. **Add Domain**: `registration.mlsc.com` (or your domain)
2. **SSL Certificate**: Auto-managed by App Platform
3. **Update DNS**: Point your domain to App Platform endpoint

## Step 5: Deploy and Monitor

1. **Deploy**: Click "Create Resources" - deployment takes 5-10 minutes
2. **Monitor Logs**: Check deployment logs for any issues
3. **Test Endpoints**:
   - `https://your-app-url.ondigitaloceanspaces.com/`
   - `https://your-app-url.ondigitaloceanspaces.com/healthz`
   - `https://your-app-url.ondigitaloceanspaces.com/health/email`

## Step 6: Post-Deployment Configuration

### MongoDB Atlas Network Access

1. Go to MongoDB Atlas → Network Access
2. Add App Platform's outbound IP addresses
3. Or use `0.0.0.0/0` (allow all) temporarily for testing

### Google Sheets Permissions

- Ensure your Google Sheets is shared with your service account email
- Grant "Editor" permissions

### Test Registration Flow

1. Visit your app URL
2. Try registering a team
3. Check MongoDB Atlas for new registrations
4. Verify Google Sheets integration
5. Test email confirmations

## Troubleshooting

### Common Issues

**Deployment Fails:**

- Check build logs for npm install errors
- Verify package.json scripts
- Check Node.js version compatibility

**App Crashes:**

- Check environment variables are set correctly
- Monitor application logs in App Platform
- Test database connectivity

**Email Not Working:**

- Verify SMTP credentials
- Check `/health/email` endpoint
- Review Gmail security settings

**Google Sheets Integration Fails:**

- Verify service account permissions
- Check base64 encoding of credentials
- Ensure sheets ID is correct

### Useful Commands for Local Testing

```bash
# Test MongoDB connection
npm run test:mongodb

# Test email functionality
npm run test:email

# Check health endpoints locally
curl http://localhost:3000/healthz
curl http://localhost:3000/health/email
```

## Security Checklist

- [x] All credentials rotated after GitHub exposure
- [x] Environment variables encrypted in App Platform
- [x] MongoDB Atlas IP allowlist configured
- [x] HTTPS enabled via App Platform
- [x] Session secrets using secure random values
- [x] Google service account has minimal permissions
- [x] No credentials committed to version control

## Cost Estimate

**DigitalOcean App Platform:**

- Basic ($12/month) - 512MB RAM, 1 vCPU
- Pro ($24/month) - 1GB RAM, 1 vCPU

**MongoDB Atlas:**

- M0 Free Tier - 512MB storage (suitable for development)
- M2 ($9/month) - 2GB storage (recommended for production)

**Total Monthly Cost: $12-33/month**

---

## Next Steps After Deployment

1. **Monitor Application**: Set up alerts for downtime
2. **Backup Strategy**: Configure automated MongoDB backups
3. **Domain Setup**: Configure custom domain with SSL
4. **Performance**: Monitor response times and optimize
5. **Scaling**: Configure auto-scaling rules if needed

## Security Incident Response

If credentials are ever exposed:

1. **Immediately rotate** all affected credentials
2. **Update** App Platform environment variables
3. **Monitor** for unauthorized access
4. **Review** git history for sensitive data
5. **Consider** using GitHub's secret scanning alerts
