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

Set these **encrypted** environment variables in App Platform:

### Required Production Variables

```bash
# Server Configuration
NODE_ENV=production
PORT=8080

# Database (Use your Atlas connection string)
MONGODB_URI=mongodb+srv://mlscdb:microsoft2025db@random.4ygdtjf.mongodb.net/?retryWrites=true&w=majority&appName=random

# Session Security (Use your generated secret)
SESSION_SECRET=02cd5e505b1dc12381babd68b20b284bf8931f4e41a40a9cc0328556ed714d74928584ded3c86fb1e589e4716b658414
SESSION_COOKIE_SECURE=true

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=mscdb@thapar.edu
SMTP_PASS=qdxyejcfhdxjovkm
MAIL_FROM=MLSC <mscdb@thapar.edu>

# Google Sheets (Use base64 from prepare-app-platform.js)
GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=eyJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsInByb2plY3RfaWQiOiAibWxzY3JlZyIsInByaXZhdGVfa2V5X2lkIjogImZiMzk2YWE2MmRlYjA2M2IwZWM3MmY2MzA0NWI5NzAyY2I5NTQ4MzgiLCJwcml2YXRlX2tleSI6ICItLS0tLUJFR0lOIFBSSVZBVEUgS0VZLS0tLS1cbk1JSUV2d0lCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktrd2dnU2xBZ0VBQW9JQkFRRGpwM2x3aE9YOEsrRmNcbmdYM2NkcGp4cWVRcis0ZHowR3dsS0RBOFd0MjJHQmdIZ3RxQmxCVzV1aUlHZVd0eUZ4enk4TnVUUkJLYllVT0lcbjhnbVh4bVVtT2JZMXZVUURFTnh0Z1cwLzY3RHFiazd1V0NweHBPcFQybGcyaUZJU0xYU0dFcURGWkJ4ZDlxNitcblpJRXpPMTBlQ1pxVlJjbXdDY1c3SkxoM0lwM0hlQ1ZmVHljM296MU11NHVvVmo4aitIbjNqNldHRVJqWC91eTlcbkg1Y2dvV1hBWU9oU0VLTG03WDhVaWlmV2NoVVV1WTF6WmlhTEZvbHBYbUJDdXZlLzA3dGJvT09Ec01CM3Q0eVRcbkdabVdPYlJVYmt0ZFV2QmxJU3VxUk1ERWphTlVFTktXQS9XVUFTVDBHT3hVY2lRS05XVE5CT2pqSFhnd0hCSjJcbisrblRYd0pMQWdNQkFBRUNnZ0VBVDNhNThRaXlycDh5ZnZQRVZ4d2VydHc2aFErN2JEV29TaUFKRmtneGM4cGRcbk9PSDRHNXJ4S205S1NUQkF6UVk4V0tDeVJHbFNoV0lpREw5UGtlYnlqN0U5Wk95M3ZNbzU1dzl5YndsNks1cHRcbmVzelRvKytJeTlRL1RtbXZIQ0U1dDBMeFUzVnFZWElsOU5kb01kWGEzdzFESkMvRUF1cW1Wbml1MndiK1JBMkhcbmtKNHFnbjR3cVQwc1FFRkVjaGNMVkpaUmlTMEpsQTQ3ZUg5RXAxYldMeVpMUjhyRVJZVWgyQlQvS1FNVmFWMnlcbkU1ZjlreVNvS3h3Rkh3aTl5ZHZ6cXhabHhtV2E0ekovbE80SVN2cjk5cXlTcFFjZ1RhN1dYNXdWTE9uQ1QzMk9cbm1aai9TVklRN212bkdrbkYrYmhCMnZPYmU0MTRhdDk2eHFWS0U2TitBUUtCZ1FEMC9XY2NONFlwdjFuWTBoZzRcbmswcHVXc1RTVWMyUGJFOGZLTlFQUkkxY2VCbHAreHAyb2txUkU0UzcyZDNlV1N4bjlPTHpJbmFPSzVNVzJYM3pcbmJ1OENWZDJOVmhiK2RRYlMzeHRNcHcwbEs2cC84QWRZYWpENzE3VHVWcjBwZTkwdUxKaHFDTXNBcjN4ZWNGQ1dcbjdWMytNbHhrMW94YndUQXZtWDhlZHlqQlFRS0JnUUR0NHFBcHlrRjZiSmcwRFVpcjRlTENweDAxeHpFeXFGZkNcblp4azBRZ0p0WlNWbTBOUWJoZ1VEUUx0a1pqSFhteWNqUGRuN3U2NGlYZTZPdHdRR05qSDNlazJPS3ZkdXZnSWVcblNzZzJpcGwxQ3pGY0lNWi9oOUUxeXhxSXNXc2tHL2w0dTRVandjNnJSSm9xTGVRTE4wVjZXbjhWTGl4WmgvSDBcbm5NSmtrdVVVaXdLQmdRQzBmcTJrNEZOOEZucC9mK3BRWkZRR0VlSElnblJNSXFQNGRRQW5iMzRtam1WSzY3R0hcbmpmSWFDS05XTXlGL1czdVg2NWY1UVg3UEo5TnFsanB4UzEzVC9xY0lKbEV5ajgzRE5wVEtXSmthdFowY1BSOXNcblNIQm1XM24xenZuMndrY21hYnl4QW1GdDA5eHhSNVpZVy9GUUFwS0h5SG9JYjhDc2tRNVN4Ny9EQVFLQmdRREFcblVoQWF1U0htMEJUZFFFQVlkaTdXSURWRlhSMHhUMWhrR3VZTmtiQlVzUWxqN2tFTlgzUitCTDk3bEFPSHhEQUlcbkZlRTkyNllVc3N4REpVTmpvajBUVHhXVWNyaElGK1d1aDljR0FWZS9nS1VQVHBBc1dxbVJTL3JQdUdCZWVSOWZcbnRIc1hSWURJaGxYODg4MENKRlZQYmdxQUhTeE4xZEtQYUl6Z3NzSHhzUUtCZ1FEcURlMlFqdVpWcDc5OGwrbVRcbmVOa2tMNkw5Z2lWNThiN2hOKzcwYXVwaVF2bXFuQU5FYVhuNEgwZjVOMGMxdDdtOEhqb0wwem1NUXZlcTZadDJcbnpPSjM0M0VNbENWN0psSVhacW5Cd1Y2U2lWYStyL0EreERrNGhoOFErdTJMZjdzbzN3OHFZSnFxTkFDTG9xYWpcbmdPUUpHa3hua3V0cmJGaFV3YW9hK1Y0K2tRPT1cbi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS1cbiIsImNsaWVudF9lbWFpbCI6ICJzaGVldC13cml0ZXJAbWxzY3JlZy5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsImNsaWVudF9pZCI6ICIxMTU3NjM4MjY3ODE0OTYxMTI5ODIiLCJhdXRoX3VyaSI6ICJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20vby9vYXV0aDIvYXV0aCIsInRva2VuX3VyaSI6ICJodHRwczovL29hdXRoMi5nb29nbGVhcGlzLmNvbS90b2tlbiIsImF1dGhfcHJvdmlkZXJfeDUwOV9jZXJ0X3VybCI6ICJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9vYXV0aDIvdjEvY2VydHMiLCJjbGllbnRfeDUwOV9jZXJ0X3VybCI6ICJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9yb2JvdC92MS9tZXRhZGF0YS94NTA5L3NoZWV0LXdyaXRlciU0MG1sc2NyZWcuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLCJ1bml2ZXJzZV9kb21haW4iOiAiZ29vZ2xlYXBpcy5jb20ifQ==
GOOGLE_SHEETS_ID=1KlPVQhBgnKBYEodhk_rZLaMt5K5PLqSLKXXO0M0bp9Q

# Application Configuration
DISCORD_INVITE=https://discord.gg/TwYQhUQAw6
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
- Ensure your Google Sheets is shared with: `sheet-writer@mlscreg.iam.gserviceaccount.com`
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

- [x] All credentials rotated from GitHub exposure
- [x] Environment variables encrypted in App Platform
- [x] MongoDB Atlas IP allowlist configured
- [x] HTTPS enabled via App Platform
- [x] Session secrets using secure random values
- [x] Google service account has minimal permissions

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