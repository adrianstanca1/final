# 🚀 ASAgents Platform - Production Deployment Guide

## 📋 **Pre-Deployment Checklist**

### **✅ Environment Setup**
- [ ] Production environment variables configured
- [ ] Database credentials secured
- [ ] API keys and OAuth secrets updated
- [ ] SSL certificates obtained
- [ ] Domain names configured

### **✅ Code Preparation**
- [ ] All code committed and pushed to repository
- [ ] Production build tested locally
- [ ] All tests passing
- [ ] Security vulnerabilities addressed
- [ ] Performance optimizations applied

### **✅ Infrastructure Ready**
- [ ] Database server provisioned
- [ ] Application servers configured
- [ ] CDN setup (if applicable)
- [ ] Monitoring tools configured
- [ ] Backup systems in place

## 🔧 **Step 1: Environment Configuration**

### **Frontend Environment (.env.production)**
```bash
# Copy and update the production environment file
cp .env.production .env.local

# Update the following variables:
VITE_API_URL=https://your-backend-domain.com/api
VITE_GEMINI_API_KEY=your-actual-gemini-key
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

### **Backend Environment (server/.env.production)**
```bash
# Copy and update the backend production environment
cd server
cp .env.production .env

# Update critical variables:
DB_HOST=your-database-host
DB_USER=your-database-username
DB_PASSWORD=your-secure-password
JWT_SECRET=your-super-secure-jwt-secret
SESSION_SECRET=your-super-secure-session-secret
```

## 🗄️ **Step 2: Database Migration**

### **Automated Setup (Recommended)**
```bash
# Run the automated production setup
npm run setup:production
```

### **Manual Setup**
```bash
# 1. Create database
mysql -h your-host -u your-user -p
CREATE DATABASE asagents_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 2. Run migrations
cd server
mysql -h your-host -u your-user -p asagents_production < migrations/001_enhanced_schema.sql

# 3. Verify setup
node scripts/production-setup.js
```

## 🚀 **Step 3: Deployment Options**

### **Option A: Automated Deployment (Recommended)**

#### **Deploy to Vercel + Railway**
```bash
# Install CLI tools
npm install -g vercel @railway/cli

# Deploy both frontend and backend
npm run deploy:full
```

#### **Deploy Frontend Only (Vercel)**
```bash
npm run deploy:vercel
```

#### **Deploy Backend Only (Railway)**
```bash
npm run deploy:railway
```

### **Option B: Manual Deployment**

#### **Frontend Deployment (Vercel)**
```bash
# 1. Build for production
npm run build:production

# 2. Deploy to Vercel
vercel --prod

# 3. Set environment variables in Vercel dashboard
# - VITE_API_URL
# - VITE_GEMINI_API_KEY
# - VITE_GOOGLE_CLIENT_ID
```

#### **Backend Deployment (Railway)**
```bash
# 1. Navigate to backend
cd server

# 2. Deploy to Railway
railway up

# 3. Set environment variables in Railway dashboard
# - All variables from .env.production
```

### **Option C: Custom Server Deployment**

#### **Using PM2 (Process Manager)**
```bash
# 1. Install PM2 globally
npm install -g pm2

# 2. Build applications
npm run build:production
cd server && npm run build

# 3. Start with PM2
pm2 start ecosystem.config.js --env production

# 4. Save PM2 configuration
pm2 save
pm2 startup
```

#### **Using Docker**
```bash
# 1. Build Docker images
docker build -t asagents-frontend .
docker build -t asagents-backend ./server

# 2. Run containers
docker run -d -p 80:80 asagents-frontend
docker run -d -p 4000:4000 asagents-backend
```

## 🧪 **Step 4: Testing & Verification**

### **Automated Testing**
```bash
# Run comprehensive production tests
npm run test:production
```

### **Manual Testing Checklist**
- [ ] **Frontend Loading**: Visit your domain and verify the app loads
- [ ] **API Connectivity**: Check network tab for successful API calls
- [ ] **Authentication**: Test login with Google/GitHub OAuth
- [ ] **Multimodal Upload**: Test file upload and AI processing
- [ ] **Database Operations**: Test CRUD operations
- [ ] **Performance**: Check page load times and responsiveness

### **Health Checks**
```bash
# Check API health
curl https://your-backend-domain.com/api/system/health

# Check frontend availability
curl https://your-frontend-domain.com

# Monitor logs
# Vercel: Check function logs in dashboard
# Railway: Check deployment logs in dashboard
```

## 📊 **Step 5: Monitoring & Maintenance**

### **Performance Monitoring**
- **Frontend**: Use Vercel Analytics or Google Analytics
- **Backend**: Monitor Railway metrics or custom monitoring
- **Database**: Set up database performance monitoring
- **Uptime**: Use services like UptimeRobot or Pingdom

### **Error Tracking**
- **Sentry**: Configure error reporting for both frontend and backend
- **Logs**: Set up centralized logging (e.g., LogRocket, DataDog)
- **Alerts**: Configure alerts for critical errors

### **Security Monitoring**
- **SSL Certificates**: Monitor expiration dates
- **Dependencies**: Regular security audits with `npm audit`
- **Access Logs**: Monitor for suspicious activity
- **Backup Verification**: Regular backup testing

## 🔄 **Step 6: Continuous Deployment**

### **GitHub Actions (Recommended)**
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run build:production
      - run: npm run deploy:production
```

### **Manual Deployment Process**
1. **Code Changes**: Make changes in development branch
2. **Testing**: Run tests locally and in staging
3. **Merge**: Merge to main branch
4. **Deploy**: Run deployment script
5. **Verify**: Test production deployment
6. **Monitor**: Watch for any issues

## 🆘 **Troubleshooting**

### **Common Issues**

#### **Build Failures**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build:production
```

#### **Database Connection Issues**
```bash
# Test database connectivity
cd server
node -e "
const mysql = require('mysql2/promise');
mysql.createConnection({
  host: 'your-host',
  user: 'your-user',
  password: 'your-password',
  database: 'your-database'
}).then(() => console.log('Connected!')).catch(console.error);
"
```

#### **Environment Variable Issues**
```bash
# Verify environment variables are loaded
node -e "console.log(process.env.VITE_API_URL)"
```

### **Rollback Procedure**
```bash
# 1. Identify last working deployment
git log --oneline

# 2. Revert to previous version
git revert <commit-hash>

# 3. Redeploy
npm run deploy:production

# 4. Verify rollback successful
npm run test:production
```

## 📞 **Support & Resources**

### **Documentation**
- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Vite Production Guide](https://vitejs.dev/guide/build.html)

### **Monitoring Dashboards**
- **Vercel**: https://vercel.com/dashboard
- **Railway**: https://railway.app/dashboard
- **Database**: Your database provider's dashboard

### **Emergency Contacts**
- **Technical Lead**: [Your contact information]
- **DevOps Team**: [Team contact information]
- **Database Admin**: [DBA contact information]

---

## 🎉 **Deployment Complete!**

Your ASAgents platform is now live in production! 

**Next Steps:**
1. Monitor the application for the first 24 hours
2. Set up automated backups
3. Configure monitoring alerts
4. Plan regular maintenance windows
5. Document any custom configurations

**Remember**: Always test changes in a staging environment before deploying to production!
