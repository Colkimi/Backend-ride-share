# Deployment Guide

## Required Environment Variables

Make sure these environment variables are set in your deployment platform:

### Critical Settings
```bash
NODE_ENV=production           # Enables SSL for database and other production settings
DB_SSL=true                   # Required for Supabase connections
```

### Database Connection
```bash
DB_HOST=db.wlxtmrdpggfbbwussiqj.supabase.co
DB_NAME=postgres
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_PORT=5432
```

### Application Settings
```bash
FRONTEND_URL=https://rideshare.geniushackers.guru
CORS_ORIGIN=https://rideshare.geniushackers.guru
JWT_ACCESS_TOKEN_SECRET=your_access_token_secret
JWT_REFRESH_TOKEN_SECRET=your_refresh_token_secret
```

## DNS Resolution Issues

If you encounter `ENOTFOUND` errors for the database hostname:

### Primary Solution: Use Supabase Connection Pooler
The connection pooler bypasses many DNS issues:

1. **Get your pooler URL from Supabase**:
   - Go to your Supabase project → Settings → Database
   - Look for "Connection Pooling" section
   - Copy the connection string (host will be like `aws-0-us-east-1.pooler.supabase.com`)

2. **Update your environment variables**:
   ```bash
   DB_HOST=aws-0-us-east-1.pooler.supabase.com  # Your pooler host
   DB_PORT=6543                                    # Pooler port (not 5432)
   DB_NAME=postgres
   DB_USERNAME=postgres.your-project-ref          # Note: May include project ref
   DB_PASSWORD=your_password
   DB_SSL=true
   NODE_ENV=production
   ```

### Alternative Solutions

1. **Check DNS Configuration**: Ensure your deployment platform has DNS configured
   - The app attempts to use Google DNS (8.8.8.8) and Cloudflare DNS (1.1.1.1)
   - Check logs for "Resolved X to Y.Y.Y.Y" messages

2. **Use Direct IP (Not Recommended)**: If you can resolve the IP locally:
   ```bash
   # On your local machine:
   nslookup db.wlxtmrdpggfbbwussiqj.supabase.co
   
   # Then set DB_HOST to the resolved IP:
   DB_HOST=54.xxx.xxx.xxx
   ```
   
3. **Platform-Specific Issues**:
   - **Render.com**: Usually works out of the box
   - **Railway.app**: Check network settings in project settings
   - **Fly.io**: May require IPv6 configuration or use Supabase pooler
   - **DigitalOcean/AWS**: Check security groups allow outbound connections
   - **Docker-based platforms**: Ensure container has network access

4. **Test DNS from Container**: Run this in your deployment platform's shell:
   ```bash
   nslookup db.wlxtmrdpggfbbwussiqj.supabase.co
   ```

## Troubleshooting

### Database Connection Fails
1. Verify `NODE_ENV=production` is set
2. Verify `DB_SSL=true` is set
3. Check if your deployment platform allows outbound connections on port 5432
4. Try using Supabase's connection pooler (port 6543)

### SSL Issues
If you see SSL-related errors, ensure:
- `DB_SSL=true` is set in environment variables
- Supabase instance allows SSL connections (should be default)

### IPv6 Issues
The app includes IPv4-forcing logic, but if issues persist:
- Use Supabase's IPv4 endpoint if available
- Check if your platform supports IPv4 outbound connections
