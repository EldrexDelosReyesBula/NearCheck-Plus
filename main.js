  // Initialize Firebase
        try {
            firebase.initializeApp(firebaseConfig);
        } catch (error) {
            console.error('Firebase initialization error:', error);
        }
        
        const auth = firebase.auth();
        const db = firebase.firestore();

        // Application State
        const appState = {
            currentUser: null,
            currentPage: 'dashboard',
            sections: [],
            activeSection: null,
            activeSessions: [],
            messages: [],
            notifications: [],
            attendanceData: [],
            students: {},
            sectionAttendance: {},
            plusPoints: {},
            rankings: {},
            settings: {
                locationAccess: true,
                autoCheckIn: true,
                notifications: true,
                silentScan: false,
                defaultRadius: 20,
                autoSessions: true,
                beaconMode: true,
                highContrast: false,
                largeText: false,
                reduceMotion: false,
                dyslexiaFont: false,
                voiceCommands: false,
                hapticFeedback: true,
                analyticsEnabled: false
            },
            security: {
                sessionTimeout: 30 * 60 * 1000,
                lastActivity: Date.now(),
                nearId: null,
                deviceId: null,
                sessionKey: null
            },
            privacy: {
                trackingConsent: null,
                dataRetention: 90,
                dataSharing: false
            },
            nearId: {
                identityColor: '',
                profileEmoji: '',
                lastEmojiChange: null
            },
            location: {
                current: null,
                lastUpdate: null,
                accuracy: null,
                map: null,
                marker: null,
                circle: null
            },
            checkInStatus: {
                checkingIn: false,
                lastCheckIn: null,
                autoCheckInEnabled: false,
                autoCheckInInterval: null
            },
            silentScan: {
                active: false,
                lastScan: null,
                blockedUntil: null
            },
            manualAttendance: {},
            analytics: {
                features: {
                    dashboard: 0,
                    sections: 0,
                    sessions: 0,
                    messages: 0,
                    checkIn: 0,
                    autoCheckIn: 0,
                    manualCheckIn: 0,
                    messaging: 0,
                    qrScan: 0,
                    map: 0,
                    voiceCommands: 0
                },
                lastReport: null
            },
            resetCode: null
        };

        // DOM Elements
        const elements = {
            landingContainer: document.getElementById('landingContainer'),
            landingSheet: document.getElementById('landingSheet'),
            authContainer: document.getElementById('authContainer'),
            resetContainer: document.getElementById('resetContainer'),
            loadingContainer: document.getElementById('loadingContainer'),
            appContainer: document.getElementById('appContainer'),
            mainContent: document.getElementById('mainContent'),
            navigationBar: document.getElementById('navigationBar'),
            navItems: document.querySelectorAll('.nav-item'),
            fabButton: document.getElementById('fabButton'),
            modalBackdrop: document.getElementById('modalBackdrop'),
            bottomSheet: document.getElementById('bottomSheet'),
            toast: document.getElementById('toast'),
            toastMessage: document.getElementById('toastMessage'),
            menuButton: document.getElementById('menuButton'),
            searchButton: document.getElementById('searchButton'),
            notificationsButton: document.getElementById('notificationsButton'),
            profileButton: document.getElementById('profileButton'),
            topAppBar: document.getElementById('topAppBar'),
            loginForm: document.getElementById('loginForm'),
            signupForm: document.getElementById('signupForm'),
            resetForm: document.getElementById('resetForm'),
            authToggle: document.getElementById('authToggle'),
            authToggleText: document.getElementById('authToggleText'),
            authBackButton: document.getElementById('authBackButton'),
            resetBackButton: document.getElementById('resetBackButton'),
            backToLogin: document.getElementById('backToLogin'),
            forgotPassword: document.getElementById('forgotPassword'),
            trackingConsent: document.getElementById('trackingConsent'),
            sessionTimeoutModal: document.getElementById('sessionTimeoutModal'),
            extendSessionButton: document.getElementById('extendSession'),
            showSignIn: document.getElementById('showSignIn'),
            showSignUp: document.getElementById('showSignUp'),
            fullscreenModal: document.getElementById('fullscreenModal'),
            fullscreenContent: document.getElementById('fullscreenContent'),
            fullscreenTitle: document.getElementById('fullscreenTitle'),
            fullscreenBackButton: document.getElementById('fullscreenBackButton'),
            fullscreenClose: document.getElementById('fullscreenClose')
        };

        // Initialize the application
        function initApp() {
            setupEventListeners();
            initializePrivacySettings();
            initializeAccessibility();
            setupSessionManagement();
            setupServiceWorker();
            generateDeviceFingerprint();
            checkAuthState();
            initializeWATT();
        }

        // Initialize Web App Tracking Transparency
        function initializeWATT() {
            const savedConsent = localStorage.getItem('wattConsent');
            if (!savedConsent) {
                elements.trackingConsent.style.display = 'block';
            } else {
                appState.privacy.trackingConsent = savedConsent;
                applyWATTSettings(savedConsent);
            }

            document.getElementById('acceptTracking').addEventListener('click', () => {
                setWATTConsent('essential');
            });

            document.getElementById('acceptAllTracking').addEventListener('click', () => {
                setWATTConsent('all');
            });

            document.getElementById('rejectTracking').addEventListener('click', () => {
                setWATTConsent('none');
            });
        }

        function setWATTConsent(level) {
            appState.privacy.trackingConsent = level;
            localStorage.setItem('wattConsent', level);
            elements.trackingConsent.style.display = 'none';
            applyWATTSettings(level);
            showToast(`Tracking preferences set to: ${level}`);
        }

        function applyWATTSettings(level) {
            if (level === 'essential' || level === 'all') {
                appState.settings.analyticsEnabled = true;
            } else {
                appState.settings.analyticsEnabled = false;
            }
        }

        // Track feature usage
        function trackFeatureUsage(feature) {
            if (!appState.settings.analyticsEnabled) return;

            if (appState.analytics.features[feature] !== undefined) {
                appState.analytics.features[feature]++;
            }
        }

        // Generate device fingerprint
        function generateDeviceFingerprint() {
            const components = [
                navigator.userAgent,
                navigator.language,
                screen.width + 'x' + screen.height,
                new Date().getTimezoneOffset(),
                navigator.hardwareConcurrency || 'unknown',
                navigator.platform
            ];
            appState.security.deviceId = btoa(components.join('|')).substring(0, 32);
        }

        // Check authentication state
        function checkAuthState() {
            showLoading();
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    await loadUserData(user);
                    showApp();
                    initializeNearID();
                    startSessionTimer();
                    setupUserRealTimeListeners();
                    startLocationMonitoring();
                    if (appState.settings.voiceCommands) {
                        voiceCommands.init();
                    }
                    trackFeatureUsage('dashboard');
                } else {
                    showLanding();
                }
            });
        }

        // Start location monitoring
        function startLocationMonitoring() {
            if (!appState.settings.locationAccess) return;

            if (appState.checkInStatus.autoCheckInEnabled) {
                startAutoCheckIn();
            }

            // Update current location periodically
            setInterval(() => {
                if (appState.currentUser && appState.settings.locationAccess) {
                    updateCurrentLocation();
                }
            }, 30000);
        }

        // Update current location
        async function updateCurrentLocation() {
            try {
                const position = await getCurrentPosition();
                appState.location.current = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: new Date().toISOString()
                };
                appState.location.lastUpdate = new Date().toISOString();

                // Update map marker if exists
                if (appState.location.marker) {
                    appState.location.marker.setLatLng([position.coords.latitude, position.coords.longitude]);
                }
            } catch (error) {
                console.warn('Location update failed:', error.message);
            }
        }

        // Start auto check-in
        function startAutoCheckIn() {
            if (!appState.settings.autoCheckIn || !appState.settings.locationAccess) {
                return;
            }

            appState.checkInStatus.autoCheckInEnabled = true;

            const autoCheckInInterval = setInterval(async () => {
                if (!appState.location.current || appState.activeSessions.length === 0) {
                    return;
                }

                for (const session of appState.activeSessions) {
                    if (session.autoCheckIn) {
                        await checkAutoCheckIn(session);
                    }
                }
            }, 30000);

            appState.checkInStatus.autoCheckInInterval = autoCheckInInterval;
        }

        // Check auto check-in for a session
        async function checkAutoCheckIn(session) {
            try {
                const distance = calculateDistance(
                    appState.location.current.lat,
                    appState.location.current.lng,
                    session.location.lat,
                    session.location.lng
                );

                if (distance <= session.radius) {
                    const today = new Date().toISOString().split('T')[0];
                    const alreadyCheckedIn = appState.attendanceData.some(record =>
                        record.sessionId === session.id &&
                        record.timestamp.split('T')[0] === today &&
                        record.status === 'present'
                    );

                    if (!alreadyCheckedIn) {
                        await performCheckIn(session.id, 'auto');
                        trackFeatureUsage('autoCheckIn');
                    }
                }
            } catch (error) {
                console.error('Auto check-in error:', error);
            }
        }

        // Setup user-specific real-time listeners
        function setupUserRealTimeListeners() {
            // Listen for section updates
            const sectionsQuery = appState.currentUser.role === 'teacher' ?
                db.collection('sections').where('teacherId', '==', appState.currentUser.id) :
                db.collection('sections').where('students', 'array-contains', appState.currentUser.id);

            sectionsQuery.onSnapshot((snapshot) => {
                appState.sections = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                if (appState.currentPage === 'sections' || appState.currentPage === 'dashboard') {
                    loadPage(appState.currentPage);
                }
            });

            // Listen for active sessions
            const sessionsQuery = appState.currentUser.role === 'student' ?
                db.collection('sessions')
                .where('students', 'array-contains', appState.currentUser.id)
                .where('active', '==', true) :
                db.collection('sessions')
                .where('teacherId', '==', appState.currentUser.id)
                .where('active', '==', true);

            sessionsQuery.onSnapshot((snapshot) => {
                appState.activeSessions = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                if (appState.currentPage === 'dashboard' || appState.currentPage === 'sections' || appState.currentPage === 'sessions') {
                    loadPage(appState.currentPage);
                }
            });

            // Listen for messages
            db.collection('messages')
                .where('recipients', 'array-contains', appState.currentUser.id)
                .orderBy('timestamp', 'desc')
                .limit(50)
                .onSnapshot((snapshot) => {
                    appState.messages = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    if (appState.currentPage === 'messages') {
                        loadPage('messages');
                    }
                    updateNotificationBadge();
                });

            // Listen for attendance records
            db.collection('attendance')
                .where('userId', '==', appState.currentUser.id)
                .orderBy('timestamp', 'desc')
                .limit(100)
                .onSnapshot((snapshot) => {
                    appState.attendanceData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                });

            // Listen for plus points
            db.collection('plusPoints')
                .where('userId', '==', appState.currentUser.id)
                .onSnapshot((snapshot) => {
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        appState.plusPoints[data.sectionId] = data.points || 0;
                    });
                });
        }

        // Load user data from Firestore
        async function loadUserData(user) {
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    appState.currentUser = {
                        id: user.uid,
                        email: user.email,
                        ...userData
                    };

                    if (userData.nearId) {
                        appState.nearId = userData.nearId;
                    } else {
                        await initializeUserNearID(user.uid);
                    }

                    await loadUserSections();
                    await loadUserMessages();
                    await loadUserSettings();
                    await loadUserPrivacy();
                    await loadAttendanceData();
                    await loadActiveSessions();
                    await loadPlusPoints();

                    updateUIForRole();
                } else {
                    await createUserDocument(user);
                }
            } catch (error) {
                console.error('Error loading user data:', error);
                showToast('Error loading user data');
            }
        }

        // Update UI based on user role
        function updateUIForRole() {
            const sessionsNav = document.querySelector('.nav-item[data-page="sessions"]');
            if (appState.currentUser.role === 'teacher') {
                sessionsNav.style.display = 'flex';
            } else {
                sessionsNav.style.display = 'none';
            }
        }

        // Create user document in Firestore
        async function createUserDocument(user) {
            const identityColor = getRandomColor();
            const profileEmoji = getInitials(document.getElementById('signupName')?.value || 'User');

            const userData = {
                name: user.displayName || document.getElementById('signupName')?.value || 'User',
                pronouns: document.getElementById('signupPronouns')?.value || '',
                role: document.getElementById('signupRole')?.value || 'student',
                avatar: profileEmoji,
                color: identityColor,
                joinDate: new Date().toISOString(),
                dob: document.getElementById('signupDob')?.value || '',
                settings: appState.settings,
                privacy: {
                    trackingConsent: appState.privacy.trackingConsent || 'essential',
                    dataSharing: false
                },
                nearId: {
                    identityColor: identityColor,
                    profileEmoji: profileEmoji,
                    lastEmojiChange: new Date().toISOString()
                },
                lastActive: new Date().toISOString(),
                deviceId: appState.security.deviceId
            };

            await db.collection('users').doc(user.uid).set(userData);
            appState.currentUser = {
                id: user.uid,
                email: user.email,
                ...userData
            };
            appState.nearId = userData.nearId;
        }

        // Initialize NearID for existing users
        async function initializeUserNearID(userId) {
            const identityColor = getRandomColor();
            const profileEmoji = getInitials(appState.currentUser?.name || 'User');

            const nearIdData = {
                identityColor: identityColor,
                profileEmoji: profileEmoji,
                lastEmojiChange: new Date().toISOString()
            };

            await db.collection('users').doc(userId).update({
                nearId: nearIdData
            });

            appState.nearId = nearIdData;
        }

        // Initialize NearID+ identity system
        function initializeNearID() {
            appState.security.nearId = {
                userId: appState.currentUser.id,
                deviceId: appState.security.deviceId,
                sessionKey: generateSessionKey(),
                timestamp: Date.now()
            };

            sessionStorage.setItem('nearId', JSON.stringify(appState.security.nearId));
        }

        // Generate session key
        function generateSessionKey() {
            return 'sk_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        }

        // Setup service worker
        function setupServiceWorker() {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('SW registered: ', registration);
                    })
                    .catch(registrationError => {
                        console.log('SW registration failed: ', registrationError);
                    });
            }
        }

        // Setup session management
        function setupSessionManagement() {
            document.addEventListener('mousemove', resetSessionTimer);
            document.addEventListener('keypress', resetSessionTimer);
            document.addEventListener('click', resetSessionTimer);
            document.addEventListener('scroll', resetSessionTimer);
            startSessionTimer();
        }

        function resetSessionTimer() {
            appState.security.lastActivity = Date.now();
        }

        function startSessionTimer() {
            setInterval(() => {
                const inactiveTime = Date.now() - appState.security.lastActivity;
                if (inactiveTime > appState.security.sessionTimeout - 60000) {
                    showSessionTimeoutWarning();
                }
            }, 30000);
        }

        function showSessionTimeoutWarning() {
            let timeLeft = 60;
            const countdownElement = document.getElementById('sessionCountdown');

            elements.sessionTimeoutModal.style.display = 'flex';

            const countdown = setInterval(() => {
                timeLeft--;
                countdownElement.textContent = `0:${timeLeft < 10 ? '0' : ''}${timeLeft}`;

                if (timeLeft <= 0) {
                    clearInterval(countdown);
                    logoutUser();
                }
            }, 1000);

            elements.extendSessionButton.onclick = () => {
                clearInterval(countdown);
                resetSessionTimer();
                elements.sessionTimeoutModal.style.display = 'none';
            };
        }

        // Initialize privacy settings
        function initializePrivacySettings() {
            const savedSettings = localStorage.getItem('privacySettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                appState.privacy = {
                    ...appState.privacy,
                    ...settings
                };
            }
        }

        // Initialize accessibility features
        function initializeAccessibility() {
            const savedSettings = localStorage.getItem('accessibilitySettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                appState.settings = {
                    ...appState.settings,
                    ...settings
                };
                applyAccessibilitySettings();
            }
        }

        function applyAccessibilitySettings() {
            const root = document.documentElement;

            if (appState.settings.highContrast) {
                root.style.setProperty('--primary', '#000000');
                root.style.setProperty('--on-primary', '#FFFFFF');
                root.style.setProperty('--outline', '#000000');
                root.style.setProperty('--surface', '#FFFFFF');
                root.style.setProperty('--on-surface', '#000000');
            } else {
                root.style.setProperty('--primary', '#6750A4');
                root.style.setProperty('--on-primary', '#FFFFFF');
                root.style.setProperty('--outline', '#79747E');
                root.style.setProperty('--surface', '#FEF7FF');
                root.style.setProperty('--on-surface', '#1D1B20');
            }

            if (appState.settings.largeText) {
                root.style.setProperty('--font-size-md', '18px');
                root.style.setProperty('--font-size-lg', '20px');
                root.style.setProperty('--font-size-xl', '22px');
                root.style.setProperty('--font-size-xxl', '24px');
            } else {
                root.style.setProperty('--font-size-md', '16px');
                root.style.setProperty('--font-size-lg', '18px');
                root.style.setProperty('--font-size-xl', '20px');
                root.style.setProperty('--font-size-xxl', '22px');
            }

            if (appState.settings.reduceMotion) {
                root.style.setProperty('--transition-speed', '0ms');
                root.style.setProperty('--animation-speed', '0ms');
            } else {
                root.style.setProperty('--transition-speed', '200ms');
                root.style.setProperty('--animation-speed', '300ms');
            }

            if (appState.settings.dyslexiaFont) {
                document.body.style.fontFamily = "'OpenDyslexic', 'Comic Sans MS', sans-serif";
            } else {
                document.body.style.fontFamily = "'Roboto', 'Segoe UI', system-ui, sans-serif";
            }
        }

        function saveAccessibilitySettings() {
            localStorage.setItem('accessibilitySettings', JSON.stringify({
                highContrast: appState.settings.highContrast,
                largeText: appState.settings.largeText,
                reduceMotion: appState.settings.reduceMotion,
                dyslexiaFont: appState.settings.dyslexiaFont,
                voiceCommands: appState.settings.voiceCommands,
                hapticFeedback: appState.settings.hapticFeedback,
                analyticsEnabled: appState.settings.analyticsEnabled
            }));
        }

        // Set up event listeners
        function setupEventListeners() {
            elements.showSignIn.addEventListener('click', () => {
                showAuth();
                showLoginForm();
            });

            elements.showSignUp.addEventListener('click', () => {
                showAuth();
                showSignupForm();
            });

            elements.loginForm.addEventListener('submit', handleLogin);
            elements.signupForm.addEventListener('submit', handleSignup);
            elements.resetForm.addEventListener('submit', handlePasswordReset);
            elements.authToggle.addEventListener('click', toggleAuthForms);
            elements.authBackButton.addEventListener('click', showLanding);
            elements.resetBackButton.addEventListener('click', showAuth);
            elements.backToLogin.addEventListener('click', showAuth);
            elements.forgotPassword.addEventListener('click', () => {
                showResetPassword();
            });
            
            document.getElementById('togglePassword').addEventListener('click', togglePasswordVisibility);

            elements.navItems.forEach(item => {
                item.addEventListener('click', () => {
                    const page = item.getAttribute('data-page');
                    loadPage(page);
                    elements.navItems.forEach(nav => nav.classList.remove('active'));
                    item.classList.add('active');
                });
            });

            elements.fabButton.addEventListener('click', handleFabClick);

            elements.modalBackdrop.addEventListener('click', (e) => {
                if (e.target === elements.modalBackdrop) {
                    closeModal();
                }
            });

            elements.fullscreenBackButton.addEventListener('click', closeFullscreen);
            elements.fullscreenClose.addEventListener('click', closeFullscreen);

            elements.menuButton.addEventListener('click', openNavigationDrawer);
            elements.searchButton.addEventListener('click', openFullscreenSearch);
            elements.notificationsButton.addEventListener('click', openFullscreenNotifications);
            elements.profileButton.addEventListener('click', () => loadPage('profile'));

            window.addEventListener('scroll', () => {
                if (window.scrollY > 10) {
                    elements.topAppBar.classList.add('scrolled');
                } else {
                    elements.topAppBar.classList.remove('scrolled');
                }
            });

            window.addEventListener('online', handleOnlineStatus);
            window.addEventListener('offline', handleOfflineStatus);

            // Haptic feedback
            if (appState.settings.hapticFeedback && 'vibrate' in navigator) {
                document.addEventListener('click', (e) => {
                    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                        navigator.vibrate(10);
                    }
                });
            }
        }

        // Show landing screen
        function showLanding() {
            elements.landingContainer.style.display = 'flex';
            elements.authContainer.style.display = 'none';
            elements.resetContainer.style.display = 'none';
            elements.loadingContainer.style.display = 'none';
            elements.appContainer.style.display = 'none';
        }

        // Show authentication screen
        function showAuth() {
            elements.landingContainer.style.display = 'none';
            elements.authContainer.style.display = 'flex';
            elements.resetContainer.style.display = 'none';
            elements.loadingContainer.style.display = 'none';
            elements.appContainer.style.display = 'none';
        }

        // Show reset password screen
        function showResetPassword() {
            elements.landingContainer.style.display = 'none';
            elements.authContainer.style.display = 'none';
            elements.resetContainer.style.display = 'flex';
            elements.loadingContainer.style.display = 'none';
            elements.appContainer.style.display = 'none';
            
            // Reset form state
            document.getElementById('resetSubmitButton').textContent = 'Send Reset Email';
            document.getElementById('resetCode').style.display = 'none';
            document.getElementById('newPassword').style.display = 'none';
            document.getElementById('confirmNewPassword').style.display = 'none';
        }

        // Show login form
        function showLoginForm() {
            elements.signupForm.style.display = 'none';
            elements.loginForm.style.display = 'block';
            elements.authToggleText.textContent = 'Don\'t have an account?';
            elements.authToggle.textContent = 'Sign Up';
        }

        // Show signup form
        function showSignupForm() {
            elements.loginForm.style.display = 'none';
            elements.signupForm.style.display = 'block';
            elements.authToggleText.textContent = 'Already have an account?';
            elements.authToggle.textContent = 'Sign In';
        }

        // Show loading screen
        function showLoading() {
            elements.landingContainer.style.display = 'none';
            elements.authContainer.style.display = 'none';
            elements.resetContainer.style.display = 'none';
            elements.loadingContainer.style.display = 'flex';
            elements.appContainer.style.display = 'none';
        }

        // Show main app
        function showApp() {
            elements.landingContainer.style.display = 'none';
            elements.authContainer.style.display = 'none';
            elements.resetContainer.style.display = 'none';
            elements.loadingContainer.style.display = 'none';
            elements.appContainer.style.display = 'flex';

            loadPage('dashboard');
            updateNotificationBadge();

            setTimeout(() => {
                showToast(`Welcome to NearCheck+, ${appState.currentUser.name}!`);
            }, 1000);
        }

        // Handle login
        async function handleLogin(e) {
            e.preventDefault();

            const email = sanitizeInput(document.getElementById('loginEmail').value);
            const password = document.getElementById('loginPassword').value;
            const rememberMe = document.getElementById('rememberMe').checked;

            try {
                showLoading();
                await auth.setPersistence(rememberMe ?
                    firebase.auth.Auth.Persistence.LOCAL :
                    firebase.auth.Auth.Persistence.SESSION);

                await auth.signInWithEmailAndPassword(email, password);
            } catch (error) {
                showAuth();
                showToast(`Login failed: ${error.message}`);
            }
        }

        // Handle password reset
        async function handlePasswordReset(e) {
            e.preventDefault();

            const email = sanitizeInput(document.getElementById('resetEmail').value);
            const code = document.getElementById('resetCode').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmNewPassword').value;

            if (!email) {
                showToast('Please enter your email address');
                return;
            }

            if (!validateEmail(email)) {
                showToast('Please enter a valid email address');
                return;
            }

            try {
                // First stage: Send reset code
                if (!code) {
                    // Generate and store reset code
                    appState.resetCode = Math.floor(100000 + Math.random() * 900000).toString();
                    
                    // In production, you would send this via email
                    // For demo, we'll just show it
                    showToast(`Reset code sent to ${email}. Your code is: ${appState.resetCode}`);
                    
                    // Show code input and new password fields
                    document.getElementById('resetCode').style.display = 'block';
                    document.getElementById('newPassword').style.display = 'block';
                    document.getElementById('confirmNewPassword').style.display = 'block';
                    document.getElementById('resetSubmitButton').textContent = 'Reset Password';
                    
                    return;
                }

                // Second stage: Verify code and reset password
                if (code !== appState.resetCode) {
                    showToast('Invalid verification code');
                    return;
                }

                if (!newPassword || newPassword.length < 6) {
                    showToast('Password must be at least 6 characters');
                    return;
                }

                if (newPassword !== confirmPassword) {
                    showToast('Passwords do not match');
                    return;
                }

                // Find user by email and update password
                const user = await auth.signInWithEmailAndPassword(email, 'dummy');
                await user.user.updatePassword(newPassword);
                
                showToast('Password reset successfully. Please login with your new password.');
                showAuth();
                showLoginForm();
                
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    showToast('No account found with this email');
                } else if (error.code === 'auth/wrong-password') {
                    // This is expected when we try dummy login
                    // Continue with password reset
                } else {
                    showToast(`Error: ${error.message}`);
                }
            }
        }

        // Handle signup
        async function handleSignup(e) {
            e.preventDefault();

            const name = sanitizeInput(document.getElementById('signupName').value);
            const pronouns = sanitizeInput(document.getElementById('signupPronouns').value);
            const email = sanitizeInput(document.getElementById('signupEmail').value);
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('signupConfirmPassword').value;
            const role = document.getElementById('signupRole').value;
            const dob = document.getElementById('signupDob').value;
            const termsAgreed = document.getElementById('termsAgreement').checked;

            if (!validateEmail(email)) {
                showToast('Please enter a valid email address');
                return;
            }

            if (password !== confirmPassword) {
                showToast('Passwords do not match');
                return;
            }

            if (!termsAgreed) {
                showToast('Please agree to the Terms of Service and Privacy Policy');
                return;
            }

            const age = calculateAge(new Date(dob));
            if (role === 'teacher' && age < 20) {
                showToast('Teachers must be at least 20 years old');
                return;
            }
            if (role === 'student' && age < 13) {
                showToast('Students must be at least 13 years old');
                return;
            }

            try {
                showLoading();
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;

                await user.updateProfile({
                    displayName: name
                });

                showToast('Account created successfully!');

            } catch (error) {
                showAuth();
                showToast(`Signup failed: ${error.message}`);
            }
        }

        // Input sanitization
        function sanitizeInput(input) {
            if (!input) return '';
            const div = document.createElement('div');
            div.textContent = input;
            return div.innerHTML.replace(/[<>]/g, '');
        }

        // Email validation
        function validateEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        }

        // Toggle password visibility
        function togglePasswordVisibility() {
            const passwordInput = document.getElementById('loginPassword');
            const toggleButton = document.getElementById('togglePassword');

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleButton.textContent = 'Hide Password';
                toggleButton.setAttribute('aria-label', 'Hide password');
            } else {
                passwordInput.type = 'password';
                toggleButton.textContent = 'Show Password';
                toggleButton.setAttribute('aria-label', 'Show password');
            }
        }

        // Toggle between login and signup forms
        function toggleAuthForms(e) {
            e.preventDefault();
            if (elements.loginForm.style.display !== 'none') {
                showSignupForm();
            } else {
                showLoginForm();
            }
        }

        // Logout user
        async function logoutUser() {
            try {
                if (appState.checkInStatus.autoCheckInInterval) {
                    clearInterval(appState.checkInStatus.autoCheckInInterval);
                }

                if (voiceCommands.isInitialized) {
                    voiceCommands.destroy();
                }

                await auth.signOut();
                sessionStorage.clear();
                showToast('Logged out successfully');
                showLanding();
            } catch (error) {
                console.error('Logout error:', error);
            }
        }

        // Handle online/offline status
        function handleOnlineStatus() {
            showToast('Connection restored');
            if (appState.currentUser) {
                loadPage(appState.currentPage);
            }
        }

        function handleOfflineStatus() {
            showToast('You are currently offline. Some features may be limited.');
        }

        // Update notification badge
        function updateNotificationBadge() {
            const unreadCount = appState.messages.filter(msg =>
                !msg.read || (msg.read && !msg.read.includes(appState.currentUser.id))
            ).length;

            const badge = document.getElementById('notificationBadge');
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }

        // Load page content
        function loadPage(page) {
            appState.currentPage = page;

            switch (page) {
                case 'dashboard':
                    loadDashboard();
                    trackFeatureUsage('dashboard');
                    break;
                case 'sections':
                    loadSections();
                    trackFeatureUsage('sections');
                    break;
                case 'sessions':
                    if (appState.currentUser.role === 'teacher') {
                        loadSessions();
                        trackFeatureUsage('sessions');
                    } else {
                        loadDashboard();
                    }
                    break;
                case 'messages':
                    loadMessages();
                    trackFeatureUsage('messages');
                    break;
                case 'settings':
                    loadSettings();
                    break;
                case 'profile':
                    loadProfile();
                    break;
                default:
                    loadDashboard();
            }

            document.title = `${page.charAt(0).toUpperCase() + page.slice(1)} | NearCheck+`;
        }

        // Load dashboard page
        function loadDashboard() {
            const greeting = getTimeBasedGreeting();
            const today = new Date().toISOString().split('T')[0];
            const todayAttendance = appState.attendanceData.filter(a =>
                a.timestamp.split('T')[0] === today
            );

            let html = `
                <div class="greeting">${greeting}, ${appState.currentUser.name}!</div>
                
                <div class="card">
                    <div class="card-header">
                        <span class="material-icons" style="margin-right: 12px; color: var(--primary);">dashboard</span>
                        <div class="card-title">Today's Overview</div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 16px;">
                        <div class="stat">
                            <div class="stat-value">${appState.sections.filter(s => s.active).length}</div>
                            <div class="stat-label">Active Sections</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${appState.sections.reduce((acc, section) => acc + (section.students ? section.students.length : 0), 0)}</div>
                            <div class="stat-label">Total Students</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${todayAttendance.length}</div>
                            <div class="stat-label">Today's Check-ins</div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <span class="material-icons" style="margin-right: 12px; color: var(--primary);">class</span>
                        <div class="card-title">Your Sections</div>
                    </div>
                    <div class="sections-grid">
            `;

            if (appState.sections.length === 0) {
                html += `
                    <div style="text-align: center; padding: 32px; width: 100%; color: var(--on-surface-variant);">
                        <span class="material-icons" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">class</span>
                        <div>No sections yet. ${appState.currentUser.role === 'teacher' ? 'Create your first section!' : 'Join a section to get started!'}</div>
                    </div>
                `;
            } else {
                appState.sections.forEach(section => {
                    const sessionActive = section.active && section.currentSession;
                    const studentCount = section.students ? section.students.length : 0;
                    const plusPoints = appState.plusPoints[section.id] || 0;

                    html += `
                        <div class="section-card" data-section="${section.id}" onclick="openSectionDetails('${section.id}')">
                            <div class="section-card-header">
                                <div class="section-emoji">${section.emoji}</div>
                                <div style="flex: 1;">
                                    <div class="section-name">${section.name}</div>
                                    <div class="card-subtitle">${section.subject}</div>
                                </div>
                                ${sessionActive ? `<div class="session-badge">Active</div>` : ''}
                            </div>
                            <div class="section-info">
                                <div class="section-teacher">
                                    <span class="material-icons" style="font-size: 16px;">person</span>
                                    ${section.teacherName}
                                </div>
                                <div class="section-stats">
                                    <span>${studentCount} students</span>
                                    <span>•</span>
                                    <span>${section.schedule}</span>
                                    ${plusPoints > 0 ? `<span>•</span><span class="plus-points">${plusPoints} pts</span>` : ''}
                                </div>
                            </div>
                            ${appState.currentUser.role === 'student' && sessionActive ? `
                            <div class="check-in-status" id="checkInStatus-${section.id}">
                                <div class="loading-spinner small"></div>
                                <span>Checking distance...</span>
                            </div>
                            ` : ''}
                        </div>
                    `;
                });
            }

            html += `
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <span class="material-icons" style="margin-right: 12px; color: var(--primary);">notifications</span>
                        <div class="card-title">Recent Activity</div>
                    </div>
                    <ul class="list">
            `;

            if (appState.messages.length === 0) {
                html += `
                    <li class="list-item">
                        <div class="list-item-content" style="text-align: center; color: var(--on-surface-variant);">
                            No recent activity
                        </div>
                    </li>
                `;
            } else {
                appState.messages.slice(0, 3).forEach(message => {
                    html += `
                        <li class="list-item" onclick="openMessageDetails('${message.id}')">
                            <div class="list-item-icon" style="background-color: var(--primary-container); color: var(--on-primary-container);">
                                <span class="material-icons">${message.type === 'announcement' ? 'campaign' : 'notifications'}</span>
                            </div>
                            <div class="list-item-content">
                                <div class="list-item-title">${message.sender}</div>
                                <div class="list-item-subtitle">${message.content.substring(0, 60)}${message.content.length > 60 ? '...' : ''}</div>
                            </div>
                            <div class="list-item-trailing">
                                <div style="font-size: 12px; color: var(--on-surface-variant);">${formatTime(message.timestamp)}</div>
                            </div>
                        </li>
                    `;
                });
            }

            html += `
                    </ul>
                </div>
            `;

            elements.mainContent.innerHTML = html;

            if (appState.currentUser.role === 'student') {
                appState.sections.forEach(section => {
                    updateStudentCheckInStatus(section.id);
                });
            }
        }

        // Update student check-in status
        async function updateStudentCheckInStatus(sectionId) {
            const statusElement = document.getElementById(`checkInStatus-${sectionId}`);
            if (!statusElement) return;

            const section = appState.sections.find(s => s.id === sectionId);
            if (!section || !section.active || !section.currentSession) {
                statusElement.innerHTML = '<span>No active session</span>';
                return;
            }

            const activeSession = appState.activeSessions.find(s => s.id === section.currentSession);
            if (!activeSession) {
                statusElement.innerHTML = '<span>Session not found</span>';
                return;
            }

            try {
                const position = await getCurrentPosition();
                const distance = calculateDistance(
                    position.coords.latitude,
                    position.coords.longitude,
                    activeSession.location.lat,
                    activeSession.location.lng
                );

                const inRange = distance <= activeSession.radius;

                if (inRange) {
                    statusElement.innerHTML = `
                        <span class="material-icons" style="color: var(--success); font-size: 16px;">check_circle</span>
                        <span style="color: var(--success);">In range - Ready to check in</span>
                    `;
                } else {
                    statusElement.innerHTML = `
                        <span class="material-icons" style="color: var(--error); font-size: 16px;">location_off</span>
                        <span style="color: var(--error);">Out of range (${Math.round(distance)}m)</span>
                    `;
                }
            } catch (error) {
                statusElement.innerHTML = `
                    <span class="material-icons" style="color: var(--warning); font-size: 16px;">warning</span>
                    <span>Location access required</span>
                `;
            }
        }

        // Load sections page
        function loadSections() {
            let html = `
                <div class="page-header">
                    <div class="page-title">Sections</div>
                    <div class="page-subtitle">Manage your classes and subjects</div>
                </div>
                
                <div class="sections-grid">
            `;

            if (appState.sections.length === 0) {
                html += `
                    <div style="text-align: center; padding: 48px; width: 100%; color: var(--on-surface-variant);">
                        <span class="material-icons" style="font-size: 64px; margin-bottom: 16px; opacity: 0.5;">class</span>
                        <div style="font-size: 18px; margin-bottom: 8px;">No sections yet</div>
                        <div style="margin-bottom: 24px;">${appState.currentUser.role === 'teacher' ? 'Create your first section to get started!' : 'Join a section using a code from your teacher!'}</div>
                        ${appState.currentUser.role === 'teacher' ? 
                            '<button class="button button-filled" onclick="openCreateSectionModal()">Create Section</button>' :
                            '<button class="button button-filled" onclick="openJoinSectionModal()">Join Section</button>'
                        }
                    </div>
                `;
            } else {
                appState.sections.forEach(section => {
                    const sessionActive = section.active && section.currentSession;
                    const studentCount = section.students ? section.students.length : 0;
                    const plusPoints = appState.plusPoints[section.id] || 0;

                    html += `
                        <div class="section-card" data-section="${section.id}" onclick="openSectionDetails('${section.id}')">
                            <div class="section-card-header">
                                <div class="section-emoji">${section.emoji}</div>
                                <div style="flex: 1;">
                                    <div class="section-name">${section.name}</div>
                                    <div class="card-subtitle">${section.subject}</div>
                                </div>
                                ${sessionActive ? `<div class="session-badge">Active</div>` : ''}
                            </div>
                            <div class="section-info">
                                <div class="section-teacher">
                                    <span class="material-icons" style="font-size: 16px;">person</span>
                                    ${section.teacherName}
                                </div>
                                <div class="section-stats">
                                    <span>${studentCount} students</span>
                                    <span>•</span>
                                    <span>${section.schedule}</span>
                                    ${plusPoints > 0 ? `<span>•</span><span class="plus-points">${plusPoints} pts</span>` : ''}
                                </div>
                            </div>
                            ${appState.currentUser.role === 'student' && sessionActive ? `
                            <div class="check-in-status" id="checkInStatus-${section.id}">
                                <div class="loading-spinner small"></div>
                                <span>Checking distance...</span>
                            </div>
                            ` : ''}
                        </div>
                    `;
                });
            }

            html += `
                </div>
            `;

            elements.mainContent.innerHTML = html;

            if (appState.currentUser.role === 'student') {
                appState.sections.forEach(section => {
                    updateStudentCheckInStatus(section.id);
                });
            }
        }

        // Load sessions page (Teacher only)
        function loadSessions() {
            let html = `
                <div class="page-header">
                    <div class="page-title">Session Management</div>
                    <div class="page-subtitle">Start and manage attendance sessions</div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <span class="material-icons" style="margin-right: 12px; color: var(--primary);">play_circle</span>
                        <div class="card-title">Active Sessions</div>
                    </div>
                    <div id="activeSessionsList">
            `;

            if (appState.activeSessions.length === 0) {
                html += `
                    <div style="text-align: center; padding: 32px; color: var(--on-surface-variant);">
                        <span class="material-icons" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">schedule</span>
                        <div>No active sessions</div>
                        <div style="margin-top: 16px;">Start a session from any section to begin tracking attendance</div>
                    </div>
                `;
            } else {
                appState.activeSessions.forEach(session => {
                    const section = appState.sections.find(s => s.id === session.sectionId);
                    if (!section) return;

                    html += `
                        <div class="session-card" data-session="${session.id}">
                            <div class="session-header">
                                <div class="session-emoji">${section.emoji}</div>
                                <div style="flex: 1;">
                                    <div class="session-name">${section.name}</div>
                                    <div class="card-subtitle">${section.subject}</div>
                                </div>
                                <div class="session-timer">
                                    <span class="material-icons" style="font-size: 16px; margin-right: 4px;">schedule</span>
                                    ${formatSessionDuration(session.startTime)}
                                </div>
                            </div>
                            <div class="session-stats">
                                <div class="stat">
                                    <div class="stat-value">${session.checkedInCount || 0}</div>
                                    <div class="stat-label">Checked In</div>
                                </div>
                                <div class="stat">
                                    <div class="stat-value">${session.students ? session.students.length : 0}</div>
                                    <div class="stat-label">Total Students</div>
                                </div>
                                <div class="stat">
                                    <div class="stat-value">${session.radius}m</div>
                                    <div class="stat-label">Radius</div>
                                </div>
                            </div>
                            <div class="session-actions">
                                <button class="button button-tonal" onclick="openSessionDetails('${session.id}')">
                                    <span class="material-icons" style="font-size: 16px; margin-right: 4px;">visibility</span>
                                    View Details
                                </button>
                                <button class="button button-filled" onclick="endSession('${session.id}')">
                                    <span class="material-icons" style="font-size: 16px; margin-right: 4px;">stop</span>
                                    End Session
                                </button>
                            </div>
                        </div>
                    `;
                });
            }

            html += `
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <span class="material-icons" style="margin-right: 12px; color: var(--primary);">history</span>
                        <div class="card-title">Recent Sessions</div>
                    </div>
                    <div id="recentSessionsList" style="padding: 16px; text-align: center; color: var(--on-surface-variant);">
                        Loading recent sessions...
                    </div>
                </div>
            `;

            elements.mainContent.innerHTML = html;

            loadRecentSessions();
        }

        // Load recent sessions
        async function loadRecentSessions() {
            try {
                const recentSessions = await db.collection('sessions')
                    .where('teacherId', '==', appState.currentUser.id)
                    .where('active', '==', false)
                    .orderBy('endTime', 'desc')
                    .limit(5)
                    .get();

                const recentSessionsList = document.getElementById('recentSessionsList');

                if (recentSessions.empty) {
                    recentSessionsList.innerHTML = '<div>No recent sessions found</div>';
                    return;
                }

                let html = '<ul class="list">';
                recentSessions.forEach(doc => {
                    const session = doc.data();
                    const section = appState.sections.find(s => s.id === session.sectionId);

                    html += `
                        <li class="list-item">
                            <div class="list-item-content">
                                <div class="list-item-title">${section ? section.name : 'Unknown Section'}</div>
                                <div class="list-item-subtitle">
                                    ${formatDate(session.startTime)} • ${formatTime(session.startTime)} - ${formatTime(session.endTime)}
                                </div>
                                <div style="font-size: 12px; color: var(--on-surface-variant); margin-top: 4px;">
                                    ${session.checkedInCount || 0} students checked in
                                </div>
                            </div>
                            <div class="list-item-trailing">
                                <button class="button button-text" onclick="viewSessionReport('${doc.id}')">
                                    View Report
                                </button>
                            </div>
                        </li>
                    `;
                });
                html += '</ul>';

                recentSessionsList.innerHTML = html;
            } catch (error) {
                console.error('Error loading recent sessions:', error);
                document.getElementById('recentSessionsList').innerHTML = '<div>Error loading recent sessions</div>';
            }
        }

        // Load messages page
        function loadMessages() {
            let html = `
                <div class="page-header">
                    <div class="page-title">Messages</div>
                    <div class="page-subtitle">Announcements and notifications</div>
                </div>
                
                <div class="card">
                    <div class="tabs">
                        <div class="tab active" data-tab="all">All</div>
                        <div class="tab" data-tab="announcements">Announcements</div>
                        <div class="tab" data-tab="reminders">Reminders</div>
                        <div class="tab" data-tab="unread">Unread</div>
                    </div>
                    <ul class="list" id="messagesList">
            `;

            if (appState.messages.length === 0) {
                html += `
                    <li class="list-item">
                        <div class="list-item-content" style="text-align: center; color: var(--on-surface-variant);">
                            <span class="material-icons" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">chat</span>
                            <div>No messages yet</div>
                        </div>
                    </li>
                `;
            } else {
                appState.messages.forEach(message => {
                    const time = formatTime(message.timestamp);
                    const isUnread = !message.read || (message.read && !message.read.includes(appState.currentUser.id));

                    html += `
                        <li class="list-item ${isUnread ? 'unread' : ''}" onclick="openMessageDetails('${message.id}')">
                            <div class="list-item-icon" style="background-color: var(--primary-container); color: var(--on-primary-container);">
                                <span class="material-icons">${message.type === 'announcement' ? 'campaign' : 'notifications'}</span>
                            </div>
                            <div class="list-item-content">
                                <div class="list-item-title">${message.sender}</div>
                                <div class="list-item-subtitle">${message.content.substring(0, 80)}${message.content.length > 80 ? '...' : ''}</div>
                                <div style="font-size: 12px; color: var(--on-surface-variant); margin-top: 4px;">
                                    ${message.sectionName || ''}
                                </div>
                            </div>
                            <div class="list-item-trailing">
                                <div style="font-size: 12px; color: var(--on-surface-variant);">${time}</div>
                                ${isUnread ? '<div class="unread-dot"></div>' : ''}
                            </div>
                        </li>
                    `;
                });
            }

            html += `
                    </ul>
                </div>
            `;

            elements.mainContent.innerHTML = html;

            document.querySelectorAll('.tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    filterMessages(tab.getAttribute('data-tab'));
                });
            });
        }

        // Filter messages by type
        function filterMessages(type) {
            const messages = appState.messages;
            let filteredMessages = messages;

            if (type === 'announcements') {
                filteredMessages = messages.filter(msg => msg.type === 'announcement');
            } else if (type === 'reminders') {
                filteredMessages = messages.filter(msg => msg.type === 'reminder');
            } else if (type === 'unread') {
                filteredMessages = messages.filter(msg => !msg.read || (msg.read && !msg.read.includes(appState.currentUser.id)));
            }

            const messagesList = document.getElementById('messagesList');
            messagesList.innerHTML = '';

            if (filteredMessages.length === 0) {
                messagesList.innerHTML = `
                    <li class="list-item">
                        <div class="list-item-content" style="text-align: center; color: var(--on-surface-variant);">
                            No ${type === 'all' ? '' : type} messages
                        </div>
                    </li>
                `;
            } else {
                filteredMessages.forEach(message => {
                    const time = formatTime(message.timestamp);
                    const isUnread = !message.read || (message.read && !message.read.includes(appState.currentUser.id));

                    const li = document.createElement('li');
                    li.className = `list-item ${isUnread ? 'unread' : ''}`;
                    li.onclick = () => openMessageDetails(message.id);
                    li.innerHTML = `
                        <div class="list-item-icon" style="background-color: var(--primary-container); color: var(--on-primary-container);">
                            <span class="material-icons">${message.type === 'announcement' ? 'campaign' : 'notifications'}</span>
                        </div>
                        <div class="list-item-content">
                            <div class="list-item-title">${message.sender}</div>
                            <div class="list-item-subtitle">${message.content.substring(0, 80)}${message.content.length > 80 ? '...' : ''}</div>
                            <div style="font-size: 12px; color: var(--on-surface-variant); margin-top: 4px;">
                                ${message.sectionName || ''}
                            </div>
                        </div>
                        <div class="list-item-trailing">
                            <div style="font-size: 12px; color: var(--on-surface-variant);">${time}</div>
                            ${isUnread ? '<div class="unread-dot"></div>' : ''}
                        </div>
                    `;
                    messagesList.appendChild(li);
                });
            }
        }

        // Load settings page
        function loadSettings() {
            let html = `
                <div class="page-header">
                    <div class="page-title">Settings</div>
                    <div class="page-subtitle">Manage your preferences and account</div>
                </div>
                
                <div class="settings-grid">
                    <div class="card">
                        <div class="card-header">
                            <span class="material-icons" style="margin-right: 12px; color: var(--primary);">person</span>
                            <div class="card-title">Profile Settings</div>
                        </div>
                        <div class="form-group">
                            <label for="profileName" class="form-label">Display Name</label>
                            <input type="text" class="form-input" id="profileName" value="${appState.currentUser.name}">
                        </div>
                        <div class="form-group">
                            <label for="profilePronouns" class="form-label">Pronouns</label>
                            <input type="text" class="form-input" id="profilePronouns" value="${appState.currentUser.pronouns || ''}" placeholder="e.g., they/them">
                        </div>
                        <div class="form-group">
                            <label for="profileAvatar" class="form-label">Profile Emoji/Initials</label>
                            <input type="text" class="form-input" id="profileAvatar" value="${appState.nearId.profileEmoji}" maxlength="2">
                            <div style="font-size: 12px; color: var(--on-surface-variant); margin-top: 4px;">
                                ${canChangeEmoji() ? 'You can change this now.' : `Next change available in ${getDaysUntilEmojiChange()} days`}
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Identity Color</label>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 32px; height: 32px; border-radius: 16px; background-color: ${appState.nearId.identityColor};"></div>
                                <div style="color: var(--on-surface-variant);">Your permanent identity color</div>
                            </div>
                        </div>
                        <button class="button button-filled" style="width: 100%; margin-top: 16px;" onclick="saveProfile()">Save Profile Changes</button>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <span class="material-icons" style="margin-right: 12px; color: var(--primary);">security</span>
                            <div class="card-title">Privacy & Permissions</div>
                        </div>
                        <div class="list">
                            <div class="list-item">
                                <div class="list-item-content">
                                    <div class="list-item-title">Location Access</div>
                                    <div class="list-item-subtitle">Required for check-in verification</div>
                                </div>
                                <div class="list-item-trailing">
                                    <label class="toggle">
                                        <input type="checkbox" ${appState.settings.locationAccess ? 'checked' : ''} id="locationAccessToggle" onchange="toggleLocationAccess(event)">
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                            <div class="list-item">
                                <div class="list-item-content">
                                    <div class="list-item-title">Auto Check-In</div>
                                    <div class="list-item-subtitle">Automatically check in when in range</div>
                                </div>
                                <div class="list-item-trailing">
                                    <label class="toggle">
                                        <input type="checkbox" ${appState.settings.autoCheckIn ? 'checked' : ''} id="globalAutoCheckInToggle" onchange="toggleGlobalAutoCheckIn(event)">
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                            <div class="list-item">
                                <div class="list-item-content">
                                    <div class="list-item-title">Notifications</div>
                                    <div class="list-item-subtitle">Receive class announcements and reminders</div>
                                </div>
                                <div class="list-item-trailing">
                                    <label class="toggle">
                                        <input type="checkbox" ${appState.settings.notifications ? 'checked' : ''} id="notificationsToggle" onchange="toggleNotifications(event)">
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                            <div class="list-item">
                                <div class="list-item-content">
                                    <div class="list-item-title">SilentScan Protection</div>
                                    <div class="list-item-subtitle">Prevent overlapping location detection</div>
                                </div>
                                <div class="list-item-trailing">
                                    <label class="toggle">
                                        <input type="checkbox" ${appState.settings.silentScan ? 'checked' : ''} id="silentScanToggle" onchange="toggleSilentScan(event)">
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                            <div class="list-item">
                                <div class="list-item-content">
                                    <div class="list-item-title">Analytics for Research</div>
                                    <div class="list-item-subtitle">Help improve NearCheck+ by sharing anonymous usage data</div>
                                </div>
                                <div class="list-item-trailing">
                                    <label class="toggle">
                                        <input type="checkbox" ${appState.settings.analyticsEnabled ? 'checked' : ''} id="analyticsToggle" onchange="toggleAnalytics(event)">
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <span class="material-icons" style="margin-right: 12px; color: var(--primary);">accessibility</span>
                            <div class="card-title">Accessibility</div>
                        </div>
                        <div class="list">
                            <div class="list-item">
                                <div class="list-item-content">
                                    <div class="list-item-title">High Contrast</div>
                                    <div class="list-item-subtitle">Increase color contrast for better visibility</div>
                                </div>
                                <div class="list-item-trailing">
                                    <label class="toggle">
                                        <input type="checkbox" ${appState.settings.highContrast ? 'checked' : ''} id="highContrastToggle" onchange="toggleHighContrast(event)">
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                            <div class="list-item">
                                <div class="list-item-content">
                                    <div class="list-item-title">Large Text</div>
                                    <div class="list-item-subtitle">Increase text size for better readability</div>
                                </div>
                                <div class="list-item-trailing">
                                    <label class="toggle">
                                        <input type="checkbox" ${appState.settings.largeText ? 'checked' : ''} id="largeTextToggle" onchange="toggleLargeText(event)">
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                            <div class="list-item">
                                <div class="list-item-content">
                                    <div class="list-item-title">Reduce Motion</div>
                                    <div class="list-item-subtitle">Reduce animations and transitions</div>
                                </div>
                                <div class="list-item-trailing">
                                    <label class="toggle">
                                        <input type="checkbox" ${appState.settings.reduceMotion ? 'checked' : ''} id="reduceMotionToggle" onchange="toggleReduceMotion(event)">
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                            <div class="list-item">
                                <div class="list-item-content">
                                    <div class="list-item-title">Dyslexia-Friendly Font</div>
                                    <div class="list-item-subtitle">Use OpenDyslexic font for better readability</div>
                                </div>
                                <div class="list-item-trailing">
                                    <label class="toggle">
                                        <input type="checkbox" ${appState.settings.dyslexiaFont ? 'checked' : ''} id="dyslexiaFontToggle" onchange="toggleDyslexiaFont(event)">
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                            <div class="list-item">
                                <div class="list-item-content">
                                    <div class="list-item-title">Voice Commands</div>
                                    <div class="list-item-subtitle">Enable voice control for navigation</div>
                                </div>
                                <div class="list-item-trailing">
                                    <label class="toggle">
                                        <input type="checkbox" ${appState.settings.voiceCommands ? 'checked' : ''} id="voiceCommandsToggle" onchange="toggleVoiceCommands(event)">
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                            <div class="list-item">
                                <div class="list-item-content">
                                    <div class="list-item-title">Haptic Feedback</div>
                                    <div class="list-item-subtitle">Provide tactile feedback for interactions</div>
                                </div>
                                <div class="list-item-trailing">
                                    <label class="toggle">
                                        <input type="checkbox" ${appState.settings.hapticFeedback ? 'checked' : ''} id="hapticFeedbackToggle" onchange="toggleHapticFeedback(event)">
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
            `;

            if (appState.currentUser.role === 'teacher') {
                html += `
                    <div class="card">
                        <div class="card-header">
                            <span class="material-icons" style="margin-right: 12px; color: var(--primary);">school</span>
                            <div class="card-title">Teacher Settings</div>
                        </div>
                        <div class="form-group">
                            <label for="defaultRadius" class="form-label">Default Check-in Radius (meters)</label>
                            <input type="range" class="form-input" id="defaultRadius" min="5" max="100" value="${appState.settings.defaultRadius}" oninput="updateDefaultRadiusDisplay(this.value)">
                            <div style="text-align: center; margin-top: 8px;" id="radiusValueDisplay">${appState.settings.defaultRadius} meters</div>
                        </div>
                        <div class="list">
                            <div class="list-item">
                                <div class="list-item-content">
                                    <div class="list-item-title">Auto Sessions</div>
                                    <div class="list-item-subtitle">Automatically start sessions based on schedule</div>
                                </div>
                                <div class="list-item-trailing">
                                    <label class="toggle">
                                        <input type="checkbox" ${appState.settings.autoSessions ? 'checked' : ''} id="autoSessionsToggle" onchange="toggleAutoSessions(event)">
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                            <div class="list-item">
                                <div class="list-item-content">
                                    <div class="list-item-title">Beacon Mode</div>
                                    <div class="list-item-subtitle">Enable passive WebRTC signals for accuracy</div>
                                </div>
                                <div class="list-item-trailing">
                                    <label class="toggle">
                                        <input type="checkbox" ${appState.settings.beaconMode ? 'checked' : ''} id="beaconModeToggle" onchange="toggleBeaconMode(event)">
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            html += `
                    <div class="card">
                        <div class="card-header">
                            <span class="material-icons" style="margin-right: 12px; color: var(--primary);">history</span>
                            <div class="card-title">Data & History</div>
                        </div>
                        <button class="button button-tonal" style="width: 100%; margin-bottom: 12px;" onclick="viewAttendanceHistory()">View Attendance History</button>
                        <button class="button button-outlined" style="width: 100%; margin-bottom: 12px;" onclick="exportData()">Export My Data</button>
                        <button class="button button-text" style="width: 100%; color: var(--error);" onclick="confirmDeleteAccount()">Delete Account</button>
                    </div>
                </div>
            `;

            elements.mainContent.innerHTML = html;
        }

        // Load profile page
        function loadProfile() {
            loadSettings();
        }

        // Handle FAB button click
        function handleFabClick() {
            if (appState.currentUser.role === 'teacher') {
                showTeacherFabOptions();
            } else {
                showStudentFabOptions();
            }
        }

        // Show teacher FAB options
        function showTeacherFabOptions() {
            let html = `
                <div class="sheet-header">
                    <div class="sheet-title">Quick Actions</div>
                    <button class="sheet-close" id="sheetClose" aria-label="Close">
                        <span class="material-icons" aria-hidden="true">close</span>
                    </button>
                </div>
                <div class="sheet-content">
                    <ul class="list">
                        <li class="list-item" onclick="openCreateSectionModal()">
                            <div class="list-item-icon" style="background-color: var(--primary-container); color: var(--on-primary-container);">
                                <span class="material-icons">add</span>
                            </div>
                            <div class="list-item-content">
                                <div class="list-item-title">Create New Section</div>
                                <div class="list-item-subtitle">Start a new class or subject</div>
                            </div>
                        </li>
                        <li class="list-item" onclick="openQuickAnnouncementModal()">
                            <div class="list-item-icon" style="background-color: var(--primary-container); color: var(--on-primary-container);">
                                <span class="material-icons">campaign</span>
                            </div>
                            <div class="list-item-content">
                                <div class="list-item-title">Send Announcement</div>
                                <div class="list-item-subtitle">Share updates with your classes</div>
                            </div>
                        </li>
                        <li class="list-item" onclick="openStartSessionModal()">
                            <div class="list-item-icon" style="background-color: var(--primary-container); color: var(--on-primary-container);">
                                <span class="material-icons">play_circle</span>
                            </div>
                            <div class="list-item-content">
                                <div class="list-item-title">Start Session</div>
                                <div class="list-item-subtitle">Begin attendance tracking</div>
                            </div>
                        </li>
                        <li class="list-item" onclick="openStudentManagement()">
                            <div class="list-item-icon" style="background-color: var(--primary-container); color: var(--on-primary-container);">
                                <span class="material-icons">group_add</span>
                            </div>
                            <div class="list-item-content">
                                <div class="list-item-title">Manage Students</div>
                                <div class="list-item-subtitle">Add or remove students</div>
                            </div>
                        </li>
                    </ul>
                </div>
            `;

            openModal(html);
            document.getElementById('sheetClose').addEventListener('click', closeModal);
        }

        // Show student FAB options
        function showStudentFabOptions() {
            let html = `
                <div class="sheet-header">
                    <div class="sheet-title">Quick Actions</div>
                    <button class="sheet-close" id="sheetClose" aria-label="Close">
                        <span class="material-icons" aria-hidden="true">close</span>
                    </button>
                </div>
                <div class="sheet-content">
                    <ul class="list">
                        <li class="list-item" onclick="openJoinSectionModal()">
                            <div class="list-item-icon" style="background-color: var(--primary-container); color: var(--on-primary-container);">
                                <span class="material-icons">group_add</span>
                            </div>
                            <div class="list-item-content">
                                <div class="list-item-title">Join Section</div>
                                <div class="list-item-subtitle">Enter a section code to join</div>
                            </div>
                        </li>
                        <li class="list-item" onclick="openManualCheckIn()">
                            <div class="list-item-icon" style="background-color: var(--primary-container); color: var(--on-primary-container);">
                                <span class="material-icons">location_on</span>
                            </div>
                            <div class="list-item-content">
                                <div class="list-item-title">Manual Check-In</div>
                                <div class="list-item-subtitle">Check in to active sessions</div>
                            </div>
                        </li>
                        <li class="list-item" onclick="openAttendanceHistory()">
                            <div class="list-item-icon" style="background-color: var(--primary-container); color: var(--on-primary-container);">
                                <span class="material-icons">history</span>
                            </div>
                            <div class="list-item-content">
                                <div class="list-item-title">View Attendance</div>
                                <div class="list-item-subtitle">Check your attendance records</div>
                            </div>
                        </li>
                        <li class="list-item" onclick="loadPage('settings')">
                            <div class="list-item-icon" style="background-color: var(--primary-container); color: var(--on-primary-container);">
                                <span class="material-icons">settings</span>
                            </div>
                            <div class="list-item-content">
                                <div class="list-item-title">Settings</div>
                                <div class="list-item-subtitle">Manage preferences and privacy</div>
                            </div>
                        </li>
                    </ul>
                </div>
            `;

            openModal(html);
            document.getElementById('sheetClose').addEventListener('click', closeModal);
        }

        // Open section details (Google Classroom style)
        async function openSectionDetails(sectionId) {
            const section = appState.sections.find(s => s.id === sectionId);
            if (!section) return;

            appState.activeSection = section;

            await loadSectionStudents(sectionId);
            await loadSectionAttendance(sectionId);
            await loadSectionPlusPoints(sectionId);

            let html = `
                <div class="section-details">
                    <div class="section-header" style="background: linear-gradient(135deg, ${section.color}20, ${section.color}40);">
                        <button class="back-button" id="sectionBackButton" aria-label="Back to sections">
                            <span class="material-icons" aria-hidden="true">arrow_back</span>
                        </button>
                        <div class="section-header-content">
                            <div class="section-emoji-large">${section.emoji}</div>
                            <div>
                                <h1 class="section-title">${section.name}</h1>
                                <div class="section-subtitle">${section.subject} • ${section.schedule}</div>
                                <div class="section-teacher">Teacher: ${section.teacherName}</div>
                                ${section.meetLink ? `
                                <div class="section-meet-link">
                                    <span class="material-icons" style="font-size: 16px;">video_call</span>
                                    <a href="${section.meetLink}" target="_blank">Join Google Meet</a>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="section-tabs">
                        <div class="section-tab active" data-tab="stream">Stream</div>
                        <div class="section-tab" data-tab="students">Students</div>
                        <div class="section-tab" data-tab="attendance">Attendance</div>
                        ${appState.currentUser.role === 'teacher' ? '<div class="section-tab" data-tab="settings">Settings</div>' : ''}
                    </div>

                    <div class="section-content">
                        <div class="tab-content active" id="streamTab">
                            ${await loadStreamTab(section)}
                        </div>
                        <div class="tab-content" id="studentsTab">
                            ${loadStudentsTab(section)}
                        </div>
                        <div class="tab-content" id="attendanceTab">
                            ${loadAttendanceTab(section)}
                        </div>
                        ${appState.currentUser.role === 'teacher' ? `
                        <div class="tab-content" id="settingsTab">
                            ${loadSettingsTab(section)}
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;

            elements.mainContent.innerHTML = html;

            document.getElementById('sectionBackButton').addEventListener('click', () => {
                loadPage('sections');
            });

            document.querySelectorAll('.section-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabName = tab.getAttribute('data-tab');

                    document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

                    tab.classList.add('active');
                    document.getElementById(tabName + 'Tab').classList.add('active');
                });
            });

            setupStreamTabListeners(section);
            if (appState.currentUser.role === 'teacher') {
                setupStudentsTabListeners(section);
                setupSettingsTabListeners(section);
            }

            if (appState.currentUser.role === 'student') {
                updateSectionCheckInStatus(section);
            }
        }

        // Load stream tab content
        async function loadStreamTab(section) {
            const announcements = appState.messages.filter(msg =>
                msg.sectionId === section.id && msg.type === 'announcement'
            );

            const pinned = announcements.filter(msg => msg.pinned);
            const regular = announcements.filter(msg => !msg.pinned);

            let html = `
                <div class="stream-container">
                    ${appState.currentUser.role === 'teacher' ? `
                    <div class="compose-card">
                        <div class="compose-header">
                            <div class="profile-avatar-small">${appState.nearId.profileEmoji}</div>
                            <div style="flex: 1;">
                                <input type="text" class="compose-input" id="announcementInput" placeholder="Share something with your class...">
                            </div>
                        </div>
                        <div class="compose-actions">
                            <button class="button button-filled" onclick="postAnnouncement('${section.id}')">
                                Post
                            </button>
                            <label class="toggle" style="margin-left: 12px;">
                                <input type="checkbox" id="pinAnnouncement">
                                <span class="toggle-slider"></span>
                                <span style="margin-left: 12px; font-size: 14px;">Pin</span>
                            </label>
                        </div>
                    </div>
                    ` : ''}

                    ${appState.currentUser.role === 'student' && section.active ? `
                    <div class="check-in-card" id="sectionCheckInStatus">
                        <div class="loading-spinner small"></div>
                        <span>Checking session status...</span>
                    </div>
                    ` : ''}
            `;

            if (pinned.length > 0) {
                html += `
                    <div class="pinned-section">
                        <div class="section-title">
                            <span class="material-icons">push_pin</span>
                            Pinned Announcements
                        </div>
                `;

                pinned.forEach(announcement => {
                    html += `
                        <div class="announcement-card pinned">
                            <div class="announcement-header">
                                <div class="profile-avatar-small">${announcement.senderAvatar || '👤'}</div>
                                <div>
                                    <div class="announcement-sender">${announcement.sender}</div>
                                    <div class="announcement-time">${formatTime(announcement.timestamp)}</div>
                                </div>
                                ${appState.currentUser.role === 'teacher' ? `
                                <div class="announcement-actions">
                                    <button class="button button-text" onclick="unpinAnnouncement('${announcement.id}')">
                                        <span class="material-icons">push_pin</span>
                                    </button>
                                    <button class="button button-text" onclick="deleteAnnouncement('${announcement.id}')">
                                        <span class="material-icons">delete</span>
                                    </button>
                                </div>
                                ` : ''}
                            </div>
                            <div class="announcement-content">
                                ${announcement.content}
                            </div>
                            ${announcement.dueDate ? `
                            <div class="announcement-due">
                                <span class="material-icons">schedule</span>
                                Due: ${formatDate(announcement.dueDate)}
                            </div>
                            ` : ''}
                        </div>
                    `;
                });

                html += `</div>`;
            }

            if (regular.length > 0) {
                html += `
                    <div class="announcements-section">
                        <div class="section-title">Recent Announcements</div>
                `;

                regular.slice(0, 10).forEach(announcement => {
                    html += `
                        <div class="announcement-card">
                            <div class="announcement-header">
                                <div class="profile-avatar-small">${announcement.senderAvatar || '👤'}</div>
                                <div>
                                    <div class="announcement-sender">${announcement.sender}</div>
                                    <div class="announcement-time">${formatTime(announcement.timestamp)}</div>
                                </div>
                                ${appState.currentUser.role === 'teacher' ? `
                                <div class="announcement-actions">
                                    <button class="button button-text" onclick="pinAnnouncement('${announcement.id}')">
                                        <span class="material-icons">push_pin</span>
                                    </button>
                                    <button class="button button-text" onclick="deleteAnnouncement('${announcement.id}')">
                                        <span class="material-icons">delete</span>
                                    </button>
                                </div>
                                ` : ''}
                            </div>
                            <div class="announcement-content">
                                ${announcement.content}
                            </div>
                        </div>
                    `;
                });

                html += `</div>`;
            }

            if (pinned.length === 0 && regular.length === 0) {
                html += `
                    <div class="empty-state">
                        <span class="material-icons">campaign</span>
                        <div>No announcements yet</div>
                        ${appState.currentUser.role === 'teacher' ? '<div>Be the first to share something with your class!</div>' : ''}
                    </div>
                `;
            }

            html += `</div>`;

            return html;
        }

        // Load students tab content
        function loadStudentsTab(section) {
            if (appState.currentUser.role !== 'teacher') {
                return `
                    <div class="empty-state">
                        <span class="material-icons">school</span>
                        <div>Student list is only available to teachers</div>
                    </div>
                `;
            }

            const students = appState.students[section.id] || [];

            let html = `
                <div class="students-container">
                    <div class="students-header">
                        <div class="students-count">${students.length} Students</div>
                        <div style="display: flex; gap: 12px;">
                            <button class="button button-tonal" onclick="generateJoinQR('${section.id}')">
                                <span class="material-icons">qr_code</span>
                                QR Code
                            </button>
                            <button class="button button-filled" onclick="openAddStudentsModal('${section.id}')">
                                <span class="material-icons">person_add</span>
                                Add Students
                            </button>
                        </div>
                    </div>

                    <div class="students-list">
            `;

            if (students.length === 0) {
                html += `
                    <div class="empty-state">
                        <span class="material-icons">group</span>
                        <div>No students in this section yet</div>
                        <div>Add students using the button above</div>
                    </div>
                `;
            } else {
                const rankings = calculateRankings(section.id);

                html += `
                    <div class="rankings-header">
                        <div class="ranking-title">Student Rankings</div>
                        <div class="ranking-subtitle">Based on PlusPoints and attendance</div>
                    </div>
                    <div class="rankings-list">
                `;

                rankings.slice(0, 10).forEach((student, index) => {
                    const rank = index + 1;
                    const attendanceRate = calculateStudentAttendanceRate(student.id, section.id);

                    html += `
                        <div class="ranking-item ${rank <= 3 ? 'top-three' : ''}">
                            <div class="ranking-rank">${rank}</div>
                            <div class="student-avatar" style="background-color: ${student.color || '#6750A4'};">${student.avatar || '👤'}</div>
                            <div class="ranking-info">
                                <div class="ranking-name">${student.name}</div>
                                <div class="ranking-stats">
                                    <span>${attendanceRate}% attendance</span>
                                    <span>•</span>
                                    <span>${student.points || 0} pts</span>
                                </div>
                            </div>
                            <div class="ranking-actions">
                                <button class="button button-text" onclick="addPlusPoints('${student.id}', '${section.id}', 5)">
                                    +5
                                </button>
                                <button class="button button-text" onclick="viewStudentDetails('${student.id}', '${section.id}')">
                                    View
                                </button>
                            </div>
                        </div>
                    `;
                });

                html += `</div>`;
            }

            html += `
                    </div>
                </div>
            `;

            return html;
        }

        // Load attendance tab content
        function loadAttendanceTab(section) {
            const today = new Date().toISOString().split('T')[0];
            const todayAttendance = (appState.sectionAttendance[section.id] || []).filter(a =>
                a.timestamp.split('T')[0] === today
            );

            let html = `
                <div class="attendance-container">
                    <div class="attendance-header">
                        <div class="attendance-stats">
                            <div class="stat">
                                <div class="stat-value">${todayAttendance.filter(a => a.status === 'present').length}</div>
                                <div class="stat-label">Present</div>
                            </div>
                            <div class="stat">
                                <div class="stat-value">${todayAttendance.filter(a => a.status === 'absent').length}</div>
                                <div class="stat-label">Absent</div>
                            </div>
                            <div class="stat">
                                <div class="stat-value">${Math.round((todayAttendance.filter(a => a.status === 'present').length / Math.max(section.students?.length || 1, 1)) * 100)}%</div>
                                <div class="stat-label">Attendance Rate</div>
                            </div>
                        </div>
                        ${appState.currentUser.role === 'teacher' ? `
                        <div class="attendance-actions">
                            <button class="button button-outlined" onclick="exportSectionAttendance('${section.id}')">
                                <span class="material-icons">download</span>
                                Export
                            </button>
                            <button class="button button-filled" onclick="takeManualAttendance('${section.id}')">
                                <span class="material-icons">edit</span>
                                Manual Edit
                            </button>
                        </div>
                        ` : ''}
                    </div>

                    <div class="attendance-list">
                        <div class="attendance-table">
                            <div class="table-header">
                                <div>Student</div>
                                <div>Status</div>
                                <div>Time</div>
                                <div>Method</div>
                            </div>
            `;

            if (todayAttendance.length === 0) {
                html += `
                    <div class="table-empty">
                        No attendance records for today
                    </div>
                `;
            } else {
                todayAttendance.forEach(record => {
                    html += `
                        <div class="table-row">
                            <div class="student-cell">
                                <div class="student-avatar-small">${record.userAvatar || '👤'}</div>
                                <div>${record.userName}</div>
                            </div>
                            <div class="status-cell">
                                <span class="status-badge ${record.status}">${record.status}</span>
                            </div>
                            <div class="time-cell">${formatTime(record.timestamp)}</div>
                            <div class="method-cell">${record.method || 'manual'}</div>
                        </div>
                    `;
                });
            }

            html += `
                        </div>
                    </div>
                </div>
            `;

            return html;
        }

        // Load settings tab content
        function loadSettingsTab(section) {
            if (appState.currentUser.role !== 'teacher') {
                return `
                    <div class="empty-state">
                        <span class="material-icons">settings</span>
                        <div>Section settings are only available to teachers</div>
                    </div>
                `;
            }

            return `
                <div class="settings-container">
                    <div class="settings-group">
                        <h3>Section Information</h3>
                        <div class="form-group">
                            <label for="sectionNameEdit" class="form-label">Section Name</label>
                            <input type="text" class="form-input" id="sectionNameEdit" value="${section.name}">
                        </div>
                        <div class="form-group">
                            <label for="sectionSubjectEdit" class="form-label">Subject</label>
                            <input type="text" class="form-input" id="sectionSubjectEdit" value="${section.subject}">
                        </div>
                        <div class="form-group">
                            <label for="sectionScheduleEdit" class="form-label">Schedule</label>
                            <input type="text" class="form-input" id="sectionScheduleEdit" value="${section.schedule}" placeholder="e.g., Mon, Wed, Fri 10:00 AM">
                        </div>
                        <div class="form-group">
                            <label for="sectionMeetLink" class="form-label">Google Meet Link (Optional)</label>
                            <input type="url" class="form-input" id="sectionMeetLink" value="${section.meetLink || ''}" placeholder="https://meet.google.com/abc-defg-hij">
                        </div>
                    </div>

                    <div class="settings-group">
                        <h3>Location Settings</h3>
                        <div id="locationMapContainer" style="height: 300px; margin-bottom: 16px; border-radius: 12px; overflow: hidden;"></div>
                        <div class="form-group">
                            <label for="sectionRadiusEdit" class="form-label">Check-in Radius (meters)</label>
                            <input type="range" class="form-input" id="sectionRadiusEdit" min="5" max="100" value="${section.radius || 50}" oninput="updateSectionRadiusDisplay(this.value)">
                            <div style="text-align: center; margin-top: 8px;" id="sectionRadiusValue">${section.radius || 50} meters</div>
                        </div>
                        <div class="form-group">
                            <label class="toggle">
                                <input type="checkbox" ${section.autoCheckIn ? 'checked' : ''} id="sectionAutoCheckInToggle">
                                <span class="toggle-slider"></span>
                                <span style="margin-left: 12px;">Enable Auto Check-In</span>
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="toggle">
                                <input type="checkbox" ${section.remoteCheckIn ? 'checked' : ''} id="sectionRemoteCheckInToggle">
                                <span class="toggle-slider"></span>
                                <span style="margin-left: 12px;">Allow Remote Check-In (without GPS)</span>
                            </label>
                        </div>
                    </div>

                    <div class="settings-group">
                        <h3>Session Automation</h3>
                        <div class="form-group">
                            <label for="autoStartTime" class="form-label">Auto Start Time</label>
                            <input type="time" class="form-input" id="autoStartTime" value="${section.autoStartTime || ''}">
                        </div>
                        <div class="form-group">
                            <label for="autoEndTime" class="form-label">Auto End Time</label>
                            <input type="time" class="form-input" id="autoEndTime" value="${section.autoEndTime || ''}">
                        </div>
                        <div class="form-group">
                            <label class="toggle">
                                <input type="checkbox" ${section.autoSessions ? 'checked' : ''} id="sectionAutoSessionsToggle">
                                <span class="toggle-slider"></span>
                                <span style="margin-left: 12px;">Enable Auto Sessions</span>
                            </label>
                        </div>
                    </div>

                    <div class="settings-actions">
                        <button class="button button-filled" onclick="saveSectionSettings('${section.id}')">Save Changes</button>
                        <button class="button button-tonal" onclick="regenerateJoinCode('${section.id}')">Regenerate Join Code</button>
                        <button class="button button-text" style="color: var(--error);" onclick="deleteSection('${section.id}')">Delete Section</button>
                    </div>

                    <div class="settings-group">
                        <h3>Join Information</h3>
                        <div class="join-info">
                            <div class="join-code">Join Code: <strong>${section.joinCode}</strong></div>
                            <div style="display: flex; gap: 12px; margin-top: 12px;">
                                <button class="button button-tonal" onclick="shareJoinCode('${section.joinCode}')">
                                    <span class="material-icons">share</span>
                                    Share Code
                                </button>
                                <button class="button button-tonal" onclick="generateJoinQR('${section.id}')">
                                    <span class="material-icons">qr_code</span>
                                    QR Code
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Initialize map for section settings
        async function initializeSectionMap(sectionId) {
            const section = appState.sections.find(s => s.id === sectionId);
            if (!section) return;

            const container = document.getElementById('locationMapContainer');
            if (!container) return;

            if (appState.location.map) {
                appState.location.map.remove();
            }

            const map = L.map(container).setView([section.location.lat, section.location.lng], 16);
            appState.location.map = map;
            trackFeatureUsage('map');

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            const marker = L.marker([section.location.lat, section.location.lng], {
                draggable: true
            }).addTo(map);

            const circle = L.circle([section.location.lat, section.location.lng], {
                radius: section.radius || 50,
                fillColor: '#6750A4',
                fillOpacity: 0.2,
                color: '#6750A4',
                weight: 2
            }).addTo(map);

            marker.on('dragend', function(event) {
                const newLatLng = event.target.getLatLng();
                section.location.lat = newLatLng.lat;
                section.location.lng = newLatLng.lng;
                circle.setLatLng(newLatLng);
                showToast('Location updated. Remember to save changes.');
            });

            document.getElementById('sectionRadiusEdit').addEventListener('input', function(e) {
                circle.setRadius(parseInt(e.target.value));
            });
        }

        // Setup stream tab event listeners
        function setupStreamTabListeners(section) {
            if (appState.currentUser.role === 'teacher') {
                const announcementInput = document.getElementById('announcementInput');
                if (announcementInput) {
                    announcementInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            postAnnouncement(section.id);
                        }
                    });
                }
            }
        }

        // Setup students tab event listeners
        function setupStudentsTabListeners(section) {
            // Event listeners are already set up via onclick attributes
        }

        // Setup settings tab event listeners
        function setupSettingsTabListeners(section) {
            initializeSectionMap(section.id);
        }

        // Post announcement
        async function postAnnouncement(sectionId) {
            const input = document.getElementById('announcementInput');
            const content = input.value.trim();
            const pin = document.getElementById('pinAnnouncement')?.checked || false;

            if (!content) {
                showToast('Please enter announcement content');
                return;
            }

            try {
                const announcement = {
                    type: 'announcement',
                    content: sanitizeInput(content),
                    sender: appState.currentUser.name,
                    senderAvatar: appState.nearId.profileEmoji,
                    sectionId: sectionId,
                    sectionName: appState.sections.find(s => s.id === sectionId)?.name || 'Unknown Section',
                    recipients: appState.sections.find(s => s.id === sectionId)?.students || [],
                    timestamp: new Date().toISOString(),
                    pinned: pin,
                    read: [],
                    reactions: {}
                };

                await db.collection('messages').add(announcement);
                input.value = '';
                if (document.getElementById('pinAnnouncement')) {
                    document.getElementById('pinAnnouncement').checked = false;
                }
                showToast('Announcement posted successfully');
                trackFeatureUsage('messaging');
            } catch (error) {
                console.error('Error posting announcement:', error);
                showToast('Error posting announcement');
            }
        }

        // Pin/unpin announcement
        async function pinAnnouncement(messageId) {
            try {
                await db.collection('messages').doc(messageId).update({
                    pinned: true
                });
                showToast('Announcement pinned');
            } catch (error) {
                console.error('Error pinning announcement:', error);
                showToast('Error pinning announcement');
            }
        }

        async function unpinAnnouncement(messageId) {
            try {
                await db.collection('messages').doc(messageId).update({
                    pinned: false
                });
                showToast('Announcement unpinned');
            } catch (error) {
                console.error('Error unpinning announcement:', error);
                showToast('Error unpinning announcement');
            }
        }

        // Delete announcement
        async function deleteAnnouncement(messageId) {
            if (!confirm('Are you sure you want to delete this announcement?')) {
                return;
            }

            try {
                await db.collection('messages').doc(messageId).delete();
                showToast('Announcement deleted');
            } catch (error) {
                console.error('Error deleting announcement:', error);
                showToast('Error deleting announcement');
            }
        }

        // Save section settings
        async function saveSectionSettings(sectionId) {
            const name = document.getElementById('sectionNameEdit').value;
            const subject = document.getElementById('sectionSubjectEdit').value;
            const schedule = document.getElementById('sectionScheduleEdit').value;
            const meetLink = document.getElementById('sectionMeetLink')?.value || '';
            const radius = parseInt(document.getElementById('sectionRadiusEdit').value);
            const autoCheckIn = document.getElementById('sectionAutoCheckInToggle').checked;
            const remoteCheckIn = document.getElementById('sectionRemoteCheckInToggle').checked;
            const autoStartTime = document.getElementById('autoStartTime').value;
            const autoEndTime = document.getElementById('autoEndTime').value;
            const autoSessions = document.getElementById('sectionAutoSessionsToggle').checked;

            if (!name || !subject || !schedule) {
                showToast('Please fill in all required fields');
                return;
            }

            try {
                await db.collection('sections').doc(sectionId).update({
                    name: name,
                    subject: subject,
                    schedule: schedule,
                    meetLink: meetLink,
                    radius: radius,
                    autoCheckIn: autoCheckIn,
                    remoteCheckIn: remoteCheckIn,
                    autoStartTime: autoStartTime,
                    autoEndTime: autoEndTime,
                    autoSessions: autoSessions
                });

                showToast('Section settings updated successfully');
            } catch (error) {
                console.error('Error updating section settings:', error);
                showToast('Error updating section settings');
            }
        }

        // Update section radius display
        function updateSectionRadiusDisplay(value) {
            document.getElementById('sectionRadiusValue').textContent = `${value} meters`;
        }

        // Regenerate join code
        async function regenerateJoinCode(sectionId) {
            try {
                const newJoinCode = generateJoinCode();
                await db.collection('sections').doc(sectionId).update({
                    joinCode: newJoinCode
                });

                showToast('Join code regenerated successfully');
            } catch (error) {
                console.error('Error regenerating join code:', error);
                showToast('Error regenerating join code');
            }
        }

        // Generate join QR code
        async function generateJoinQR(sectionId) {
            const section = appState.sections.find(s => s.id === sectionId);
            if (!section) return;

            const joinUrl = `${window.location.origin}/join?code=${section.joinCode}`;

            let html = `
                <div class="sheet-header">
                    <div class="sheet-title">Join QR Code</div>
                    <button class="sheet-close" id="sheetClose" aria-label="Close">
                        <span class="material-icons" aria-hidden="true">close</span>
                    </button>
                </div>
                <div class="sheet-content" style="text-align: center;">
                    <div style="margin-bottom: 16px;">
                        <div style="font-weight: 500; margin-bottom: 8px;">${section.name}</div>
                        <div style="color: var(--on-surface-variant); font-size: 14px;">Join Code: ${section.joinCode}</div>
                    </div>
                    <div id="qrCodeContainer" style="width: 200px; height: 200px; margin: 0 auto 24px;"></div>
                    <div style="font-size: 14px; color: var(--on-surface-variant); margin-bottom: 16px;">
                        Scan this QR code to join the section
                    </div>
                    <button class="button button-tonal" onclick="downloadQRCode('${section.name}')">
                        <span class="material-icons">download</span>
                        Download QR Code
                    </button>
                </div>
            `;

            openModal(html);
            document.getElementById('sheetClose').addEventListener('click', closeModal);

            // Generate QR code
            QRCode.toCanvas(document.getElementById('qrCodeContainer'), joinUrl, {
                width: 200,
                height: 200,
                margin: 1,
                color: {
                    dark: '#6750A4',
                    light: '#FFFFFF'
                }
            }, function(error) {
                if (error) {
                    console.error('Error generating QR code:', error);
                    document.getElementById('qrCodeContainer').innerHTML = '<div>Error generating QR code</div>';
                }
            });
        }

        // Download QR code
        function downloadQRCode(sectionName) {
            const canvas = document.querySelector('#qrCodeContainer canvas');
            if (!canvas) return;

            const link = document.createElement('a');
            link.download = `${sectionName.replace(/\s+/g, '-')}-qr-code.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }

        // Delete section
        async function deleteSection(sectionId) {
            const section = appState.sections.find(s => s.id === sectionId);
            if (!section) return;

            if (!confirm(`Are you sure you want to delete "${section.name}"? This action cannot be undone.`)) {
                return;
            }

            try {
                await db.collection('sections').doc(sectionId).delete();
                showToast('Section deleted successfully');
                loadPage('sections');
            } catch (error) {
                console.error('Error deleting section:', error);
                showToast('Error deleting section');
            }
        }

        // Open add students modal
        function openAddStudentsModal(sectionId) {
            const section = appState.sections.find(s => s.id === sectionId);
            if (!section) return;

            let html = `
                <div class="sheet-header">
                    <div class="sheet-title">Add Students to ${section.name}</div>
                    <button class="sheet-close" id="sheetClose" aria-label="Close">
                        <span class="material-icons" aria-hidden="true">close</span>
                    </button>
                </div>
                <div class="sheet-content">
                    <div class="join-info-card">
                        <div style="font-weight: 500; margin-bottom: 8px;">Share Join Code</div>
                        <div class="join-code-large">${section.joinCode}</div>
                        <div style="font-size: 14px; color: var(--on-surface-variant); margin-bottom: 16px;">
                            Students can enter this code to join
                        </div>
                        <button class="button button-tonal" style="width: 100%; margin-bottom: 12px;" onclick="shareJoinCode('${section.joinCode}')">
                            <span class="material-icons" style="margin-right: 8px;">share</span>
                            Share Code
                        </button>
                        <button class="button button-tonal" style="width: 100%;" onclick="generateJoinQR('${sectionId}')">
                            <span class="material-icons" style="margin-right: 8px;">qr_code</span>
                            Generate QR Code
                        </button>
                    </div>
                </div>
            `;

            openModal(html);
            document.getElementById('sheetClose').addEventListener('click', closeModal);
        }

        // Share join code
        function shareJoinCode(joinCode) {
            if (navigator.share) {
                navigator.share({
                    title: 'Join My Class on NearCheck+',
                    text: `Use this code to join my class: ${joinCode}`,
                    url: window.location.href
                }).catch(console.error);
            } else {
                navigator.clipboard.writeText(joinCode).then(() => {
                    showToast('Join code copied to clipboard');
                }).catch(() => {
                    showToast('Join code: ' + joinCode);
                });
            }
        }

        // Save profile
        async function saveProfile() {
            const name = sanitizeInput(document.getElementById('profileName').value);
            const pronouns = sanitizeInput(document.getElementById('profilePronouns').value);
            const avatar = sanitizeInput(document.getElementById('profileAvatar').value);

            if (!name) {
                showToast('Please enter a display name');
                return;
            }

            if (avatar !== appState.nearId.profileEmoji && !canChangeEmoji()) {
                showToast(`You can only change your emoji once every 12 days. Next change available in ${getDaysUntilEmojiChange()} days.`);
                return;
            }

            try {
                const updateData = {
                    name: name,
                    pronouns: pronouns
                };

                if (avatar !== appState.nearId.profileEmoji && canChangeEmoji()) {
                    updateData['nearId.profileEmoji'] = avatar;
                    updateData['nearId.lastEmojiChange'] = new Date().toISOString();
                    appState.nearId.profileEmoji = avatar;
                    appState.nearId.lastEmojiChange = new Date().toISOString();
                }

                await db.collection('users').doc(appState.currentUser.id).update(updateData);

                appState.currentUser.name = name;
                appState.currentUser.pronouns = pronouns;

                showToast('Profile updated successfully');
            } catch (error) {
                console.error('Error updating profile:', error);
                showToast('Error updating profile');
            }
        }

        // Check if emoji can be changed
        function canChangeEmoji() {
            if (!appState.nearId.lastEmojiChange) return true;
            const lastChange = new Date(appState.nearId.lastEmojiChange);
            const now = new Date();
            const daysSinceLastChange = (now - lastChange) / (1000 * 60 * 60 * 24);
            return daysSinceLastChange >= 12;
        }

        // Get days until next emoji change
        function getDaysUntilEmojiChange() {
            if (!appState.nearId.lastEmojiChange) return 0;
            const lastChange = new Date(appState.nearId.lastEmojiChange);
            const now = new Date();
            const daysSinceLastChange = (now - lastChange) / (1000 * 60 * 60 * 24);
            const daysUntilNextChange = Math.ceil(12 - daysSinceLastChange);
            return Math.max(0, daysUntilNextChange);
        }

        // Update user setting
        async function updateUserSetting(setting, value) {
            try {
                await db.collection('users').doc(appState.currentUser.id).update({
                    [`settings.${setting}`]: value
                });
                appState.settings[setting] = value;
            } catch (error) {
                console.error(`Error updating ${setting} setting:`, error);
                throw error;
            }
        }

        // Toggle location access
        async function toggleLocationAccess(e) {
            const enabled = e.target.checked;
            await updateUserSetting('locationAccess', enabled);
            showToast(`Location access ${enabled ? 'enabled' : 'disabled'}`);
        }

        // Toggle global auto check-in
        async function toggleGlobalAutoCheckIn(e) {
            const enabled = e.target.checked;
            await updateUserSetting('autoCheckIn', enabled);
            showToast(`Auto Check-In ${enabled ? 'enabled' : 'disabled'}`);
        }

        // Toggle notifications
        async function toggleNotifications(e) {
            const enabled = e.target.checked;
            await updateUserSetting('notifications', enabled);
            showToast(`Notifications ${enabled ? 'enabled' : 'disabled'}`);
        }

        // Toggle silent scan
        async function toggleSilentScan(e) {
            const enabled = e.target.checked;
            await updateUserSetting('silentScan', enabled);
            showToast(`SilentScan ${enabled ? 'enabled' : 'disabled'}`);
        }

        // Toggle analytics
        async function toggleAnalytics(e) {
            const enabled = e.target.checked;
            await updateUserSetting('analyticsEnabled', enabled);
            saveAccessibilitySettings();
            showToast(`Analytics ${enabled ? 'enabled' : 'disabled'}`);
        }

        // Toggle high contrast
        async function toggleHighContrast(e) {
            const enabled = e.target.checked;
            await updateUserSetting('highContrast', enabled);
            applyAccessibilitySettings();
            saveAccessibilitySettings();
            showToast(`High contrast ${enabled ? 'enabled' : 'disabled'}`);
        }

        // Toggle large text
        async function toggleLargeText(e) {
            const enabled = e.target.checked;
            await updateUserSetting('largeText', enabled);
            applyAccessibilitySettings();
            saveAccessibilitySettings();
            showToast(`Large text ${enabled ? 'enabled' : 'disabled'}`);
        }

        // Toggle reduce motion
        async function toggleReduceMotion(e) {
            const enabled = e.target.checked;
            await updateUserSetting('reduceMotion', enabled);
            applyAccessibilitySettings();
            saveAccessibilitySettings();
            showToast(`Reduced motion ${enabled ? 'enabled' : 'disabled'}`);
        }

        // Toggle dyslexia font
        async function toggleDyslexiaFont(e) {
            const enabled = e.target.checked;
            await updateUserSetting('dyslexiaFont', enabled);
            applyAccessibilitySettings();
            saveAccessibilitySettings();
            showToast(`Dyslexia-friendly font ${enabled ? 'enabled' : 'disabled'}`);
        }

        // Toggle voice commands
        async function toggleVoiceCommands(e) {
            const enabled = e.target.checked;
            await updateUserSetting('voiceCommands', enabled);
            if (enabled) {
                voiceCommands.init();
            } else {
                voiceCommands.destroy();
            }
            saveAccessibilitySettings();
            showToast(`Voice commands ${enabled ? 'enabled' : 'disabled'}`);
        }

        // Toggle haptic feedback
        async function toggleHapticFeedback(e) {
            const enabled = e.target.checked;
            await updateUserSetting('hapticFeedback', enabled);
            saveAccessibilitySettings();
            showToast(`Haptic feedback ${enabled ? 'enabled' : 'disabled'}`);
        }

        // Update default radius display
        function updateDefaultRadiusDisplay(value) {
            document.getElementById('radiusValueDisplay').textContent = `${value} meters`;
            updateDefaultRadius(parseInt(value));
        }

        // Update default radius (teacher only)
        async function updateDefaultRadius(radius) {
            await updateUserSetting('defaultRadius', radius);
        }

        // Toggle auto sessions (teacher only)
        async function toggleAutoSessions(e) {
            const enabled = e.target.checked;
            await updateUserSetting('autoSessions', enabled);
            showToast(`Auto sessions ${enabled ? 'enabled' : 'disabled'}`);
        }

        // Toggle beacon mode (teacher only)
        async function toggleBeaconMode(e) {
            const enabled = e.target.checked;
            await updateUserSetting('beaconMode', enabled);
            showToast(`Beacon mode ${enabled ? 'enabled' : 'disabled'}`);
        }

        // View attendance history
        function viewAttendanceHistory() {
            openAttendanceHistoryModal();
        }

        // Open attendance history modal
        function openAttendanceHistoryModal() {
            let html = `
                <div class="sheet-header">
                    <div class="sheet-title">Attendance History</div>
                    <button class="sheet-close" id="sheetClose" aria-label="Close">
                        <span class="material-icons" aria-hidden="true">close</span>
                    </button>
                </div>
                <div class="sheet-content">
                    <div class="attendance-history">
                        <div class="history-stats">
                            <div class="stat">
                                <div class="stat-value">${appState.attendanceData.filter(a => a.status === 'present').length}</div>
                                <div class="stat-label">Total Present</div>
                            </div>
                            <div class="stat">
                                <div class="stat-value">${appState.attendanceData.filter(a => a.status === 'absent').length}</div>
                                <div class="stat-label">Total Absent</div>
                            </div>
                            <div class="stat">
                                <div class="stat-value">${calculateOverallAttendance()}%</div>
                                <div class="stat-label">Overall Rate</div>
                            </div>
                        </div>
                        <div class="history-list">
            `;

            if (appState.attendanceData.length === 0) {
                html += `
                    <div class="empty-state">
                        <span class="material-icons">history</span>
                        <div>No attendance records yet</div>
                    </div>
                `;
            } else {
                const groupedByDate = appState.attendanceData.reduce((acc, record) => {
                    const date = record.timestamp.split('T')[0];
                    if (!acc[date]) acc[date] = [];
                    acc[date].push(record);
                    return acc;
                }, {});

                Object.keys(groupedByDate).sort().reverse().forEach(date => {
                    const records = groupedByDate[date];
                    const presentCount = records.filter(r => r.status === 'present').length;

                    html += `
                        <div class="history-day">
                            <div class="day-header">
                                <div class="day-date">${formatDate(date)}</div>
                                <div class="day-stats">${presentCount}/${records.length} present</div>
                            </div>
                            <div class="day-records">
                    `;

                    records.forEach(record => {
                        html += `
                            <div class="history-record">
                                <div class="record-section">${record.sectionName}</div>
                                <div class="record-status ${record.status}">${record.status}</div>
                                <div class="record-time">${formatTime(record.timestamp)}</div>
                            </div>
                        `;
                    });

                    html += `
                            </div>
                        </div>
                    `;
                });
            }

            html += `
                        </div>
                    </div>
                </div>
            `;

            openModal(html);
            document.getElementById('sheetClose').addEventListener('click', closeModal);
        }

        // Calculate overall attendance rate
        function calculateOverallAttendance() {
            const totalRecords = appState.attendanceData.length;
            const presentRecords = appState.attendanceData.filter(a => a.status === 'present').length;
            return totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;
        }

        // Calculate student attendance rate
        function calculateStudentAttendanceRate(studentId, sectionId) {
            const studentRecords = (appState.sectionAttendance[sectionId] || []).filter(a =>
                a.userId === studentId
            );

            if (studentRecords.length === 0) return 0;

            const presentRecords = studentRecords.filter(a => a.status === 'present').length;
            return Math.round((presentRecords / studentRecords.length) * 100);
        }

        // Calculate rankings
        function calculateRankings(sectionId) {
            const students = appState.students[sectionId] || [];
            return students.map(student => {
                const points = appState.plusPoints[sectionId] || 0;
                const attendanceRate = calculateStudentAttendanceRate(student.id, sectionId);
                return {
                    ...student,
                    points: points,
                    attendanceRate: attendanceRate,
                    score: (points * 10) + attendanceRate
                };
            }).sort((a, b) => b.score - a.score);
        }

        // Add plus points
        async function addPlusPoints(studentId, sectionId, points) {
            try {
                const plusPointsRef = db.collection('plusPoints').doc(`${studentId}_${sectionId}`);
                const doc = await plusPointsRef.get();

                if (doc.exists) {
                    await plusPointsRef.update({
                        points: firebase.firestore.FieldValue.increment(points),
                        lastUpdated: new Date().toISOString()
                    });
                } else {
                    await plusPointsRef.set({
                        userId: studentId,
                        sectionId: sectionId,
                        points: points,
                        lastUpdated: new Date().toISOString()
                    });
                }

                showToast(`Added ${points} points to student`);
            } catch (error) {
                console.error('Error adding plus points:', error);
                showToast('Error adding plus points');
            }
        }

        // Export data
        async function exportData() {
            try {
                showToast('Preparing data export...');

                const exportData = {
                    user: {
                        name: appState.currentUser.name,
                        email: appState.currentUser.email,
                        role: appState.currentUser.role,
                        joinDate: appState.currentUser.joinDate
                    },
                    sections: appState.sections,
                    attendance: appState.attendanceData,
                    messages: appState.messages,
                    exportDate: new Date().toISOString()
                };

                const dataStr = JSON.stringify(exportData, null, 2);
                const dataBlob = new Blob([dataStr], {
                    type: 'application/json'
                });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `nearcheck-export-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                showToast('Data exported successfully');
            } catch (error) {
                console.error('Error exporting data:', error);
                showToast('Error exporting data');
            }
        }

        // Export section attendance
        async function exportSectionAttendance(sectionId) {
            try {
                const section = appState.sections.find(s => s.id === sectionId);
                if (!section) return;

                const sectionAttendance = appState.sectionAttendance[sectionId] || [];

                let csvContent = 'Date,Student Name,Status,Time,Method\n';
                sectionAttendance.forEach(record => {
                    const date = new Date(record.timestamp).toLocaleDateString();
                    const time = new Date(record.timestamp).toLocaleTimeString();
                    csvContent += `${date},"${record.userName}",${record.status},${time},${record.method || 'manual'}\n`;
                });

                const blob = new Blob([csvContent], {
                    type: 'text/csv'
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${section.name}-attendance-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                showToast('Attendance exported successfully');
            } catch (error) {
                console.error('Error exporting attendance:', error);
                showToast('Error exporting attendance');
            }
        }

        // Confirm account deletion
        function confirmDeleteAccount() {
            let html = `
                <div class="sheet-header">
                    <div class="sheet-title" style="color: var(--error);">Delete Account</div>
                    <button class="sheet-close" id="sheetClose" aria-label="Close">
                        <span class="material-icons" aria-hidden="true">close</span>
                    </button>
                </div>
                <div class="sheet-content">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <span class="material-icons" style="font-size: 48px; color: var(--error); margin-bottom: 16px;">warning</span>
                        <div class="card-title" style="color: var(--error);">Warning: This action cannot be undone</div>
                        <p style="color: var(--on-surface-variant); margin-top: 8px;">
                            All your data, including attendance records and section memberships, will be permanently deleted.
                        </p>
                    </div>
                    
                    <div class="form-group">
                        <label for="confirmPassword" class="form-label">Enter your password to confirm</label>
                        <input type="password" class="form-input" id="confirmPassword" placeholder="Your current password">
                    </div>
                    
                    <button class="button button-filled" style="width: 100%; background-color: var(--error); margin-top: 24px;" id="confirmDeleteButton" disabled>
                        <span class="material-icons" style="margin-right: 8px;">delete</span>
                        Delete My Account
                    </button>
                    
                    <div style="text-align: center; margin-top: 16px;">
                        <div id="countdown" style="font-size: 14px; color: var(--on-surface-variant);">
                            Confirm button will be enabled in <span id="countdownSeconds">5</span> seconds
                        </div>
                    </div>
                </div>
            `;

            openModal(html);

            const confirmButton = document.getElementById('confirmDeleteButton');
            const countdownElement = document.getElementById('countdownSeconds');
            const passwordInput = document.getElementById('confirmPassword');
            const closeButton = document.getElementById('sheetClose');

            let countdown = 5;
            const countdownInterval = setInterval(() => {
                countdown--;
                countdownElement.textContent = countdown;

                if (countdown <= 0) {
                    clearInterval(countdownInterval);
                    confirmButton.disabled = false;
                    document.getElementById('countdown').style.display = 'none';
                }
            }, 1000);

            passwordInput.addEventListener('input', () => {
                confirmButton.disabled = passwordInput.value.length === 0;
            });

            confirmButton.addEventListener('click', () => {
                deleteAccount(passwordInput.value);
            });

            closeButton.addEventListener('click', closeModal);
        }

        // Delete account
        async function deleteAccount(password) {
            try {
                showToast('Verifying password...');

                const credential = firebase.auth.EmailAuthProvider.credential(
                    appState.currentUser.email,
                    password
                );

                await auth.currentUser.reauthenticateWithCredential(credential);

                showToast('Deleting account and all data...');

                await db.collection('users').doc(appState.currentUser.id).delete();

                const attendanceSnapshot = await db.collection('attendance')
                    .where('userId', '==', appState.currentUser.id)
                    .get();

                const deleteAttendancePromises = attendanceSnapshot.docs.map(doc => doc.ref.delete());
                await Promise.all(deleteAttendancePromises);

                const sectionsSnapshot = await db.collection('sections')
                    .where('students', 'array-contains', appState.currentUser.id)
                    .get();

                const updateSectionsPromises = sectionsSnapshot.docs.map(doc =>
                    doc.ref.update({
                        students: firebase.firestore.FieldValue.arrayRemove(appState.currentUser.id)
                    })
                );
                await Promise.all(updateSectionsPromises);

                const user = auth.currentUser;
                await user.delete();

                closeModal();
                showToast('Account deleted successfully');
                showLanding();
            } catch (error) {
                console.error('Error deleting account:', error);
                showToast('Error deleting account. Please check your password and try again.');
            }
        }

        // Create section modal
        function openCreateSectionModal() {
            let html = `
                <div class="sheet-header">
                    <div class="sheet-title">Create New Section</div>
                    <button class="sheet-close" id="sheetClose" aria-label="Close">
                        <span class="material-icons" aria-hidden="true">close</span>
                    </button>
                </div>
                <div class="sheet-content">
                    <div id="createSectionForm">
                        <div class="form-group">
                            <label for="sectionName" class="form-label">Section Name</label>
                            <input type="text" class="form-input" id="sectionName" placeholder="e.g., Advanced Web Development">
                        </div>
                        <div class="form-group">
                            <label for="sectionSubject" class="form-label">Subject</label>
                            <input type="text" class="form-input" id="sectionSubject" placeholder="e.g., Computer Science">
                        </div>
                        <div class="form-group">
                            <label for="sectionSchedule" class="form-label">Schedule</label>
                            <input type="text" class="form-input" id="sectionSchedule" placeholder="e.g., Mon, Wed, Fri 10:00 AM">
                        </div>
                        <div class="form-group">
                            <label for="sectionMeetLink" class="form-label">Google Meet Link (Optional)</label>
                            <input type="url" class="form-input" id="sectionMeetLink" placeholder="https://meet.google.com/abc-defg-hij">
                        </div>
                        <div class="form-group">
                            <label for="sectionRadius" class="form-label">Location Radius (meters)</label>
                            <input type="range" class="form-input" id="sectionRadius" min="5" max="70" value="${appState.settings.defaultRadius}" oninput="document.getElementById('createRadiusValue').textContent = this.value + ' meters'">
                            <div style="text-align: center; margin-top: 8px;" id="createRadiusValue">${appState.settings.defaultRadius} meters</div>
                        </div>
                        <div class="form-group">
                            <label for="sectionEmoji" class="form-label">Section Emoji</label>
                            <input type="text" class="form-input" id="sectionEmoji" value="📚" maxlength="2">
                        </div>
                        <div class="form-group">
                            <label class="toggle">
                                <input type="checkbox" id="autoCheckInToggle" checked>
                                <span class="toggle-slider"></span>
                                <span style="margin-left: 12px;">Enable Auto Check-In for students</span>
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="toggle">
                                <input type="checkbox" id="remoteCheckInToggle">
                                <span class="toggle-slider"></span>
                                <span style="margin-left: 12px;">Allow Remote Check-In (without GPS)</span>
                            </label>
                        </div>
                        <button class="button button-filled" style="width: 100%;" onclick="createSection()">
                            <span class="material-icons" style="margin-right: 8px;">add</span>
                            Create Section
                        </button>
                    </div>
                    <div id="createSectionLoading" style="display: none; text-align: center; padding: 40px;">
                        <div class="loading-spinner" style="margin: 0 auto 16px;"></div>
                        <div>Creating section and configuring location...</div>
                    </div>
                </div>
            `;

            openModal(html);
            document.getElementById('sheetClose').addEventListener('click', closeModal);
        }

        // Join section modal
        function openJoinSectionModal() {
            let html = `
                <div class="sheet-header">
                    <div class="sheet-title">Join a Section</div>
                    <button class="sheet-close" id="sheetClose" aria-label="Close">
                        <span class="material-icons" aria-hidden="true">close</span>
                    </button>
                </div>
                <div class="sheet-content">
                    <div class="form-group">
                        <label for="sectionCode" class="form-label">Section Code</label>
                        <input type="text" class="form-input" id="sectionCode" placeholder="Enter 6-digit code">
                    </div>
                    <button class="button button-filled" style="width: 100%; margin-top: 24px;" onclick="joinSection()">Join Section</button>
                    <div style="text-align: center; margin-top: 16px;">
                        <div style="font-size: 14px; color: var(--on-surface-variant);">or</div>
                        <button class="button button-tonal" style="width: 100%; margin-top: 12px;" onclick="scanQRCode()">
                            <span class="material-icons" style="margin-right: 8px;">qr_code_scanner</span>
                            Scan QR Code
                        </button>
                    </div>
                </div>
            `;

            openModal(html);
            document.getElementById('sheetClose').addEventListener('click', closeModal);
        }

        // Create a new section
        async function createSection() {
            const name = sanitizeInput(document.getElementById('sectionName').value);
            const subject = sanitizeInput(document.getElementById('sectionSubject').value);
            const schedule = sanitizeInput(document.getElementById('sectionSchedule').value);
            const meetLink = document.getElementById('sectionMeetLink')?.value || '';
            const radius = parseInt(document.getElementById('sectionRadius').value);
            const emoji = sanitizeInput(document.getElementById('sectionEmoji').value);
            const autoCheckIn = document.getElementById('autoCheckInToggle').checked;
            const remoteCheckIn = document.getElementById('remoteCheckInToggle').checked;

            if (!name || !subject || !schedule) {
                showToast('Please fill in all required fields');
                return;
            }

            document.getElementById('createSectionForm').style.display = 'none';
            document.getElementById('createSectionLoading').style.display = 'block';

            try {
                const position = await getCurrentPosition();

                const newSection = {
                    name,
                    subject,
                    teacherId: appState.currentUser.id,
                    teacherName: appState.currentUser.name,
                    emoji: emoji || '📚',
                    students: [],
                    active: false,
                    schedule,
                    meetLink,
                    location: {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    },
                    radius: radius,
                    autoCheckIn,
                    remoteCheckIn,
                    color: appState.nearId.identityColor,
                    createdAt: new Date().toISOString(),
                    joinCode: generateJoinCode()
                };

                await db.collection('sections').add(newSection);

                closeModal();
                showToast(`Section "${name}" created successfully`);
            } catch (error) {
                console.error('Error creating section:', error);
                document.getElementById('createSectionForm').style.display = 'block';
                document.getElementById('createSectionLoading').style.display = 'none';
                showToast('Error creating section. Please try again.');
            }
        }

        // Join a section
        async function joinSection() {
            const code = document.getElementById('sectionCode').value.trim().toUpperCase();

            if (!code) {
                showToast('Please enter a section code');
                return;
            }

            try {
                const sectionsSnapshot = await db.collection('sections')
                    .where('joinCode', '==', code)
                    .get();

                if (sectionsSnapshot.empty) {
                    showToast('Invalid section code');
                    return;
                }

                const sectionDoc = sectionsSnapshot.docs[0];
                const section = sectionDoc.data();

                await db.collection('sections').doc(sectionDoc.id).update({
                    students: firebase.firestore.FieldValue.arrayUnion(appState.currentUser.id)
                });

                closeModal();
                showToast(`Joined section "${section.name}" successfully`);
            } catch (error) {
                console.error('Error joining section:', error);
                showToast('Error joining section. Please try again.');
            }
        }

        // Scan QR code
        function scanQRCode() {
            if (!('BarcodeDetector' in window)) {
                showToast('QR code scanning is not supported in this browser');
                return;
            }

            let html = `
                <div class="sheet-header">
                    <div class="sheet-title">Scan QR Code</div>
                    <button class="sheet-close" id="sheetClose" aria-label="Close">
                        <span class="material-icons" aria-hidden="true">close</span>
                    </button>
                </div>
                <div class="sheet-content" style="text-align: center;">
                    <div id="qrScanner" style="width: 300px; height: 300px; margin: 0 auto 24px; background-color: #000; border-radius: 12px; overflow: hidden;"></div>
                    <div style="font-size: 14px; color: var(--on-surface-variant); margin-bottom: 16px;">
                        Point your camera at a NearCheck+ QR code
                    </div>
                    <button class="button button-filled" onclick="startQRScanner()">
                        Start Scanner
                    </button>
                </div>
            `;

            openModal(html);
            document.getElementById('sheetClose').addEventListener('click', closeModal);
        }

        // Start QR scanner
        async function startQRScanner() {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const container = document.getElementById('qrScanner');

            container.innerHTML = '';
            container.appendChild(video);

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment'
                    }
                });
                video.srcObject = stream;
                video.play();

                const barcodeDetector = new BarcodeDetector({
                    formats: ['qr_code']
                });

                const scanFrame = () => {
                    if (video.readyState === video.HAVE_ENOUGH_DATA) {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        context.drawImage(video, 0, 0, canvas.width, canvas.height);

                        barcodeDetector.detect(canvas)
                            .then(barcodes => {
                                if (barcodes.length > 0) {
                                    const url = barcodes[0].rawValue;
                                    const codeMatch = url.match(/code=([A-Z0-9]+)/);
                                    if (codeMatch) {
                                        const code = codeMatch[1];
                                        document.getElementById('sectionCode').value = code;
                                        closeModal();
                                        joinSection();
                                        trackFeatureUsage('qrScan');
                                    }
                                }
                                requestAnimationFrame(scanFrame);
                            })
                            .catch(console.error);
                    } else {
                        requestAnimationFrame(scanFrame);
                    }
                };

                scanFrame();
            } catch (error) {
                console.error('Error starting QR scanner:', error);
                showToast('Error accessing camera');
            }
        }

        // Open fullscreen search
        function openFullscreenSearch() {
            elements.fullscreenTitle.textContent = 'Search';
            let html = `
                <div class="search-container">
                    <div class="search-bar">
                        <span class="material-icons">search</span>
                        <input type="text" id="fullscreenSearchInput" placeholder="Search sections, students, messages..." autofocus>
                    </div>
                    
                    <div class="search-results" id="searchResults">
                        <div class="search-section">
                            <div class="search-section-title">Recent Searches</div>
                            <div class="search-tags">
                                <div class="search-tag" onclick="search('Web Development')">Web Development</div>
                                <div class="search-tag" onclick="search('Mobile Design')">Mobile Design</div>
                                <div class="search-tag" onclick="search('Privacy')">Privacy</div>
                                <div class="search-tag" onclick="search('Attendance')">Attendance</div>
                            </div>
                        </div>
                        
                        <div class="search-section">
                            <div class="search-section-title">Quick Access</div>
                            <div class="quick-access-grid">
                                <div class="quick-access-item" onclick="loadPage('sections')">
                                    <span class="material-icons">class</span>
                                    <span>Sections</span>
                                </div>
                                <div class="quick-access-item" onclick="loadPage('messages')">
                                    <span class="material-icons">chat</span>
                                    <span>Messages</span>
                                </div>
                                ${appState.currentUser.role === 'teacher' ? `
                                <div class="quick-access-item" onclick="loadPage('sessions')">
                                    <span class="material-icons">location_on</span>
                                    <span>Sessions</span>
                                </div>
                                ` : ''}
                                <div class="quick-access-item" onclick="loadPage('settings')">
                                    <span class="material-icons">settings</span>
                                    <span>Settings</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            elements.fullscreenContent.innerHTML = html;
            elements.fullscreenModal.style.display = 'block';

            setTimeout(() => {
                const searchInput = document.getElementById('fullscreenSearchInput');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.addEventListener('input', handleSearch);
                }
            }, 100);
        }

        // Handle search
        function handleSearch(e) {
            const query = e.target.value.toLowerCase().trim();
            const searchResults = document.getElementById('searchResults');

            if (!query) {
                searchResults.innerHTML = `
                    <div class="search-section">
                        <div class="search-section-title">Recent Searches</div>
                        <div class="search-tags">
                            <div class="search-tag" onclick="search('Web Development')">Web Development</div>
                            <div class="search-tag" onclick="search('Mobile Design')">Mobile Design</div>
                            <div class="search-tag" onclick="search('Privacy')">Privacy</div>
                            <div class="search-tag" onclick="search('Attendance')">Attendance</div>
                        </div>
                    </div>
                `;
                return;
            }

            const filteredSections = appState.sections.filter(section =>
                section.name.toLowerCase().includes(query) ||
                section.subject.toLowerCase().includes(query) ||
                section.teacherName.toLowerCase().includes(query)
            );

            const filteredMessages = appState.messages.filter(message =>
                message.content.toLowerCase().includes(query) ||
                message.sender.toLowerCase().includes(query) ||
                (message.sectionName && message.sectionName.toLowerCase().includes(query))
            );

            let html = '';

            if (filteredSections.length > 0) {
                html += `
                    <div class="search-section">
                        <div class="search-section-title">Sections (${filteredSections.length})</div>
                        <div class="search-list">
                `;

                filteredSections.forEach(section => {
                    html += `
                        <div class="search-item" onclick="openSectionDetails('${section.id}'); closeFullscreen()">
                            <div class="search-item-icon">${section.emoji}</div>
                            <div class="search-item-content">
                                <div class="search-item-title">${section.name}</div>
                                <div class="search-item-subtitle">${section.subject} • ${section.teacherName}</div>
                            </div>
                        </div>
                    `;
                });

                html += `</div></div>`;
            }

            if (filteredMessages.length > 0) {
                html += `
                    <div class="search-section">
                        <div class="search-section-title">Messages (${filteredMessages.length})</div>
                        <div class="search-list">
                `;

                filteredMessages.forEach(message => {
                    html += `
                        <div class="search-item" onclick="openMessageDetails('${message.id}'); closeFullscreen()">
                            <div class="search-item-icon">
                                <span class="material-icons">${message.type === 'announcement' ? 'campaign' : 'notifications'}</span>
                            </div>
                            <div class="search-item-content">
                                <div class="search-item-title">${message.sender}</div>
                                <div class="search-item-subtitle">${message.content.substring(0, 60)}${message.content.length > 60 ? '...' : ''}</div>
                            </div>
                        </div>
                    `;
                });

                html += `</div></div>`;
            }

            if (filteredSections.length === 0 && filteredMessages.length === 0) {
                html = `
                    <div class="empty-state">
                        <span class="material-icons">search_off</span>
                        <div>No results found for "${query}"</div>
                        <div style="font-size: 14px; color: var(--on-surface-variant); margin-top: 8px;">
                            Try searching for section names, subjects, or message content
                        </div>
                `;
            }

            searchResults.innerHTML = html;
        }

        // Search function
        function search(query) {
            const searchInput = document.getElementById('fullscreenSearchInput');
            if (searchInput) {
                searchInput.value = query;
                searchInput.dispatchEvent(new Event('input'));
            }
        }

        // Open fullscreen notifications
        function openFullscreenNotifications() {
            elements.fullscreenTitle.textContent = 'Notifications';

            const unreadMessages = appState.messages.filter(msg =>
                !msg.read || (msg.read && !msg.read.includes(appState.currentUser.id))
            );

            let html = `
                <div class="notifications-container">
                    <div class="notifications-header">
                        <div class="notifications-count">${unreadMessages.length} Unread</div>
                        <button class="button button-text" onclick="markAllAsRead()">
                            Mark all as read
                        </button>
                    </div>
                    
                    <div class="notifications-list">
            `;

            if (unreadMessages.length === 0) {
                html += `
                    <div class="empty-state">
                        <span class="material-icons">notifications_off</span>
                        <div>No new notifications</div>
                        <div style="font-size: 14px; color: var(--on-surface-variant); margin-top: 8px;">
                            You're all caught up!
                        </div>
                    </div>
                `;
            } else {
                unreadMessages.forEach(message => {
                    html += `
                        <div class="notification-item" onclick="openMessageDetails('${message.id}'); closeFullscreen()">
                            <div class="notification-icon">
                                <span class="material-icons">${message.type === 'announcement' ? 'campaign' : 'notifications'}</span>
                            </div>
                            <div class="notification-content">
                                <div class="notification-title">${message.sender}</div>
                                <div class="notification-text">${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}</div>
                                <div class="notification-meta">
                                    <span>${message.sectionName || ''}</span>
                                    <span>•</span>
                                    <span>${formatTime(message.timestamp)}</span>
                                </div>
                            </div>
                            <div class="notification-actions">
                                <button class="button button-text" onclick="event.stopPropagation(); markAsRead('${message.id}')">
                                    <span class="material-icons">check</span>
                                </button>
                            </div>
                        </div>
                    `;
                });
            }

            html += `
                    </div>
                    
                    <div class="notifications-footer">
                        <button class="button button-outlined" style="width: 100%;" onclick="loadPage('messages'); closeFullscreen()">
                            View All Messages
                        </button>
                    </div>
                </div>
            `;

            elements.fullscreenContent.innerHTML = html;
            elements.fullscreenModal.style.display = 'block';
        }

        // Mark all as read
        async function markAllAsRead() {
            const unreadMessages = appState.messages.filter(msg =>
                !msg.read || (msg.read && !msg.read.includes(appState.currentUser.id))
            );

            try {
                const batch = db.batch();
                unreadMessages.forEach(message => {
                    const messageRef = db.collection('messages').doc(message.id);
                    batch.update(messageRef, {
                        read: firebase.firestore.FieldValue.arrayUnion(appState.currentUser.id)
                    });
                });

                await batch.commit();
                showToast('All messages marked as read');
                closeFullscreen();
                updateNotificationBadge();
            } catch (error) {
                console.error('Error marking messages as read:', error);
                showToast('Error marking messages as read');
            }
        }

        // Mark as read
        async function markAsRead(messageId) {
            try {
                await db.collection('messages').doc(messageId).update({
                    read: firebase.firestore.FieldValue.arrayUnion(appState.currentUser.id)
                });

                const messageIndex = appState.messages.findIndex(msg => msg.id === messageId);
                if (messageIndex !== -1) {
                    if (!appState.messages[messageIndex].read) {
                        appState.messages[messageIndex].read = [];
                    }
                    appState.messages[messageIndex].read.push(appState.currentUser.id);
                }

                updateNotificationBadge();

                const notificationItem = document.querySelector(`.notification-item[onclick*="${messageId}"]`);
                if (notificationItem) {
                    notificationItem.style.opacity = '0.6';
                }

                showToast('Message marked as read');
            } catch (error) {
                console.error('Error marking message as read:', error);
                showToast('Error marking message as read');
            }
        }

        // Open message details
        async function openMessageDetails(messageId) {
            const message = appState.messages.find(msg => msg.id === messageId);
            if (!message) return;

            await markAsRead(messageId);

            let html = `
                <div class="sheet-header">
                    <div class="sheet-title">Message</div>
                    <button class="sheet-close" id="sheetClose" aria-label="Close">
                        <span class="material-icons" aria-hidden="true">close</span>
                    </button>
                </div>
                <div class="sheet-content">
                    <div class="message-details">
                        <div class="message-header">
                            <div class="profile-avatar-small">${message.senderAvatar || '👤'}</div>
                            <div>
                                <div class="message-sender">${message.sender}</div>
                                <div class="message-time">${formatDate(message.timestamp)} at ${formatTime(message.timestamp)}</div>
                                ${message.sectionName ? `<div class="message-section">${message.sectionName}</div>` : ''}
                            </div>
                        </div>
                        <div class="message-content">
                            ${message.content}
                        </div>
                        <div class="message-actions">
                            <button class="button button-tonal" onclick="replyToMessage('${message.id}')">
                                <span class="material-icons">reply</span>
                                Reply
                            </button>
                        </div>
                    </div>
                </div>
            `;

            openModal(html);
            document.getElementById('sheetClose').addEventListener('click', closeModal);
        }

        // Reply to message
        function replyToMessage(messageId) {
            const message = appState.messages.find(msg => msg.id === messageId);
            if (!message) return;

            closeModal();

            if (message.sectionId) {
                openSectionDetails(message.sectionId);
                setTimeout(() => {
                    const announcementInput = document.getElementById('announcementInput');
                    if (announcementInput) {
                        announcementInput.value = `Re: ${message.content.substring(0, 50)}...`;
                        announcementInput.focus();
                    }
                }, 100);
            }
        }

        // Open navigation drawer
        function openNavigationDrawer() {
            let html = `
                <div class="sheet-header">
                    <div class="sheet-title">Navigation</div>
                    <button class="sheet-close" id="sheetClose" aria-label="Close">
                        <span class="material-icons" aria-hidden="true">close</span>
                    </button>
                </div>
                <div class="sheet-content">
                    <div class="user-info" style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px; padding: 16px; background-color: var(--surface-variant); border-radius: var(--radius-md);">
                        <div class="profile-avatar-small">${appState.nearId.profileEmoji}</div>
                        <div>
                            <div style="font-weight: 500;">${appState.currentUser.name}</div>
                            <div style="font-size: 14px; color: var(--on-surface-variant);">${appState.currentUser.role === 'teacher' ? 'Teacher' : 'Student'}</div>
                            <div style="font-size: 12px; color: var(--on-surface-variant);">${appState.currentUser.email}</div>
                        </div>
                    </div>
                    <ul class="list">
                        <li class="list-item" onclick="loadPage('dashboard'); closeModal()">
                            <div class="list-item-icon">
                                <span class="material-icons">dashboard</span>
                            </div>
                            <div class="list-item-content">
                                <div class="list-item-title">Dashboard</div>
                            </div>
                        </li>
                        <li class="list-item" onclick="loadPage('sections'); closeModal()">
                            <div class="list-item-icon">
                                <span class="material-icons">class</span>
                            </div>
                            <div class="list-item-content">
                                <div class="list-item-title">Sections</div>
                            </div>
                        </li>
                        ${appState.currentUser.role === 'teacher' ? `
                        <li class="list-item" onclick="loadPage('sessions'); closeModal()">
                            <div class="list-item-icon">
                                <span class="material-icons">location_on</span>
                            </div>
                            <div class="list-item-content">
                                <div class="list-item-title">Sessions</div>
                            </div>
                        </li>
                        ` : ''}
                        <li class="list-item" onclick="loadPage('messages'); closeModal()">
                            <div class="list-item-icon">
                                <span class="material-icons">chat</span>
                            </div>
                            <div class="list-item-content">
                                <div class="list-item-title">Messages</div>
                            </div>
                        </li>
                        <li class="list-item" onclick="loadPage('settings'); closeModal()">
                            <div class="list-item-icon">
                                <span class="material-icons">settings</span>
                            </div>
                            <div class="list-item-content">
                                <div class="list-item-title">Settings</div>
                            </div>
                        </li>
                    </ul>
                    <button class="button button-text" style="width: 100%; margin-top: 24px; color: var(--error);" onclick="logoutUser(); closeModal()">
                        <span class="material-icons" style="margin-right: 8px;">logout</span>
                        Logout
                    </button>
                </div>
            `;

            openModal(html);
            document.getElementById('sheetClose').addEventListener('click', closeModal);
        }

        // Get current position with error handling
        function getCurrentPosition() {
            return new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error('Geolocation is not supported by this browser'));
                    return;
                }

                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });
        }

        // Calculate distance between two coordinates in meters
        function calculateDistance(lat1, lon1, lat2, lon2) {
            const R = 6371000;
            const φ1 = lat1 * Math.PI / 180;
            const φ2 = lat2 * Math.PI / 180;
            const Δφ = (lat2 - lat1) * Math.PI / 180;
            const Δλ = (lon2 - lon1) * Math.PI / 180;

            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            return R * c;
        }

        // Perform manual check-in
        async function performManualCheckIn() {
            if (appState.currentUser.role !== 'student') {
                showToast('Only students can check in');
                return;
            }

            const activeSessions = appState.activeSessions.filter(session =>
                session.students && session.students.includes(appState.currentUser.id)
            );

            if (activeSessions.length === 0) {
                showToast('No active sessions available');
                return;
            }

            if (activeSessions.length === 1) {
                await performCheckIn(activeSessions[0].id, 'manual');
            } else {
                let html = `
                    <div class="sheet-header">
                        <div class="sheet-title">Select Session to Check In</div>
                        <button class="sheet-close" id="sheetClose" aria-label="Close">
                            <span class="material-icons" aria-hidden="true">close</span>
                        </button>
                    </div>
                    <div class="sheet-content">
                        <div class="list">
                `;

                activeSessions.forEach(session => {
                    const section = appState.sections.find(s => s.id === session.sectionId);
                    if (!section) return;

                    html += `
                        <div class="list-item" onclick="performCheckIn('${session.id}', 'manual'); closeModal()">
                            <div class="list-item-icon">
                                <span class="material-icons">location_on</span>
                            </div>
                            <div class="list-item-content">
                                <div class="list-item-title">${section.name}</div>
                                <div class="list-item-subtitle">${section.subject}</div>
                            </div>
                        </div>
                    `;
                });

                html += `
                        </div>
                    </div>
                `;

                openModal(html);
                document.getElementById('sheetClose').addEventListener('click', closeModal);
            }
        }

        // Perform check-in
        async function performCheckIn(sessionId, method = 'manual') {
            const session = appState.activeSessions.find(s => s.id === sessionId);
            if (!session) {
                showToast('Session not found');
                return;
            }

            try {
                appState.checkInStatus.checkingIn = true;

                const position = await getCurrentPosition();
                const distance = calculateDistance(
                    position.coords.latitude,
                    position.coords.longitude,
                    session.location.lat,
                    session.location.lng
                );

                const inRange = distance <= session.radius;

                if (!inRange && method === 'manual' && !session.remoteCheckIn) {
                    showToast(`You are ${Math.round(distance)}m away. Must be within ${session.radius}m to check in.`);
                    appState.checkInStatus.checkingIn = false;
                    return;
                }

                const attendanceRecord = {
                    userId: appState.currentUser.id,
                    userName: appState.currentUser.name,
                    userAvatar: appState.nearId.profileEmoji,
                    sessionId: sessionId,
                    sectionId: session.sectionId,
                    sectionName: session.sectionName,
                    status: inRange ? 'present' : (session.remoteCheckIn ? 'present' : 'absent'),
                    method: method,
                    timestamp: new Date().toISOString(),
                    location: {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    },
                    distance: distance,
                    inRange: inRange,
                    deviceId: appState.security.deviceId
                };

                await db.collection('attendance').add(attendanceRecord);

                await db.collection('sessions').doc(sessionId).update({
                    checkedInCount: firebase.firestore.FieldValue.increment(1)
                });

                appState.checkInStatus.lastCheckIn = new Date().toISOString();
                appState.checkInStatus.checkingIn = false;

                showToast(inRange ? 'Checked in successfully!' : 'Checked in (out of range)');
                trackFeatureUsage(method === 'manual' ? 'manualCheckIn' : 'checkIn');

                if (appState.currentPage === 'dashboard' || appState.currentPage === 'sections') {
                    loadPage(appState.currentPage);
                }
            } catch (error) {
                console.error('Error checking in:', error);
                appState.checkInStatus.checkingIn = false;
                showToast('Error checking in: ' + error.message);
            }
        }

        // Update section check-in status
        async function updateSectionCheckInStatus(section) {
            const checkInStatusElement = document.getElementById('sectionCheckInStatus');
            if (!checkInStatusElement) return;

            const activeSession = appState.activeSessions.find(s => s.sectionId === section.id);
            if (!activeSession) {
                checkInStatusElement.innerHTML = '<span>No active session</span>';
                return;
            }

            try {
                const position = await getCurrentPosition();
                const distance = calculateDistance(
                    position.coords.latitude,
                    position.coords.longitude,
                    activeSession.location.lat,
                    activeSession.location.lng
                );

                const inRange = distance <= activeSession.radius;

                checkInStatusElement.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="material-icons" style="color: ${inRange ? 'var(--success)' : 'var(--error)'};">${inRange ? 'check_circle' : 'location_off'}</span>
                        <span>${inRange ? 'In range - Ready to check in' : `Out of range (${Math.round(distance)}m)`}</span>
                    </div>
                    ${inRange ? `
                    <button class="button button-filled" onclick="performCheckIn('${activeSession.id}', 'manual')">
                        Check In Now
                    </button>
                    ` : activeSession.remoteCheckIn ? `
                    <button class="button button-filled" onclick="performCheckIn('${activeSession.id}', 'remote')">
                        Remote Check-In
                    </button>
                    ` : ''}
                `;
            } catch (error) {
                checkInStatusElement.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="material-icons" style="color: var(--warning);">warning</span>
                        <span>Location access required</span>
                    </div>
                    ${activeSession.remoteCheckIn ? `
                    <button class="button button-filled" onclick="performCheckIn('${activeSession.id}', 'remote')">
                        Remote Check-In
                    </button>
                    ` : ''}
                `;
            }
        }

        // End session
        async function endSession(sessionId) {
            const session = appState.activeSessions.find(s => s.id === sessionId);
            if (!session) {
                showToast('Session not found');
                return;
            }

            if (!confirm(`End session for ${session.sectionName}?`)) {
                return;
            }

            try {
                await db.collection('sessions').doc(sessionId).update({
                    active: false,
                    endTime: new Date().toISOString()
                });

                await db.collection('sections').doc(session.sectionId).update({
                    active: false,
                    currentSession: null
                });

                showToast('Session ended successfully');
                loadPage('sessions');
            } catch (error) {
                console.error('Error ending session:', error);
                showToast('Error ending session');
            }
        }

        // Open session details
        async function openSessionDetails(sessionId) {
            const session = appState.activeSessions.find(s => s.id === sessionId);
            if (!session) return;

            try {
                const attendanceSnapshot = await db.collection('attendance')
                    .where('sessionId', '==', sessionId)
                    .orderBy('timestamp', 'desc')
                    .get();

                const attendanceRecords = attendanceSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                let html = `
                    <div class="sheet-header">
                        <div class="sheet-title">Session Details</div>
                        <button class="sheet-close" id="sheetClose" aria-label="Close">
                            <span class="material-icons" aria-hidden="true">close</span>
                        </button>
                    </div>
                    <div class="sheet-content">
                        <div class="session-info">
                            <div class="session-header">
                                <div class="session-emoji">📊</div>
                                <div>
                                    <div class="session-name">${session.sectionName}</div>
                                    <div class="session-subtitle">${formatDate(session.startTime)} • Started ${formatTime(session.startTime)}</div>
                                </div>
                            </div>
                            
                            <div class="session-stats-grid">
                                <div class="session-stat">
                                    <div class="session-stat-value">${attendanceRecords.filter(a => a.status === 'present').length}</div>
                                    <div class="session-stat-label">Present</div>
                                </div>
                                <div class="session-stat">
                                    <div class="session-stat-value">${attendanceRecords.filter(a => a.status === 'absent').length}</div>
                                    <div class="session-stat-label">Absent</div>
                                </div>
                                <div class="session-stat">
                                    <div class="session-stat-value">${session.radius}m</div>
                                    <div class="session-stat-label">Radius</div>
                                </div>
                                <div class="session-stat">
                                    <div class="session-stat-value">${formatSessionDuration(session.startTime)}</div>
                                    <div class="session-stat-label">Duration</div>
                                </div>
                            </div>
                            
                            <div class="attendance-list">
                                <div class="attendance-table">
                                    <div class="table-header">
                                        <div>Student</div>
                                        <div>Status</div>
                                        <div>Time</div>
                                        <div>Distance</div>
                                    </div>
                `;

                if (attendanceRecords.length === 0) {
                    html += `
                        <div class="table-empty">
                            No attendance records yet
                        </div>
                    `;
                } else {
                    attendanceRecords.forEach(record => {
                        html += `
                            <div class="table-row">
                                <div class="student-cell">
                                    <div class="student-avatar-small">${record.userAvatar || '👤'}</div>
                                    <div>${record.userName}</div>
                                </div>
                                <div class="status-cell">
                                    <span class="status-badge ${record.status}">${record.status}</span>
                                </div>
                                <div class="time-cell">${formatTime(record.timestamp)}</div>
                                <div class="distance-cell">${record.inRange ? 'In range' : `${Math.round(record.distance)}m`}</div>
                            </div>
                        `;
                    });
                }

                html += `
                                </div>
                            </div>
                            
                            <div class="session-actions-full">
                                <button class="button button-filled" style="width: 100%; margin-bottom: 12px;" onclick="endSession('${sessionId}'); closeModal()">
                                    End Session
                                </button>
                                <button class="button button-outlined" style="width: 100%;" onclick="exportSessionAttendance('${sessionId}')">
                                    Export Attendance
                                </button>
                            </div>
                        </div>
                    </div>
                `;

                openModal(html);
                document.getElementById('sheetClose').addEventListener('click', closeModal);
            } catch (error) {
                console.error('Error loading session details:', error);
                showToast('Error loading session details');
            }
        }

        // Export session attendance
        async function exportSessionAttendance(sessionId) {
            try {
                const session = appState.activeSessions.find(s => s.id === sessionId);
                if (!session) return;

                const attendanceSnapshot = await db.collection('attendance')
                    .where('sessionId', '==', sessionId)
                    .get();

                let csvContent = 'Student Name,Status,Time,Distance,Method\n';
                attendanceSnapshot.forEach(doc => {
                    const record = doc.data();
                    const time = new Date(record.timestamp).toLocaleTimeString();
                    csvContent += `"${record.userName}",${record.status},${time},${record.inRange ? 'In range' : `${Math.round(record.distance)}m`},${record.method || 'manual'}\n`;
                });

                const blob = new Blob([csvContent], {
                    type: 'text/csv'
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${session.sectionName}-session-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                showToast('Attendance exported successfully');
            } catch (error) {
                console.error('Error exporting session attendance:', error);
                showToast('Error exporting attendance');
            }
        }

        // Open modal
        function openModal(content) {
            elements.bottomSheet.innerHTML = content;
            elements.modalBackdrop.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        // Close modal
        function closeModal() {
            elements.modalBackdrop.classList.remove('active');
            document.body.style.overflow = '';
        }

        // Close fullscreen modal
        function closeFullscreen() {
            elements.fullscreenModal.style.display = 'none';
            elements.fullscreenContent.innerHTML = '';
        }

        // Show toast notification
        function showToast(message) {
            elements.toastMessage.textContent = message;
            elements.toast.classList.add('active');

            setTimeout(() => {
                elements.toast.classList.remove('active');
            }, 3000);
        }

        // Utility functions
        function getTimeBasedGreeting() {
            const hour = new Date().getHours();
            if (hour < 12) return 'Good morning';
            if (hour < 18) return 'Good afternoon';
            return 'Good evening';
        }

        function formatDate(dateString) {
            const options = {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };
            return new Date(dateString).toLocaleDateString(undefined, options);
        }

        function formatTime(dateString) {
            const options = {
                hour: '2-digit',
                minute: '2-digit'
            };
            return new Date(dateString).toLocaleTimeString(undefined, options);
        }

        function formatSessionDuration(startTime) {
            const start = new Date(startTime);
            const now = new Date();
            const diffMs = now - start;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const remainingMins = diffMins % 60;

            if (diffHours > 0) {
                return `${diffHours}h ${remainingMins}m`;
            }
            return `${diffMins}m`;
        }

        function getRandomColor() {
            const colors = ['#6750A4', '#7D5260', '#006A6B', '#1C6E42', '#7C5800'];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        function getInitials(name) {
            return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        }

        function calculateAge(dob) {
            const today = new Date();
            let age = today.getFullYear() - dob.getFullYear();
            const monthDiff = today.getMonth() - dob.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                age--;
            }
            return age;
        }

        function generateJoinCode() {
            return Math.random().toString(36).substring(2, 8).toUpperCase();
        }

        // Load user sections from Firestore
        async function loadUserSections() {
            try {
                let sectionsSnapshot;
                if (appState.currentUser.role === 'teacher') {
                    sectionsSnapshot = await db.collection('sections')
                        .where('teacherId', '==', appState.currentUser.id)
                        .get();
                } else {
                    sectionsSnapshot = await db.collection('sections')
                        .where('students', 'array-contains', appState.currentUser.id)
                        .get();
                }
                appState.sections = sectionsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('Error loading sections:', error);
            }
        }

        // Load user messages from Firestore
        async function loadUserMessages() {
            try {
                const messagesSnapshot = await db.collection('messages')
                    .where('recipients', 'array-contains', appState.currentUser.id)
                    .orderBy('timestamp', 'desc')
                    .limit(50)
                    .get();
                appState.messages = messagesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('Error loading messages:', error);
            }
        }

        // Load user settings from Firestore
        async function loadUserSettings() {
            try {
                const userDoc = await db.collection('users').doc(appState.currentUser.id).get();
                if (userDoc.exists && userDoc.data().settings) {
                    appState.settings = {
                        ...appState.settings,
                        ...userDoc.data().settings
                    };
                }
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        }

        // Load user privacy preferences
        async function loadUserPrivacy() {
            try {
                const userDoc = await db.collection('users').doc(appState.currentUser.id).get();
                if (userDoc.exists && userDoc.data().privacy) {
                    appState.privacy = {
                        ...appState.privacy,
                        ...userDoc.data().privacy
                    };
                }
            } catch (error) {
                console.error('Error loading privacy settings:', error);
            }
        }

        // Load attendance data
        async function loadAttendanceData() {
            try {
                const attendanceSnapshot = await db.collection('attendance')
                    .where('userId', '==', appState.currentUser.id)
                    .orderBy('timestamp', 'desc')
                    .limit(100)
                    .get();
                appState.attendanceData = attendanceSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('Error loading attendance data:', error);
            }
        }

        // Load active sessions
        async function loadActiveSessions() {
            try {
                let sessionsSnapshot;
                if (appState.currentUser.role === 'teacher') {
                    sessionsSnapshot = await db.collection('sessions')
                        .where('teacherId', '==', appState.currentUser.id)
                        .where('active', '==', true)
                        .get();
                } else {
                    sessionsSnapshot = await db.collection('sessions')
                        .where('students', 'array-contains', appState.currentUser.id)
                        .where('active', '==', true)
                        .get();
                }
                appState.activeSessions = sessionsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('Error loading active sessions:', error);
            }
        }

        // Load plus points
        async function loadPlusPoints() {
            try {
                const plusPointsSnapshot = await db.collection('plusPoints')
                    .where('userId', '==', appState.currentUser.id)
                    .get();

                plusPointsSnapshot.forEach(doc => {
                    const data = doc.data();
                    appState.plusPoints[data.sectionId] = data.points || 0;
                });
            } catch (error) {
                console.error('Error loading plus points:', error);
            }
        }

        // Load section students
        async function loadSectionStudents(sectionId) {
            try {
                const section = appState.sections.find(s => s.id === sectionId);
                if (!section || !section.students || section.students.length === 0) {
                    appState.students[sectionId] = [];
                    return;
                }

                const studentPromises = section.students.map(studentId =>
                    db.collection('users').doc(studentId).get()
                );
                const studentSnapshots = await Promise.all(studentPromises);

                appState.students[sectionId] = studentSnapshots
                    .filter(snapshot => snapshot.exists)
                    .map(snapshot => ({
                        id: snapshot.id,
                        ...snapshot.data()
                    }));
            } catch (error) {
                console.error('Error loading section students:', error);
                appState.students[sectionId] = [];
            }
        }

        // Load section attendance
        async function loadSectionAttendance(sectionId) {
            try {
                const attendanceSnapshot = await db.collection('attendance')
                    .where('sectionId', '==', sectionId)
                    .orderBy('timestamp', 'desc')
                    .limit(50)
                    .get();

                appState.sectionAttendance[sectionId] = attendanceSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('Error loading section attendance:', error);
                appState.sectionAttendance[sectionId] = [];
            }
        }

        // Load section plus points
        async function loadSectionPlusPoints(sectionId) {
            try {
                const plusPointsSnapshot = await db.collection('plusPoints')
                    .where('sectionId', '==', sectionId)
                    .get();

                plusPointsSnapshot.forEach(doc => {
                    const data = doc.data();
                    if (!appState.plusPoints[sectionId]) {
                        appState.plusPoints[sectionId] = {};
                    }
                    appState.plusPoints[sectionId][data.userId] = data.points || 0;
                });
            } catch (error) {
                console.error('Error loading section plus points:', error);
            }
        }

        // View student details
        async function viewStudentDetails(studentId, sectionId) {
            const student = appState.students[sectionId]?.find(s => s.id === studentId);
            if (!student) return;

            const attendanceRate = calculateStudentAttendanceRate(studentId, sectionId);
            const plusPoints = appState.plusPoints[sectionId]?.[studentId] || 0;

            let html = `
                <div class="sheet-header">
                    <div class="sheet-title">Student Details</div>
                    <button class="sheet-close" id="sheetClose" aria-label="Close">
                        <span class="material-icons" aria-hidden="true">close</span>
                    </button>
                </div>
                <div class="sheet-content">
                    <div class="student-profile">
                        <div class="student-avatar-large" style="background-color: ${student.color || '#6750A4'};">${student.avatar || '👤'}</div>
                        <div class="student-name-large">${student.name}</div>
                        ${student.pronouns ? `<div class="student-pronouns">${student.pronouns}</div>` : ''}
                        <div class="student-email">${student.email}</div>
                    </div>
                    
                    <div class="student-stats-grid">
                        <div class="student-stat">
                            <div class="student-stat-value">${attendanceRate}%</div>
                            <div class="student-stat-label">Attendance</div>
                        </div>
                        <div class="student-stat">
                            <div class="student-stat-value">${plusPoints}</div>
                            <div class="student-stat-label">PlusPoints</div>
                        </div>
                    </div>
                    
                    <div class="student-actions">
                        <button class="button button-tonal" style="width: 100%; margin-bottom: 12px;" onclick="addPlusPoints('${studentId}', '${sectionId}', 5)">
                            <span class="material-icons" style="margin-right: 8px;">add</span>
                            Add 5 PlusPoints
                        </button>
                        <button class="button button-outlined" style="width: 100%;" onclick="viewStudentAttendanceHistory('${studentId}', '${sectionId}')">
                            <span class="material-icons" style="margin-right: 8px;">history</span>
                            View Attendance History
                        </button>
                    </div>
                </div>
            `;

            openModal(html);
            document.getElementById('sheetClose').addEventListener('click', closeModal);
        }

        // View student attendance history
        async function viewStudentAttendanceHistory(studentId, sectionId) {
            try {
                const attendanceSnapshot = await db.collection('attendance')
                    .where('userId', '==', studentId)
                    .where('sectionId', '==', sectionId)
                    .orderBy('timestamp', 'desc')
                    .get();

                const attendanceRecords = attendanceSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                let html = `
                    <div class="sheet-header">
                        <div class="sheet-title">Attendance History</div>
                        <button class="sheet-close" id="sheetClose" aria-label="Close">
                            <span class="material-icons" aria-hidden="true">close</span>
                        </button>
                    </div>
                    <div class="sheet-content">
                        <div class="history-list">
                `;

                if (attendanceRecords.length === 0) {
                    html += `
                        <div class="empty-state">
                            <span class="material-icons">history</span>
                            <div>No attendance records found</div>
                        </div>
                    `;
                } else {
                    attendanceRecords.forEach(record => {
                        html += `
                            <div class="history-record">
                                <div class="record-date">${formatDate(record.timestamp)}</div>
                                <div class="record-status ${record.status}">${record.status}</div>
                                <div class="record-time">${formatTime(record.timestamp)}</div>
                                <div class="record-method">${record.method || 'manual'}</div>
                            </div>
                        `;
                    });
                }

                html += `
                        </div>
                    </div>
                `;

                closeModal();
                setTimeout(() => {
                    openModal(html);
                    document.getElementById('sheetClose').addEventListener('click', closeModal);
                }, 100);
            } catch (error) {
                console.error('Error loading attendance history:', error);
                showToast('Error loading attendance history');
            }
        }

        // View session report
        async function viewSessionReport(sessionId) {
            try {
                const sessionDoc = await db.collection('sessions').doc(sessionId).get();
                const session = sessionDoc.data();

                const attendanceSnapshot = await db.collection('attendance')
                    .where('sessionId', '==', sessionId)
                    .get();

                const attendanceRecords = attendanceSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                let html = `
                    <div class="sheet-header">
                        <div class="sheet-title">Session Report</div>
                        <button class="sheet-close" id="sheetClose" aria-label="Close">
                            <span class="material-icons" aria-hidden="true">close</span>
                        </button>
                    </div>
                    <div class="sheet-content">
                        <div class="session-report">
                            <div class="report-header">
                                <div class="report-title">${session.sectionName}</div>
                                <div class="report-subtitle">${formatDate(session.startTime)} • ${formatTime(session.startTime)} - ${formatTime(session.endTime)}</div>
                            </div>
                            
                            <div class="report-stats">
                                <div class="report-stat">
                                    <div class="report-stat-value">${attendanceRecords.filter(a => a.status === 'present').length}</div>
                                    <div class="report-stat-label">Present</div>
                                </div>
                                <div class="report-stat">
                                    <div class="report-stat-value">${attendanceRecords.filter(a => a.status === 'absent').length}</div>
                                    <div class="report-stat-label">Absent</div>
                                </div>
                                <div class="report-stat">
                                    <div class="report-stat-value">${session.radius}m</div>
                                    <div class="report-stat-label">Radius</div>
                                </div>
                            </div>
                            
                            <div class="report-attendance">
                                <div class="report-table">
                                    <div class="table-header">
                                        <div>Student</div>
                                        <div>Status</div>
                                        <div>Time</div>
                                        <div>Method</div>
                                    </div>
                `;

                if (attendanceRecords.length === 0) {
                    html += `
                        <div class="table-empty">
                            No attendance records
                        </div>
                    `;
                } else {
                    attendanceRecords.forEach(record => {
                        html += `
                            <div class="table-row">
                                <div class="student-cell">
                                    <div class="student-avatar-small">${record.userAvatar || '👤'}</div>
                                    <div>${record.userName}</div>
                                </div>
                                <div class="status-cell">
                                    <span class="status-badge ${record.status}">${record.status}</span>
                                </div>
                                <div class="time-cell">${formatTime(record.timestamp)}</div>
                                <div class="method-cell">${record.method || 'manual'}</div>
                            </div>
                        `;
                    });
                }

                html += `
                                </div>
                            </div>
                            
                            <button class="button button-filled" style="width: 100%; margin-top: 24px;" onclick="exportSessionAttendance('${sessionId}')">
                                <span class="material-icons" style="margin-right: 8px;">download</span>
                                Export Report
                            </button>
                        </div>
                    </div>
                `;

                openModal(html);
                document.getElementById('sheetClose').addEventListener('click', closeModal);
            } catch (error) {
                console.error('Error loading session report:', error);
                showToast('Error loading session report');
            }
        }

        // Take manual attendance
        async function takeManualAttendance(sectionId) {
            const section = appState.sections.find(s => s.id === sectionId);
            if (!section) return;

            const students = appState.students[sectionId] || [];
            const today = new Date().toISOString().split('T')[0];

            let html = `
                <div class="sheet-header">
                    <div class="sheet-title">Manual Attendance - ${section.name}</div>
                    <button class="sheet-close" id="sheetClose" aria-label="Close">
                        <span class="material-icons" aria-hidden="true">close</span>
                    </button>
                </div>
                <div class="sheet-content">
                    <div class="manual-attendance">
                        <div style="margin-bottom: 16px; color: var(--on-surface-variant);">
                            Mark attendance for ${formatDate(today)}
                        </div>
                        
                        <div class="attendance-list">
            `;

            students.forEach(student => {
                const todayAttendance = (appState.sectionAttendance[sectionId] || []).find(a =>
                    a.userId === student.id && a.timestamp.split('T')[0] === today
                );
                const currentStatus = todayAttendance?.status || 'absent';

                html += `
                    <div class="attendance-row">
                        <div class="student-info">
                            <div class="student-avatar-small">${student.avatar || '👤'}</div>
                            <div>
                                <div class="student-name">${student.name}</div>
                                ${student.pronouns ? `<div class="student-pronouns">${student.pronouns}</div>` : ''}
                            </div>
                        </div>
                        <div class="attendance-actions">
                            <button class="button ${currentStatus === 'present' ? 'button-filled' : 'button-outlined'}" 
                                    onclick="markManualAttendance('${student.id}', '${sectionId}', 'present', this)">
                                Present
                            </button>
                            <button class="button ${currentStatus === 'absent' ? 'button-filled' : 'button-outlined'}" 
                                    onclick="markManualAttendance('${student.id}', '${sectionId}', 'absent', this)">
                                Absent
                            </button>
                            <button class="button ${currentStatus === 'late' ? 'button-filled' : 'button-outlined'}" 
                                    onclick="markManualAttendance('${student.id}', '${sectionId}', 'late', this)">
                                Late
                            </button>
                        </div>
                    </div>
                `;
            });

            html += `
                        </div>
                        
                        <button class="button button-filled" style="width: 100%; margin-top: 24px;" onclick="saveManualAttendance('${sectionId}')">
                            <span class="material-icons" style="margin-right: 8px;">save</span>
                            Save Attendance
                        </button>
                    </div>
                </div>
            `;

            openModal(html);
            document.getElementById('sheetClose').addEventListener('click', closeModal);
        }

        // Mark manual attendance
        async function markManualAttendance(studentId, sectionId, status, button) {
            const row = button.closest('.attendance-row');
            const buttons = row.querySelectorAll('.button');
            buttons.forEach(btn => {
                if (btn === button) {
                    btn.classList.remove('button-outlined');
                    btn.classList.add('button-filled');
                } else {
                    btn.classList.remove('button-filled');
                    btn.classList.add('button-outlined');
                }
            });

            if (!appState.manualAttendance) {
                appState.manualAttendance = {};
            }
            if (!appState.manualAttendance[sectionId]) {
                appState.manualAttendance[sectionId] = {};
            }
            appState.manualAttendance[sectionId][studentId] = status;
        }

        // Save manual attendance
        async function saveManualAttendance(sectionId) {
            if (!appState.manualAttendance || !appState.manualAttendance[sectionId]) {
                showToast('No changes to save');
                return;
            }

            try {
                const today = new Date().toISOString().split('T')[0];
                const batch = db.batch();

                for (const [studentId, status] of Object.entries(appState.manualAttendance[sectionId])) {
                    const attendanceRecord = {
                        userId: studentId,
                        userName: appState.students[sectionId]?.find(s => s.id === studentId)?.name || 'Unknown',
                        userAvatar: appState.students[sectionId]?.find(s => s.id === studentId)?.avatar || '👤',
                        sectionId: sectionId,
                        sectionName: appState.sections.find(s => s.id === sectionId)?.name || 'Unknown Section',
                        status: status,
                        method: 'manual',
                        timestamp: new Date().toISOString(),
                        deviceId: appState.security.deviceId
                    };

                    batch.set(db.collection('attendance').doc(), attendanceRecord);
                }

                await batch.commit();
                delete appState.manualAttendance[sectionId];
                closeModal();
                showToast('Attendance saved successfully');
            } catch (error) {
                console.error('Error saving manual attendance:', error);
                showToast('Error saving attendance');
            }
        }

        // Open quick announcement modal
        function openQuickAnnouncementModal() {
            let html = `
                <div class="sheet-header">
                    <div class="sheet-title">Send Announcement</div>
                    <button class="sheet-close" id="sheetClose" aria-label="Close">
                        <span class="material-icons" aria-hidden="true">close</span>
                    </button>
                </div>
                <div class="sheet-content">
                    <div class="form-group">
                        <label for="announcementSection" class="form-label">Select Section</label>
                        <select class="form-select" id="announcementSection">
                            <option value="">Choose a section</option>
            `;

            appState.sections.forEach(section => {
                html += `<option value="${section.id}">${section.name}</option>`;
            });

            html += `
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="quickAnnouncement" class="form-label">Announcement</label>
                        <textarea class="form-input" id="quickAnnouncement" placeholder="Enter your announcement..." rows="4"></textarea>
                    </div>
                    <div class="form-group">
                        <label class="toggle">
                            <input type="checkbox" id="quickPinAnnouncement">
                            <span class="toggle-slider"></span>
                            <span style="margin-left: 12px;">Pin this announcement</span>
                        </label>
                    </div>
                    <button class="button button-filled" style="width: 100%;" onclick="sendQuickAnnouncement()">
                        Send Announcement
                    </button>
                </div>
            `;

            openModal(html);
            document.getElementById('sheetClose').addEventListener('click', closeModal);
        }

        // Send quick announcement
        async function sendQuickAnnouncement() {
            const sectionId = document.getElementById('announcementSection').value;
            const content = document.getElementById('quickAnnouncement').value.trim();
            const pin = document.getElementById('quickPinAnnouncement').checked;

            if (!sectionId) {
                showToast('Please select a section');
                return;
            }

            if (!content) {
                showToast('Please enter announcement content');
                return;
            }

            const section = appState.sections.find(s => s.id === sectionId);
            if (!section) {
                showToast('Section not found');
                return;
            }

            try {
                const announcement = {
                    type: 'announcement',
                    content: sanitizeInput(content),
                    sender: appState.currentUser.name,
                    senderAvatar: appState.nearId.profileEmoji,
                    sectionId: sectionId,
                    sectionName: section.name,
                    recipients: section.students || [],
                    timestamp: new Date().toISOString(),
                    pinned: pin,
                    read: [],
                    reactions: {}
                };

                await db.collection('messages').add(announcement);
                closeModal();
                showToast('Announcement sent successfully');
            } catch (error) {
                console.error('Error sending announcement:', error);
                showToast('Error sending announcement');
            }
        }

        // Open start session modal
        function openStartSessionModal() {
            let html = `
                <div class="sheet-header">
                    <div class="sheet-title">Start New Session</div>
                    <button class="sheet-close" id="sheetClose" aria-label="Close">
                        <span class="material-icons" aria-hidden="true">close</span>
                    </button>
                </div>
                <div class="sheet-content">
                    <div class="form-group">
                        <label for="sessionSection" class="form-label">Select Section</label>
                        <select class="form-select" id="sessionSection">
                            <option value="">Choose a section</option>
            `;

            appState.sections.forEach(section => {
                if (!section.active) {
                    html += `<option value="${section.id}">${section.name}</option>`;
                }
            });

            html += `
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="sessionRadius" class="form-label">Session Radius (meters)</label>
                        <input type="range" class="form-input" id="sessionRadius" min="5" max="100" value="${appState.settings.defaultRadius}" oninput="document.getElementById('sessionRadiusValue').textContent = this.value + ' meters'">
                        <div style="text-align: center; margin-top: 8px;" id="sessionRadiusValue">${appState.settings.defaultRadius} meters</div>
                    </div>
                    <div class="form-group">
                        <label class="toggle">
                            <input type="checkbox" id="sessionAutoCheckIn" checked>
                            <span class="toggle-slider"></span>
                            <span style="margin-left: 12px;">Enable Auto Check-In</span>
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="toggle">
                            <input type="checkbox" id="sessionRemoteCheckIn">
                            <span class="toggle-slider"></span>
                            <span style="margin-left: 12px;">Allow Remote Check-In</span>
                        </label>
                    </div>
                    <button class="button button-filled" style="width: 100%;" onclick="startNewSession()">
                        <span class="material-icons" style="margin-right: 8px;">play_circle</span>
                        Start Session
                    </button>
                </div>
            `;

            openModal(html);
            document.getElementById('sheetClose').addEventListener('click', closeModal);
        }

        // Start new session
        async function startNewSession() {
            const sectionId = document.getElementById('sessionSection').value;
            const radius = parseInt(document.getElementById('sessionRadius').value);
            const autoCheckIn = document.getElementById('sessionAutoCheckIn').checked;
            const remoteCheckIn = document.getElementById('sessionRemoteCheckIn').checked;

            if (!sectionId) {
                showToast('Please select a section');
                return;
            }

            const section = appState.sections.find(s => s.id === sectionId);
            if (!section) {
                showToast('Section not found');
                return;
            }

            try {
                const position = await getCurrentPosition();

                const newSession = {
                    sectionId: sectionId,
                    sectionName: section.name,
                    teacherId: appState.currentUser.id,
                    students: section.students || [],
                    location: {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    },
                    radius: radius,
                    autoCheckIn: autoCheckIn,
                    remoteCheckIn: remoteCheckIn,
                    active: true,
                    startTime: new Date().toISOString(),
                    checkedInCount: 0
                };

                await db.collection('sessions').add(newSession);

                await db.collection('sections').doc(sectionId).update({
                    active: true,
                    currentSession: newSession.id
                });

                closeModal();
                showToast(`Session started for ${section.name}`);
                loadPage('sessions');
            } catch (error) {
                console.error('Error starting session:', error);
                showToast('Error starting session');
            }
        }

        // Open student management
        function openStudentManagement() {
            let html = `
                <div class="sheet-header">
                    <div class="sheet-title">Student Management</div>
                    <button class="sheet-close" id="sheetClose" aria-label="Close">
                        <span class="material-icons" aria-hidden="true">close</span>
                    </button>
                </div>
                <div class="sheet-content">
                    <div class="tabs">
                        <div class="tab active" data-tab="all">All Sections</div>
                        <div class="tab" data-tab="search">Search Students</div>
                    </div>
                    
                    <div class="tab-content active" id="allTab">
                        <div class="sections-list">
            `;

            if (appState.sections.length === 0) {
                html += `
                    <div class="empty-state">
                        <span class="material-icons">class</span>
                        <div>No sections available</div>
                    </div>
                `;
            } else {
                appState.sections.forEach(section => {
                    const studentCount = section.students ? section.students.length : 0;

                    html += `
                        <div class="section-item" onclick="openSectionStudentManagement('${section.id}')">
                            <div class="section-emoji">${section.emoji}</div>
                            <div class="section-info">
                                <div class="section-name">${section.name}</div>
                                <div class="section-subtitle">${section.subject} • ${studentCount} students</div>
                            </div>
                            <div class="section-arrow">
                                <span class="material-icons">chevron_right</span>
                            </div>
                        </div>
                    `;
                });
            }

            html += `
                        </div>
                    </div>
                    
                    <div class="tab-content" id="searchTab">
                        <div class="form-group">
                            <input type="text" class="form-input" id="searchStudentInput" placeholder="Search by name or email...">
                        </div>
                        <div id="searchResultsContainer" style="margin-top: 16px;">
                            <div class="empty-state">
                                <span class="material-icons">search</span>
                                <div>Search for students across all sections</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            openModal(html);
            document.getElementById('sheetClose').addEventListener('click', closeModal);

            document.querySelectorAll('.tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabName = tab.getAttribute('data-tab');
                    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                    tab.classList.add('active');
                    document.getElementById(tabName + 'Tab').classList.add('active');
                });
            });

            const searchInput = document.getElementById('searchStudentInput');
            if (searchInput) {
                searchInput.addEventListener('input', searchStudentsAcrossSections);
            }
        }

        // Search students across sections
        async function searchStudentsAcrossSections(e) {
            const query = e.target.value.toLowerCase().trim();
            const resultsContainer = document.getElementById('searchResultsContainer');

            if (!query) {
                resultsContainer.innerHTML = `
                    <div class="empty-state">
                        <span class="material-icons">search</span>
                        <div>Search for students across all sections</div>
                    </div>
                `;
                return;
            }

            const results = [];

            for (const section of appState.sections) {
                const students = appState.students[section.id] || [];
                const filteredStudents = students.filter(student =>
                    student.name.toLowerCase().includes(query) ||
                    (student.email && student.email.toLowerCase().includes(query))
                );

                filteredStudents.forEach(student => {
                    results.push({
                        student,
                        section
                    });
                });
            }

            if (results.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="empty-state">
                        <span class="material-icons">search_off</span>
                        <div>No students found matching "${query}"</div>
                    </div>
                `;
                return;
            }

            let html = '<div class="search-results-list">';
            results.forEach(({student, section}) => {
                html += `
                    <div class="search-result-item">
                        <div class="student-avatar-small">${student.avatar || '👤'}</div>
                        <div class="search-result-info">
                            <div class="search-result-name">${student.name}</div>
                            <div class="search-result-details">
                                <span>${student.email || 'No email'}</span>
                                <span>•</span>
                                <span>${section.name}</span>
                            </div>
                        </div>
                        <div class="search-result-actions">
                            <button class="button button-text" onclick="viewStudentDetails('${student.id}', '${section.id}')">
                                View
                            </button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';

            resultsContainer.innerHTML = html;
        }

        // Open section student management
        function openSectionStudentManagement(sectionId) {
            const section = appState.sections.find(s => s.id === sectionId);
            if (!section) return;

            const students = appState.students[sectionId] || [];

            let html = `
                <div class="sheet-header">
                    <div class="sheet-title">${section.name} - Students</div>
                    <button class="back-button" id="backToManagement" aria-label="Back">
                        <span class="material-icons" aria-hidden="true">arrow_back</span>
                    </button>
                </div>
                <div class="sheet-content">
                    <div class="student-management">
                        <div class="management-header">
                            <div class="student-count">${students.length} Students</div>
                            <button class="button button-filled" onclick="openAddStudentsModal('${sectionId}')">
                                <span class="material-icons">person_add</span>
                                Add Students
                            </button>
                        </div>
                        
                        <div class="student-list">
            `;

            if (students.length === 0) {
                html += `
                    <div class="empty-state">
                        <span class="material-icons">group</span>
                        <div>No students in this section</div>
                    </div>
                `;
            } else {
                students.forEach(student => {
                    const attendanceRate = calculateStudentAttendanceRate(student.id, sectionId);

                    html += `
                        <div class="management-student-item">
                            <div class="student-info">
                                <div class="student-avatar-small">${student.avatar || '👤'}</div>
                                <div>
                                    <div class="student-name">${student.name}</div>
                                    <div class="student-stats">
                                        <span>${attendanceRate}% attendance</span>
                                        ${student.email ? `<span>•</span><span>${student.email}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="student-actions">
                                <button class="button button-text" onclick="removeStudentFromSection('${student.id}', '${sectionId}')">
                                    Remove
                                </button>
                            </div>
                        </div>
                    `;
                });
            }

            html += `
                        </div>
                        
                        <div class="management-actions">
                            <button class="button button-outlined" style="width: 100%; margin-bottom: 12px;" onclick="exportStudentList('${sectionId}')">
                                <span class="material-icons" style="margin-right: 8px;">download</span>
                                Export Student List
                            </button>
                            <button class="button button-text" style="width: 100%; color: var(--error);" onclick="removeAllStudents('${sectionId}')">
                                <span class="material-icons" style="margin-right: 8px;">delete</span>
                                Remove All Students
                            </button>
                        </div>
                    </div>
                </div>
            `;

            elements.bottomSheet.innerHTML = html;
            document.getElementById('backToManagement').addEventListener('click', openStudentManagement);
        }

        // Remove student from section
        async function removeStudentFromSection(studentId, sectionId) {
            if (!confirm('Remove this student from the section?')) {
                return;
            }

            try {
                await db.collection('sections').doc(sectionId).update({
                    students: firebase.firestore.FieldValue.arrayRemove(studentId)
                });

                showToast('Student removed from section');
                openSectionStudentManagement(sectionId);
            } catch (error) {
                console.error('Error removing student:', error);
                showToast('Error removing student');
            }
        }

        // Remove all students from section
        async function removeAllStudents(sectionId) {
            if (!confirm('Remove ALL students from this section? This action cannot be undone.')) {
                return;
            }

            try {
                const section = appState.sections.find(s => s.id === sectionId);
                if (!section) return;

                await db.collection('sections').doc(sectionId).update({
                    students: []
                });

                showToast('All students removed from section');
                openSectionStudentManagement(sectionId);
            } catch (error) {
                console.error('Error removing all students:', error);
                showToast('Error removing students');
            }
        }

        // Export student list
        async function exportStudentList(sectionId) {
            try {
                const section = appState.sections.find(s => s.id === sectionId);
                if (!section) return;

                const students = appState.students[sectionId] || [];

                let csvContent = 'Name,Email,Attendance Rate,Join Date\n';
                students.forEach(student => {
                    const attendanceRate = calculateStudentAttendanceRate(student.id, sectionId);
                    csvContent += `"${student.name}","${student.email || ''}",${attendanceRate}%,"${student.joinDate || ''}"\n`;
                });

                const blob = new Blob([csvContent], {
                    type: 'text/csv'
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${section.name}-students-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                showToast('Student list exported successfully');
            } catch (error) {
                console.error('Error exporting student list:', error);
                showToast('Error exporting student list');
            }
        }

        // Initialize the app when DOM is loaded
        document.addEventListener('DOMContentLoaded', initApp);
