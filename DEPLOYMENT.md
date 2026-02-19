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

1. **Check DNS Configuration**: Ensure your deployment platform has DNS configured
2. **Use IPv4 Mode**: The app forces IPv4 DNS resolution to avoid IPv6 issues
3. **Supabase Connection Pooling**: Consider using Supabase connection pooling endpoint:
   - Instead of: `db.xxx.supabase.co`
   - Use: `aws-0-us-east-1.pooler.supabase.com` (check your Supabase dashboard for the correct pooler URL)
   - Set port to `6543` for pooler mode

4. **Test DNS from Container**: Run this in your deployment platform's shell:
   ```bash
   nslookup db.wlxtmrdpggfbbwussiqj.supabase.co
   ```

5. **Platform-Specific Configuration**:
   - **Render/Railway**: Should work out of the box
   - **Fly.io**: May need IPv6 configuration
   - **DigitalOcean/AWS**: Check security group/firewall rules

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
