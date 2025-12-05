# NearCheck Plus - Setup & Installation Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or modern web browser
- Firebase project (free tier available)
- Git

### 1. Clone Repository
```bash
git clone https://github.com/EldrexDelosReyesBula/NearCheck-Plus.git
cd NearCheck-Plus
```

### 2. Setup Environment Variables
```bash
# Copy example configuration
cp .env.example .env

# Edit .env with your actual secrets
nano .env  # or use your preferred editor
```

### 3. Configure Firebase
```env
# In .env file:
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

### 4. Verify Setup
```bash
# Check .env is in .gitignore
grep "^\.env$" .gitignore

# Verify no secrets in git
git status

# Check sensitive files aren't tracked
git ls-files | grep -E "\.env|credentials|config\.js"
```

### 5. Start Development Server
```bash
# Option 1: Using Python (built-in)
python -m http.server 8000

# Option 2: Using Node.js
npx http-server -p 8000

# Option 3: Using Live Server extension in VS Code
# Right-click index.html → Open with Live Server
```

### 6. Open in Browser
```
http://localhost:8000
```

---

## 📁 Project Structure

```
NearCheck-Plus/
├── index.html              # Main HTML file
├── main.css               # Styling
├── main.js                # Application logic
├── config-loader.js       # Secure configuration loader ⚠️
├── security.js            # Security manager & protections ⚠️
├── voice-commands.js      # Voice command functionality
│
├── .env.example           # Environment variables template
├── .env                   # ⚠️ Environment secrets (NOT in git)
├── .gitignore             # Git ignore patterns
│
├── SECURITY.md            # Security documentation
└── README.md              # This file
```

---

## 🔒 Security Configuration

### Critical Files (NEVER Commit)

These files contain secrets and are protected by `.gitignore`:

```
.env                    # Your actual secrets
config.js              # Configuration with API keys
credentials.json       # Service account keys
private-*.js           # Private configuration
```

### Verify Protection

```bash
# Should show nothing sensitive
git log --all -S 'apiKey' --name-only
git log --all -S 'secret' --name-only

# All secrets should be in environment variables
cat .env  # Only on your local machine!
```

---

## 🔐 Secure Configuration Loading

The application loads configuration securely:

1. **config-loader.js** - Loads from environment variables
2. **security.js** - Initializes security protections
3. **main.js** - Uses CONFIG and security features

### Example: Using Configuration

```javascript
// Access Firebase config securely
const firebaseConfig = CONFIG.firebase;

// Make secure API calls
const headers = securityManager.getSecureHeaders();
```

---

## 🛡️ Security Features

### Automatic Protections

✅ **Session Timeout** (30 minutes)
- Auto-logout on inactivity
- Activity monitoring
- 5-minute warning before expiry

✅ **Security Headers**
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-XSS-Protection enabled

✅ **CSRF Protection**
- Token generation
- Token validation on requests

✅ **XSS Prevention**
- HTML sanitization
- Safe DOM manipulation

✅ **Secure API Communication**
- Bearer token authentication
- HTTPS only (in production)

### Manual Initialization

```javascript
// Security features auto-initialize, but you can manually trigger:
securityManager.initializeSecurityMonitoring();
securityManager.generateCSRFToken();
```

---

## 📝 Environment Variables

### Required Variables

```env
# Firebase Configuration (REQUIRED)
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...

# Security (REQUIRED for production)
JWT_SECRET=generate_strong_random_string
ENCRYPTION_KEY=generate_strong_random_string
```

### Optional Variables

```env
# API Configuration
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_API_KEY=...
REACT_APP_API_SECRET=...

# Application Settings
NODE_ENV=development
DEBUG_MODE=true
LOG_LEVEL=info

# Feature Flags
FEATURE_BLE=false
FEATURE_GEOFENCING=true
FEATURE_BIOMETRIC=false
```

See `.env.example` for complete list.

---

## 🚨 Common Issues

### Issue: "CONFIG is not defined"
**Solution:** Ensure `config-loader.js` loads before `main.js`
```html
<!-- Correct order in HTML -->
<script src="config-loader.js" defer></script>
<script src="security.js" defer></script>
<script src="main.js" defer></script>
```

### Issue: "Firebase not initialized"
**Solution:** Verify Firebase variables in `.env`
```bash
# Check variables are loaded
echo $FIREBASE_PROJECT_ID
# Should print your project ID
```

### Issue: ".env not working"
**Solution:** 
1. Ensure `.env` exists in project root
2. Restart development server
3. Check file permissions: `ls -la .env`
4. Verify it's NOT committed to git

### Issue: "Session expires too quickly"
**Solution:** Adjust SESSION_TIMEOUT in `.env`
```env
SESSION_TIMEOUT=3600000  # 1 hour in milliseconds
```

---

## 🔄 Deployment

### Before Deploying

```bash
# Security checklist
chmod 600 .env                          # Restrict file permissions
grep -r "apiKey" src/ --exclude-dir=node_modules  # Check for hardcoded keys
npm audit                               # Check for vulnerabilities
git status                              # Verify nothing sensitive staged
```

### Deploy to Production

1. **Set environment variables on server:**
   ```bash
   export NODE_ENV=production
   export FIREBASE_API_KEY=your_key
   export JWT_SECRET=strong_random_string
   # ... other variables
   ```

2. **Build (if using build tool):**
   ```bash
   npm run build
   ```

3. **Enable HTTPS:**
   - Use Let's Encrypt (free SSL)
   - Update CSP headers for production domain

4. **Configure CORS:**
   ```env
   CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
   ```

---

## 📚 Documentation

- [Security Guide](SECURITY.md) - Detailed security documentation
- [Firebase Setup](https://firebase.google.com/docs/setup) - Firebase configuration
- [OWASP Security](https://owasp.org/www-project-top-ten/) - Web security best practices

---

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/feature-name`
2. Make changes
3. Verify `.env` not committed: `git diff --cached`
4. Commit: `git commit -am 'Add feature'`
5. Push: `git push origin feature/feature-name`
6. Create Pull Request

### Security Guidelines

- Never commit `.env` or secrets
- Use `config-loader.js` for configuration
- Call `securityManager.initializeSecurityMonitoring()` in app init
- Test in development before production deployment

---

## 📞 Support

For issues:
1. Check [SECURITY.md](SECURITY.md) for security questions
2. Review common issues above
3. Check `.env` configuration
4. Verify `.env` not in git tracking

For security concerns: **DO NOT** open public issues

---

## 📄 License

[Add your license here]

---

## ✅ Checklist for First Run

- [ ] Cloned repository
- [ ] Created `.env` file
- [ ] Filled in Firebase credentials
- [ ] Verified `.env` in `.gitignore`
- [ ] Started development server
- [ ] Opened http://localhost:8000
- [ ] See no console errors
- [ ] Login functionality works
- [ ] Read SECURITY.md

---

**Created:** December 5, 2025
**Version:** 1.0.0
