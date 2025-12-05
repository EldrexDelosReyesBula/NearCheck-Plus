/**
 * NearCheck Plus - Secure Configuration Loader
 * Loads configuration from environment variables
 * Never commit actual credentials to version control
 */

// Configuration object - all values come from environment variables
const CONFIG = {
    // Firebase Configuration
    firebase: {
        apiKey: process.env.FIREBASE_API_KEY || '',
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
        projectId: process.env.FIREBASE_PROJECT_ID || '',
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
        appId: process.env.FIREBASE_APP_ID || '',
    },

    // API Configuration
    api: {
        baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        apiKey: process.env.REACT_APP_API_KEY || '',
        apiSecret: process.env.REACT_APP_API_SECRET || '',
    },

    // Map Services
    maps: {
        provider: process.env.REACT_APP_MAP_PROVIDER || 'openstreetmap',
        apiKey: process.env.REACT_APP_MAP_API_KEY || '',
    },

    // Analytics
    analytics: {
        id: process.env.REACT_APP_ANALYTICS_ID || '',
        enabled: process.env.REACT_APP_ANALYTICS_ID !== undefined,
    },

    // SMS Configuration
    sms: {
        apiKey: process.env.REACT_APP_SMS_API_KEY || '',
        apiSecret: process.env.REACT_APP_SMS_API_SECRET || '',
        provider: 'twilio',
    },

    // Email Configuration
    email: {
        service: process.env.EMAIL_SERVICE || 'smtp',
        host: process.env.EMAIL_HOST || '',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        user: process.env.EMAIL_USER || '',
        password: process.env.EMAIL_PASSWORD || '',
        from: process.env.EMAIL_FROM || 'noreply@nearcheck.com',
    },

    // Database Configuration
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        name: process.env.DB_NAME || 'nearcheck_plus',
        user: process.env.DB_USER || '',
        password: process.env.DB_PASSWORD || '',
    },

    // Security Configuration
    security: {
        jwtSecret: process.env.JWT_SECRET || '',
        jwtExpiry: process.env.JWT_EXPIRY || '7d',
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '1800000'),
        encryptionKey: process.env.ENCRYPTION_KEY || '',
    },

    // Application Settings
    app: {
        environment: process.env.NODE_ENV || 'development',
        debug: process.env.DEBUG_MODE === 'true',
        logLevel: process.env.LOG_LEVEL || 'info',
        corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
    },

    // Feature Flags
    features: {
        ble: process.env.FEATURE_BLE === 'true',
        geofencing: process.env.FEATURE_GEOFENCING === 'true',
        biometric: process.env.FEATURE_BIOMETRIC === 'true',
        offlineMode: process.env.FEATURE_OFFLINE_MODE === 'true',
    },

    // Geolocation Settings
    geolocation: {
        enabled: true,
        accuracy: 20,
        timeout: 10000,
        maximumAge: 0,
    },

    // Bluetooth (BLE) Configuration
    ble: {
        enabled: false,
        scanDuration: 5000,
        advertisedServiceUUID: 'your-service-uuid-here',
    },
};

// Validate critical configuration on load
function validateConfig() {
    const isProduction = CONFIG.app.environment === 'production';
    
    if (isProduction) {
        if (!CONFIG.firebase.apiKey) {
            console.warn('⚠️ Warning: Firebase API key is not configured for production');
        }
        if (!CONFIG.security.jwtSecret) {
            console.warn('⚠️ Warning: JWT secret is not configured for production');
        }
        if (!CONFIG.security.encryptionKey) {
            console.warn('⚠️ Warning: Encryption key is not configured for production');
        }
    }

    if (CONFIG.app.debug) {
        console.log('[DEBUG] Configuration loaded. Environment:', CONFIG.app.environment);
    }
}

// Call validation on load
if (typeof window !== 'undefined') {
    // Browser environment
    window.addEventListener('DOMContentLoaded', validateConfig);
} else {
    // Node.js environment
    validateConfig();
}

// Export for use in application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// For ES6 imports
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}
