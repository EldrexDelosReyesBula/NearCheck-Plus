/**
 * NearCheck Plus - Security Utilities
 * Handles sensitive operations, encryption, and security headers
 */

class SecurityManager {
    constructor() {
        this.sessionToken = null;
        this.sessionCreated = Date.now();
        this.lastActivityTime = Date.now();
        this.sessionTimeout = CONFIG.security.sessionTimeout || 30 * 60 * 1000;
        this.activityMonitor = null;
    }

    /**
     * Initialize security monitoring
     */
    initializeSecurityMonitoring() {
        // Monitor user activity
        this.setupActivityTracking();
        
        // Start session timeout check
        this.startSessionTimeoutMonitor();
        
        // Prevent right-click and inspect
        if (CONFIG.app.debug === false) {
            this.disableDevTools();
        }

        // Set security headers
        this.setSecurityHeaders();

        console.log('🔒 Security monitoring initialized');
    }

    /**
     * Setup activity tracking
     */
    setupActivityTracking() {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        
        events.forEach(event => {
            document.addEventListener(event, () => {
                this.lastActivityTime = Date.now();
            }, true);
        });
    }

    /**
     * Monitor session timeout
     */
    startSessionTimeoutMonitor() {
        this.activityMonitor = setInterval(() => {
            const currentTime = Date.now();
            const timeSinceLastActivity = currentTime - this.lastActivityTime;
            const warningTime = this.sessionTimeout - (5 * 60 * 1000); // 5 min warning

            if (timeSinceLastActivity > warningTime && timeSinceLastActivity < this.sessionTimeout) {
                this.showSessionWarning();
            }

            if (timeSinceLastActivity > this.sessionTimeout) {
                this.terminateSession();
            }
        }, 60000); // Check every minute
    }

    /**
     * Show session timeout warning
     */
    showSessionWarning() {
        if (window.appState && !window.sessionWarningShown) {
            window.sessionWarningShown = true;
            showToast('Session Expiring', 'Your session will expire in 5 minutes due to inactivity', 'warning', 10000);
        }
    }

    /**
     * Terminate session
     */
    terminateSession() {
        clearInterval(this.activityMonitor);
        localStorage.removeItem('authToken');
        localStorage.removeItem('sessionKey');
        window.sessionWarningShown = false;
        
        showToast('Session Expired', 'Please log in again', 'error');
        
        // Redirect to login after a short delay
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    }

    /**
     * Disable developer tools in production
     */
    disableDevTools() {
        // Disable right-click context menu
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });

        // Detect DevTools opening
        const detectDevTools = setInterval(() => {
            if (window.outerWidth - window.innerWidth > 100 || 
                window.outerHeight - window.innerHeight > 100) {
                // DevTools detected
                clearInterval(detectDevTools);
                window.location.href = 'about:blank';
            }
        }, 500);

        // Disable console
        if (CONFIG.app.environment === 'production') {
            console.log = function() {};
            console.warn = function() {};
            console.error = function() {};
        }
    }

    /**
     * Set security headers
     */
    setSecurityHeaders() {
        // CSP-like protections
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = "default-src 'self'; script-src 'self' https://www.gstatic.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com";
        document.head.appendChild(meta);
    }

    /**
     * Encrypt sensitive data (client-side)
     * For production, use proper encryption libraries
     */
    encryptData(data, key = CONFIG.security.encryptionKey) {
        if (!key) {
            console.warn('⚠️ Encryption key not configured');
            return data;
        }
        
        try {
            // Simple base64 encoding for demonstration
            // In production, use TweetNaCl.js or libsodium.js
            return btoa(JSON.stringify(data));
        } catch (error) {
            console.error('Encryption error:', error);
            return null;
        }
    }

    /**
     * Decrypt sensitive data
     */
    decryptData(encryptedData, key = CONFIG.security.encryptionKey) {
        if (!key) {
            console.warn('⚠️ Encryption key not configured');
            return encryptedData;
        }

        try {
            return JSON.parse(atob(encryptedData));
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }

    /**
     * Hash password (client-side verification only)
     * Server should hash passwords
     */
    hashPassword(password) {
        // Use crypto.subtle API
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
            .then(hashBuffer => {
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            });
    }

    /**
     * Generate secure random token
     */
    generateToken(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        
        for (let i = 0; i < length; i++) {
            token += chars[array[i] % chars.length];
        }
        
        return token;
    }

    /**
     * Validate CSRF token
     */
    validateCSRFToken(token) {
        const storedToken = sessionStorage.getItem('csrfToken');
        return token === storedToken;
    }

    /**
     * Generate CSRF token
     */
    generateCSRFToken() {
        const token = this.generateToken();
        sessionStorage.setItem('csrfToken', token);
        return token;
    }

    /**
     * Sanitize HTML to prevent XSS
     */
    sanitizeHTML(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    /**
     * Get secure headers for API requests
     */
    getSecureHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-Token': sessionStorage.getItem('csrfToken'),
        };

        const authToken = localStorage.getItem('authToken');
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        return headers;
    }

    /**
     * Validate URL for redirects (prevent open redirect)
     */
    isValidRedirectURL(url) {
        try {
            const urlObj = new URL(url, window.location.origin);
            // Only allow redirects to same origin
            return urlObj.origin === window.location.origin;
        } catch {
            return false;
        }
    }

    /**
     * Log security events
     */
    logSecurityEvent(eventType, details = {}) {
        const event = {
            timestamp: new Date().toISOString(),
            type: eventType,
            userAgent: navigator.userAgent,
            url: window.location.href,
            ...details
        };

        if (CONFIG.app.debug) {
            console.log('🔐 Security Event:', event);
        }

        // In production, send to backend logging service
        if (CONFIG.app.environment === 'production') {
            // this.reportSecurityEvent(event);
        }
    }

    /**
     * Cleanup on logout
     */
    cleanup() {
        clearInterval(this.activityMonitor);
        localStorage.removeItem('authToken');
        localStorage.removeItem('sessionKey');
        sessionStorage.clear();
        this.logSecurityEvent('LOGOUT');
    }
}

// Initialize security manager
const securityManager = new SecurityManager();
