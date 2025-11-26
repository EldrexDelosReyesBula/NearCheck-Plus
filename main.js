        // Firebase Configuration
        const firebaseConfig = {
            apiKey: "AIzaSyCVP8zaUj2iDrooLbRQNypHqB8QNTLhGDE",
            authDomain: "attendance-fe1c8.firebaseapp.com",
            projectId: "attendance-fe1c8",
            storageBucket: "attendance-fe1c8.firebasestorage.app",
            messagingSenderId: "903463376704",
            appId: "1:903463376704:web:d004c563d56aa286df8ca5",
            measurementId: "G-YY5GQZPSRK"
        };

        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.firestore();

        // Application State
        const state = {
            currentUser: null,
            userRole: null,
            userData: null,
            sections: [],
            students: [],
            attendance: [],
            currentPage: 'dashboard',
            darkMode: false,
            sidebarOpen: false,
            currentLocation: null,
            maps: {},
            selectedSection: null,
            nearId: null,
            locationPermission: null,
            autoCheckinEnabled: true,
            bleDevices: [],
            autoCheckinTimer: null,
            autoCheckinCountdown: 5,
            currentAutoCheckinSection: null,
            locationWatchId: null,
            teacherDevices: new Map(),
            pendingInvitation: null
        };

        // DOM Elements
        const elements = {
            loginScreen: document.getElementById('loginScreen'),
            appContainer: document.getElementById('appContainer'),
            sidebar: document.querySelector('.sidebar'),
            mainContent: document.querySelector('.main-content'),
            menuToggle: document.querySelector('.menu-toggle'),
            closeSidebar: document.querySelector('.close-sidebar'),
            menuItems: document.querySelectorAll('.menu-item'),
            pages: document.querySelectorAll('.page'),
            themeToggle: document.querySelector('.theme-toggle'),
            createSectionModal: document.getElementById('createSectionModal'),
            editSectionModal: document.getElementById('editSectionModal'),
            deleteSectionModal: document.getElementById('deleteSectionModal'),
            sectionStudentsModal: document.getElementById('sectionStudentsModal'),
            sectionInvitationModal: document.getElementById('sectionInvitationModal'),
            sectionEnrollmentModal: document.getElementById('sectionEnrollmentModal'),
            checkinModal: document.getElementById('checkinModal'),
            joinSectionModal: document.getElementById('joinSectionModal'),
            manualAttendanceModal: document.getElementById('manualAttendanceModal'),
            bleCheckinModal: document.getElementById('bleCheckinModal'),
            wattModal: document.getElementById('wattModal'),
            autoCheckinModal: document.getElementById('autoCheckinModal'),
            modalClose: document.querySelector('.modal-close'),
            createSectionBtn: document.getElementById('createSectionBtn'),
            createSectionBtn2: document.getElementById('createSectionBtn2'),
            headerTitle: document.querySelector('.header-title'),
            userAvatar: document.getElementById('userAvatar'),
            userName: document.getElementById('userName'),
            userRole: document.getElementById('userRole'),
            userRoleDisplay: document.getElementById('userRoleDisplay'),
            logoutBtn: document.getElementById('logoutBtn'),
            toastContainer: document.getElementById('toastContainer'),
            teacherDashboard: document.getElementById('teacherDashboard'),
            studentDashboard: document.getElementById('studentDashboard'),
            teacherSections: document.getElementById('teacherSections'),
            studentSections: document.getElementById('studentSections'),
            teacherAttendance: document.getElementById('teacherAttendance'),
            studentAttendance: document.getElementById('studentAttendance'),
            teacherOnlyElements: document.querySelectorAll('.teacher-only'),
            joinSectionBtn: document.getElementById('joinSectionBtn'),
            manualAttendanceBtn: document.getElementById('manualAttendanceBtn'),
            manualCheckinBtn: document.getElementById('manualCheckinBtn')
        };

        // Enhanced Neural Network Engine for Location Validation
        const NeuralNetworkEngine = {
            calculateDistance: function(lat1, lon1, lat2, lon2) {
                const R = 6371000;
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c;
            },

            validateLocation: function(userLocation, sectionLocation, radius, userAccuracy = 10) {
                const distance = this.calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    sectionLocation.latitude,
                    sectionLocation.longitude
                );

                const baseConfidence = Math.max(0, 1 - (distance / (radius * 2)));
                const accuracyFactor = Math.max(0, 1 - (userAccuracy / 50));

                const now = new Date();
                const hour = now.getHours();
                let timeFactor = 1;

                if (hour < 7 || hour > 22) {
                    timeFactor = 0.8;
                }

                const day = now.getDay();
                if (day === 0 || day === 6) {
                    timeFactor *= 0.7;
                }

                const confidence = baseConfidence * accuracyFactor * timeFactor;
                const fraudDetected = this.detectFraudPatterns(userLocation, sectionLocation, confidence);

                return {
                    valid: distance <= radius && confidence > 0.3,
                    distance: distance,
                    confidence: confidence,
                    fraudDetected: fraudDetected,
                    accuracy: userAccuracy
                };
            },

            detectFraudPatterns: function(userLocation, sectionLocation, confidence) {
                if (state.currentLocation && state.currentLocation.timestamp) {
                    const timeDiff = (new Date() - state.currentLocation.timestamp) / 1000;
                    const prevLocation = state.currentLocation;

                    const distanceJump = this.calculateDistance(
                        prevLocation.latitude,
                        prevLocation.longitude,
                        userLocation.latitude,
                        userLocation.longitude
                    );

                    if (timeDiff > 0 && distanceJump / timeDiff > 100) {
                        return true;
                    }
                }

                const commonSpoofingLocations = [
                    { lat: 37.7749, lon: -122.4194 },
                    { lat: 40.7128, lon: -74.0060 },
                    { lat: 51.5074, lon: -0.1278 },
                    { lat: 35.6762, lon: 139.6503 }
                ];

                for (const loc of commonSpoofingLocations) {
                    const distance = this.calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        loc.lat,
                        loc.lon
                    );

                    if (distance < 1000) {
                        return true;
                    }
                }

                if (userLocation.altitude === 0 || userLocation.altitude === 100) {
                    return true;
                }

                return confidence < 0.2;
            },

            generateNearId: function() {
                if (state.nearId) return state.nearId;

                const components = [
                    navigator.userAgent,
                    navigator.platform,
                    screen.width + 'x' + screen.height,
                    new Date().getTimezoneOffset(),
                    navigator.language,
                    !!navigator.bluetooth
                ];

                let id = '';
                for (const component of components) {
                    let hash = 0;
                    for (let i = 0; i < component.length; i++) {
                        const char = component.charCodeAt(i);
                        hash = ((hash << 5) - hash) + char;
                        hash = hash & hash;
                    }
                    id += Math.abs(hash).toString(36).substring(0, 4);
                }

                state.nearId = id;
                localStorage.setItem('nearcheck_nearid', id);
                return id;
            },

            validateNearId: function(storedId, currentId) {
                return storedId === currentId;
            },

            loadNearId: function() {
                const storedId = localStorage.getItem('nearcheck_nearid');
                if (storedId) {
                    state.nearId = storedId;
                    return storedId;
                }
                return this.generateNearId();
            }
        };

        // Enhanced Location Services
        const LocationService = {
            getCurrentLocation: function(highAccuracy = false) {
                return new Promise((resolve, reject) => {
                    if (!navigator.geolocation) {
                        reject(new Error('Geolocation is not supported by this browser.'));
                        return;
                    }

                    const options = {
                        enableHighAccuracy: highAccuracy,
                        timeout: 15000,
                        maximumAge: 0
                    };

                    navigator.geolocation.getCurrentPosition(
                        position => {
                            const location = {
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude,
                                accuracy: position.coords.accuracy,
                                altitude: position.coords.altitude,
                                altitudeAccuracy: position.coords.altitudeAccuracy,
                                heading: position.coords.heading,
                                speed: position.coords.speed,
                                timestamp: new Date()
                            };
                            state.currentLocation = location;
                            resolve(location);
                        },
                        error => {
                            console.error('Geolocation error:', error);
                            reject(error);
                        },
                        options
                    );
                });
            },

            requestLocationPermission: function() {
                return new Promise((resolve, reject) => {
                    if (state.locationPermission === 'granted') {
                        resolve(true);
                        return;
                    }

                    if (state.locationPermission === 'denied') {
                        reject(new Error('Location permission was previously denied'));
                        return;
                    }

                    elements.wattModal.classList.add('active');

                    document.getElementById('wattAllow').addEventListener('click', function handler() {
                        document.getElementById('wattAllow').removeEventListener('click', handler);
                        elements.wattModal.classList.remove('active');
                        LocationService.getCurrentLocation()
                            .then(() => {
                                state.locationPermission = 'granted';
                                resolve(true);
                            })
                            .catch(error => {
                                reject(error);
                            });
                    }, { once: true });

                    document.getElementById('wattDeny').addEventListener('click', function handler() {
                        document.getElementById('wattDeny').removeEventListener('click', handler);
                        elements.wattModal.classList.remove('active');
                        state.locationPermission = 'denied';
                        reject(new Error('Location permission denied by user'));
                    }, { once: true });
                });
            },

            checkLocationSupport: function() {
                return !!navigator.geolocation;
            },

            getAccuracyLevel: function(accuracy) {
                if (accuracy < 10) return 'high';
                if (accuracy < 30) return 'medium';
                return 'low';
            },

            startContinuousMonitoring: function(callback, interval = 30000) {
                if (!navigator.geolocation) {
                    console.error('Geolocation not supported');
                    return null;
                }

                const watchId = navigator.geolocation.watchPosition(
                    position => {
                        const location = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            altitude: position.coords.altitude,
                            altitudeAccuracy: position.coords.altitudeAccuracy,
                            heading: position.coords.heading,
                            speed: position.coords.speed,
                            timestamp: new Date()
                        };
                        state.currentLocation = location;
                        callback(location);
                    },
                    error => {
                        console.error('Location monitoring error:', error);
                    }, {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                );

                return watchId;
            },

            stopContinuousMonitoring: function(watchId) {
                if (watchId && navigator.geolocation) {
                    navigator.geolocation.clearWatch(watchId);
                }
            }
        };

        // Enhanced BLE Service
        const BLEService = {
            currentDevice: null,
            isScanning: false,
            teacherDevices: new Map(),

            registerTeacherDevice: function(sectionId, deviceInfo) {
                return db.collection('bleDevices').doc(sectionId).set({
                    deviceId: deviceInfo.id,
                    deviceName: deviceInfo.name,
                    sectionId: sectionId,
                    teacherId: state.currentUser.uid,
                    registeredAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            },

            getTeacherDevice: function(sectionId) {
                return db.collection('bleDevices').doc(sectionId).get()
                    .then(doc => {
                        if (doc.exists) {
                            return doc.data();
                        }
                        return null;
                    });
            },

            scanForDevices: function() {
                return new Promise((resolve, reject) => {
                    if (!navigator.bluetooth) {
                        reject(new Error('Web Bluetooth is not supported by this browser'));
                        return;
                    }

                    if (this.isScanning) {
                        reject(new Error('Scan already in progress'));
                        return;
                    }

                    this.isScanning = true;
                    showToast('info', 'Bluetooth Scan', 'Looking for nearby Bluetooth devices...');

                    state.bleDevices = [];

                    navigator.bluetooth.requestDevice({
                            acceptAllDevices: true,
                            optionalServices: ['battery_service', 'device_information']
                        })
                        .then(device => {
                            this.isScanning = false;
                            this.currentDevice = device;
                            
                            const bleDevice = {
                                id: device.id,
                                name: device.name || 'Unknown Device',
                                connected: false
                            };
                            
                            state.bleDevices.push(bleDevice);
                            resolve(state.bleDevices);
                        })
                        .catch(error => {
                            this.isScanning = false;
                            console.error('Bluetooth scan error:', error);
                            reject(error);
                        });
                });
            },

            validateBLEDevice: function(deviceId, sectionId) {
                return new Promise((resolve, reject) => {
                    this.getTeacherDevice(sectionId)
                        .then(teacherDevice => {
                            if (!teacherDevice) {
                                reject(new Error('No Bluetooth device registered for this section'));
                                return;
                            }

                            if (teacherDevice.deviceId !== deviceId) {
                                reject(new Error('This is not the correct Bluetooth device for this section'));
                                return;
                            }

                            return db.collection('sections').doc(sectionId).get();
                        })
                        .then(sectionDoc => {
                            if (!sectionDoc || !sectionDoc.exists) {
                                throw new Error('Section not found');
                            }

                            const section = sectionDoc.data();
                            
                            if (!section.students || !section.students.includes(state.currentUser.uid)) {
                                throw new Error('You are not enrolled in this section');
                            }

                            resolve({
                                valid: true,
                                deviceId: deviceId,
                                sectionId: sectionId,
                                sectionName: section.name
                            });
                        })
                        .catch(error => {
                            reject(error);
                        });
                });
            },

            isAvailable: function() {
                return !!navigator.bluetooth;
            },

            disconnect: function() {
                if (this.currentDevice && this.currentDevice.gatt && this.currentDevice.gatt.connected) {
                    this.currentDevice.gatt.disconnect();
                }
                this.currentDevice = null;
            },

            registerCurrentDevice: function(sectionId) {
                if (!this.currentDevice) {
                    throw new Error('No device selected');
                }

                return this.registerTeacherDevice(sectionId, {
                    id: this.currentDevice.id,
                    name: this.currentDevice.name || 'Teacher Device'
                });
            }
        };

        // Auto Check-in Service
        const AutoCheckinService = {
            isActive: false,
            monitoringInterval: null,
            countdownTimer: null,
            currentValidation: null,

            start: function() {
                if (this.isActive || state.userRole !== 'student' || !state.autoCheckinEnabled) {
                    return;
                }

                this.isActive = true;
                console.log('Auto check-in monitoring started');

                state.locationWatchId = LocationService.startContinuousMonitoring((location) => {
                    this.checkLocationForAutoCheckin(location);
                });

                this.checkLocationForAutoCheckin(state.currentLocation);
            },

            stop: function() {
                this.isActive = false;
                if (this.monitoringInterval) {
                    clearInterval(this.monitoringInterval);
                    this.monitoringInterval = null;
                }
                if (this.countdownTimer) {
                    clearInterval(this.countdownTimer);
                    this.countdownTimer = null;
                }
                if (state.locationWatchId) {
                    LocationService.stopContinuousMonitoring(state.locationWatchId);
                    state.locationWatchId = null;
                }
                this.hideAutoCheckinModal();
            },

            checkLocationForAutoCheckin: function(location) {
                if (!location) {
                    LocationService.getCurrentLocation()
                        .then(newLocation => {
                            this.processLocationForAutoCheckin(newLocation);
                        })
                        .catch(error => {});
                    return;
                }

                this.processLocationForAutoCheckin(location);
            },

            processLocationForAutoCheckin: function(location) {
                const enrolledSections = state.sections.filter(section =>
                    section.students && section.students.includes(state.currentUser.uid) && section.isActive
                );

                enrolledSections.forEach(section => {
                    const validation = NeuralNetworkEngine.validateLocation(
                        location,
                        section.location,
                        section.radius,
                        location.accuracy
                    );

                    if (validation.valid && !validation.fraudDetected) {
                        const today = new Date().toDateString();
                        const todayCheckin = state.attendance.find(a =>
                            a.sectionId === section.id &&
                            a.studentId === state.currentUser.uid &&
                            new Date(a.timestamp).toDateString() === today
                        );

                        if (!todayCheckin) {
                            this.showAutoCheckinModal(section, location, validation);
                        }
                    }
                });
            },

            showAutoCheckinModal: function(section, location, validation) {
                if (state.currentAutoCheckinSection) {
                    return;
                }

                state.currentAutoCheckinSection = section;
                state.autoCheckinCountdown = 5;
                this.currentValidation = validation;

                document.getElementById('autoCheckinSectionName').textContent = section.name;
                document.getElementById('autoCheckinDistance').textContent = validation.distance.toFixed(1);
                document.getElementById('autoCheckinCountdown').textContent = state.autoCheckinCountdown;

                elements.autoCheckinModal.classList.add('active');

                this.countdownTimer = setInterval(() => {
                    state.autoCheckinCountdown--;
                    document.getElementById('autoCheckinCountdown').textContent = state.autoCheckinCountdown;

                    if (state.autoCheckinCountdown <= 0) {
                        this.processAutoCheckin(section, location, validation);
                        clearInterval(this.countdownTimer);
                        this.countdownTimer = null;
                    }
                }, 1000);
            },

            hideAutoCheckinModal: function() {
                elements.autoCheckinModal.classList.remove('active');
                state.currentAutoCheckinSection = null;
                this.currentValidation = null;
                if (this.countdownTimer) {
                    clearInterval(this.countdownTimer);
                    this.countdownTimer = null;
                }
            },

            processAutoCheckin: function(section, location, validation) {
                const attendanceData = {
                    sectionId: section.id,
                    sectionName: section.name,
                    studentId: state.currentUser.uid,
                    studentName: state.userData.name,
                    timestamp: new Date(),
                    location: {
                        latitude: location.latitude,
                        longitude: location.longitude,
                        accuracy: location.accuracy
                    },
                    status: 'present',
                    distance: validation.distance,
                    confidence: validation.confidence,
                    fraudDetected: validation.fraudDetected,
                    method: 'auto',
                    nearId: state.nearId
                };

                db.collection('attendance').add(attendanceData)
                    .then(() => {
                        showToast('success', 'Auto Check-in', `Checked into ${section.name} automatically`);
                        this.hideAutoCheckinModal();
                        loadAttendanceData();
                    })
                    .catch(error => {
                        console.error('Auto check-in failed:', error);
                        showToast('error', 'Auto Check-in Failed', 'Please try manual check-in');
                        this.hideAutoCheckinModal();
                    });
            },

            cancelAutoCheckin: function() {
                this.hideAutoCheckinModal();
                showToast('info', 'Auto Check-in', 'Auto check-in cancelled');
            },

            updateValidation: function(location) {
                if (!state.currentAutoCheckinSection || !this.currentValidation) return;

                const validation = NeuralNetworkEngine.validateLocation(
                    location,
                    state.currentAutoCheckinSection.location,
                    state.currentAutoCheckinSection.radius,
                    location.accuracy
                );

                if (!validation.valid || validation.fraudDetected) {
                    this.cancelAutoCheckin();
                    showToast('warning', 'Location Changed', 'You moved away from the section location');
                }
            }
        };

        // Authentication Functions
        function initAuth() {
            auth.onAuthStateChanged((user) => {
                if (user) {
                    state.currentUser = user;
                    loadUserData().then(() => {
                        showApp();
                        checkPendingInvitation();
                    }).catch(error => {
                        console.error('Error loading user data:', error);
                        showToast('error', 'Login Error', 'Failed to load user data');
                    });
                } else {
                    showLogin();
                }
            });
        }

        function showLogin() {
            elements.loginScreen.style.display = 'flex';
            elements.appContainer.style.display = 'none';
            document.getElementById('loginForm').reset();
            document.getElementById('registerForm').reset();
        }

        function showApp() {
            elements.loginScreen.style.display = 'none';
            elements.appContainer.style.display = 'flex';
            updateUserInterface();
            setupRoleBasedUI();

            NeuralNetworkEngine.loadNearId();

            if (state.userRole !== 'teacher') {
                LocationService.requestLocationPermission().catch(() => {
                    showToast('warning', 'Location Access', 'Some features may not work without location access');
                });
            }

            if (state.userRole === 'student' && state.autoCheckinEnabled) {
                AutoCheckinService.start();
            }

            loadDashboardData();
        }

        function updateUserInterface() {
            if (state.currentUser && state.userData) {
                const displayName = state.userData.name || state.currentUser.email.split('@')[0];
                elements.userName.textContent = displayName;
                elements.userAvatar.textContent = displayName.charAt(0).toUpperCase();
                elements.userRole.textContent = state.userRole === 'teacher' ? 'Teacher' : 'Student';
                elements.userRoleDisplay.value = state.userRole === 'teacher' ? 'Teacher' : 'Student';
                
                if (document.getElementById('displayName')) {
                    document.getElementById('displayName').value = displayName;
                }
                if (document.getElementById('userEmail')) {
                    document.getElementById('userEmail').value = state.currentUser.email;
                }
            }
        }

        function setupRoleBasedUI() {
            if (state.userRole === 'teacher') {
                elements.teacherOnlyElements.forEach(el => {
                    el.style.display = 'flex';
                });
                if (elements.teacherDashboard) elements.teacherDashboard.style.display = 'block';
                if (elements.studentDashboard) elements.studentDashboard.style.display = 'none';
                if (elements.teacherSections) elements.teacherSections.style.display = 'block';
                if (elements.studentSections) elements.studentSections.style.display = 'none';
                if (elements.teacherAttendance) elements.teacherAttendance.style.display = 'block';
                if (elements.studentAttendance) elements.studentAttendance.style.display = 'none';
            } else {
                elements.teacherOnlyElements.forEach(el => {
                    el.style.display = 'none';
                });
                if (elements.teacherDashboard) elements.teacherDashboard.style.display = 'none';
                if (elements.studentDashboard) elements.studentDashboard.style.display = 'block';
                if (elements.teacherSections) elements.teacherSections.style.display = 'none';
                if (elements.studentSections) elements.studentSections.style.display = 'block';
                if (elements.teacherAttendance) elements.teacherAttendance.style.display = 'none';
                if (elements.studentAttendance) elements.studentAttendance.style.display = 'block';
            }
        }

        // Check for pending invitation after login
        function checkPendingInvitation() {
            const invitation = localStorage.getItem('nearcheck_invitation');
            if (invitation) {
                const invitationData = JSON.parse(invitation);
                if (invitationData.sectionId) {
                    showSectionEnrollmentModal(invitationData.sectionId);
                }
                localStorage.removeItem('nearcheck_invitation');
            }
        }

        // Login/Register Event Listeners
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const invitationCode = document.getElementById('loginInvitationCode')?.value;

            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    if (invitationCode) {
                        state.pendingInvitation = invitationCode;
                    }
                    showToast('success', 'Welcome Back', 'Successfully signed in!');
                })
                .catch((error) => {
                    showToast('error', 'Sign In Failed', error.message);
                });
        });

        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            const birthDate = document.getElementById('registerBirthDate').value;
            const invitationCode = document.getElementById('registerInvitationCode')?.value;

            if (password !== confirmPassword) {
                showToast('error', 'Registration Failed', 'Passwords do not match');
                return;
            }

            if (!document.getElementById('registerTerms').checked) {
                showToast('error', 'Registration Failed', 'Please accept the terms and conditions');
                return;
            }

            const birthDateObj = new Date(birthDate);
            const today = new Date();
            let age = today.getFullYear() - birthDateObj.getFullYear();
            const monthDiff = today.getMonth() - birthDateObj.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
                age--;
            }

            const roleElement = document.querySelector('.role-btn.active');
            if (!roleElement) {
                showToast('error', 'Registration Failed', 'Please select a role');
                return;
            }

            const role = roleElement.dataset.role;
            if (role === 'teacher' && age < 20) {
                showToast('error', 'Registration Failed', 'Teachers must be at least 20 years old');
                return;
            }

            if (role === 'student' && age < 13) {
                showToast('error', 'Registration Failed', 'Students must be at least 13 years old');
                return;
            }

            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    return userCredential.user.updateProfile({
                        displayName: name
                    }).then(() => {
                        return db.collection('users').doc(userCredential.user.uid).set({
                            name: name,
                            email: email,
                            role: role,
                            birthDate: birthDate,
                            nearId: NeuralNetworkEngine.generateNearId(),
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    });
                })
                .then(() => {
                    if (invitationCode) {
                        state.pendingInvitation = invitationCode;
                    }
                    showToast('success', 'Account Created', 'Welcome to NearCheck+!');
                })
                .catch((error) => {
                    showToast('error', 'Registration Failed', error.message);
                });
        });

        // Role selector
        document.querySelectorAll('.role-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Show/hide invitation code field for students
                const invitationCodeGroup = document.getElementById('invitationCodeGroup');
                if (invitationCodeGroup) {
                    invitationCodeGroup.style.display = btn.dataset.role === 'student' ? 'block' : 'none';
                }
            });
        });

        // Show/hide login/register forms
        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('registerForm').style.display = 'block';
        });

        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('registerForm').style.display = 'none';
            document.getElementById('loginForm').style.display = 'block';
        });

        // Logout
        elements.logoutBtn.addEventListener('click', () => {
            if (state.userRole === 'student') {
                AutoCheckinService.stop();
            }
            
            BLEService.disconnect();
            
            auth.signOut().then(() => {
                showToast('success', 'Signed Out', 'You have been successfully signed out');
            });
        });

        // Initialize Maps
        function initializeMaps() {
            try {
                if (document.getElementById('dashboardMap')) {
                    state.maps.dashboard = new ol.Map({
                        target: 'dashboardMap',
                        layers: [
                            new ol.layer.Tile({
                                source: new ol.source.OSM()
                            })
                        ],
                        view: new ol.View({
                            center: ol.proj.fromLonLat([120.9842, 14.5995]),
                            zoom: 15
                        })
                    });
                }

                if (document.getElementById('attendanceMap')) {
                    state.maps.attendance = new ol.Map({
                        target: 'attendanceMap',
                        layers: [
                            new ol.layer.Tile({
                                source: new ol.source.OSM()
                            })
                        ],
                        view: new ol.View({
                            center: ol.proj.fromLonLat([120.9842, 14.5995]),
                            zoom: 16
                        })
                    });
                }

                if (document.getElementById('locationMap')) {
                    state.maps.location = new ol.Map({
                        target: 'locationMap',
                        layers: [
                            new ol.layer.Tile({
                                source: new ol.source.OSM()
                            })
                        ],
                        view: new ol.View({
                            center: ol.proj.fromLonLat([120.9842, 14.5995]),
                            zoom: 17
                        })
                    });
                }

                if (document.getElementById('sectionLocationMap')) {
                    state.maps.sectionLocation = new ol.Map({
                        target: 'sectionLocationMap',
                        layers: [
                            new ol.layer.Tile({
                                source: new ol.source.OSM()
                            })
                        ],
                        view: new ol.View({
                            center: ol.proj.fromLonLat([120.9842, 14.5995]),
                            zoom: 17
                        })
                    });
                }
            } catch (error) {
                console.error('Error initializing maps:', error);
            }
        }

        // Event Listeners
        function setupEventListeners() {
            // Sidebar toggle
            if (elements.menuToggle) {
                elements.menuToggle.addEventListener('click', toggleSidebar);
            }
            if (elements.closeSidebar) {
                elements.closeSidebar.addEventListener('click', toggleSidebar);
            }

            // Menu item clicks
            elements.menuItems.forEach(item => {
                if (item.id !== 'logoutBtn') {
                    item.addEventListener('click', () => {
                        const page = item.getAttribute('data-page');
                        switchPage(page);

                        elements.menuItems.forEach(i => i.classList.remove('active'));
                        item.classList.add('active');

                        if (window.innerWidth < 768) {
                            toggleSidebar();
                        }
                    });
                }
            });

            // Theme toggle
            const darkModeToggle = document.getElementById('darkModeToggle');
            if (darkModeToggle) {
                darkModeToggle.addEventListener('change', toggleDarkMode);
            }

            // Modal controls
            document.querySelectorAll('.modal-close').forEach(closeBtn => {
                closeBtn.addEventListener('click', closeAllModals);
            });

            document.querySelectorAll('.modal-overlay').forEach(overlay => {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) {
                        closeAllModals();
                    }
                });
            });

            // Create section buttons
            if (elements.createSectionBtn) {
                elements.createSectionBtn.addEventListener('click', openCreateSectionModal);
            }
            if (elements.createSectionBtn2) {
                elements.createSectionBtn2.addEventListener('click', openCreateSectionModal);
            }

            // Section creation
            const cancelSection = document.getElementById('cancelSection');
            const saveSection = document.getElementById('saveSection');
            if (cancelSection) cancelSection.addEventListener('click', closeAllModals);
            if (saveSection) saveSection.addEventListener('click', createSection);

            // Check-in modal
            const cancelCheckin = document.getElementById('cancelCheckin');
            const confirmCheckin = document.getElementById('confirmCheckin');
            if (cancelCheckin) cancelCheckin.addEventListener('click', closeAllModals);
            if (confirmCheckin) confirmCheckin.addEventListener('click', processCheckin);

            // Join section
            if (elements.joinSectionBtn) {
                elements.joinSectionBtn.addEventListener('click', openJoinSectionModal);
            }
            const cancelJoinSection = document.getElementById('cancelJoinSection');
            const confirmJoinSection = document.getElementById('confirmJoinSection');
            if (cancelJoinSection) cancelJoinSection.addEventListener('click', closeAllModals);
            if (confirmJoinSection) confirmJoinSection.addEventListener('click', joinSection);

            // Manual attendance
            if (elements.manualAttendanceBtn) {
                elements.manualAttendanceBtn.addEventListener('click', openManualAttendanceModal);
            }
            const cancelManualAttendance = document.getElementById('cancelManualAttendance');
            const saveManualAttendance = document.getElementById('saveManualAttendance');
            if (cancelManualAttendance) cancelManualAttendance.addEventListener('click', closeAllModals);
            if (saveManualAttendance) saveManualAttendance.addEventListener('click', saveManualAttendance);

            // BLE check-in
            if (elements.manualCheckinBtn) {
                elements.manualCheckinBtn.addEventListener('click', openBLECheckinModal);
            }
            const scanBleDevices = document.getElementById('scanBleDevices');
            const cancelBleCheckin = document.getElementById('cancelBleCheckin');
            const confirmBleCheckin = document.getElementById('confirmBleCheckin');
            if (scanBleDevices) scanBleDevices.addEventListener('click', scanBLEDevices);
            if (cancelBleCheckin) cancelBleCheckin.addEventListener('click', closeAllModals);
            if (confirmBleCheckin) confirmBleCheckin.addEventListener('click', processBLECheckin);

            // Auto check-in
            const cancelAutoCheckin = document.getElementById('cancelAutoCheckin');
            if (cancelAutoCheckin) cancelAutoCheckin.addEventListener('click', cancelAutoCheckin);

            // Location settings
            const checkinRadius = document.getElementById('checkinRadius');
            const sectionRadius = document.getElementById('sectionRadius');
            if (checkinRadius) {
                checkinRadius.addEventListener('change', function() {
                    const customContainer = document.getElementById('customRadiusContainer');
                    if (customContainer) {
                        customContainer.style.display = this.value === 'custom' ? 'block' : 'none';
                    }
                });
            }
            if (sectionRadius) {
                sectionRadius.addEventListener('change', function() {
                    const customContainer = document.getElementById('sectionCustomRadiusContainer');
                    if (customContainer) {
                        customContainer.style.display = this.value === 'custom' ? 'block' : 'none';
                    }
                });
            }

            const setSectionLocation = document.getElementById('setSectionLocation');
            if (setSectionLocation) setSectionLocation.addEventListener('click', setSectionLocation);

            // Save settings
            const saveLocationSettings = document.getElementById('saveLocationSettings');
            const saveSettings = document.getElementById('saveSettings');
            const resetSettings = document.getElementById('resetSettings');
            if (saveLocationSettings) saveLocationSettings.addEventListener('click', saveLocationSettings);
            if (saveSettings) saveSettings.addEventListener('click', saveUserSettings);
            if (resetSettings) resetSettings.addEventListener('click', resetUserSettings);

            // Clear local data
            const clearLocalData = document.getElementById('clearLocalData');
            if (clearLocalData) clearLocalData.addEventListener('click', clearLocalData);

            // Carousel controls
            document.querySelectorAll('.prev').forEach(btn => {
                btn.addEventListener('click', () => {
                    const carousel = btn.closest('.carousel-header')?.nextElementSibling;
                    if (carousel) {
                        carousel.scrollBy({
                            left: -300,
                            behavior: 'smooth'
                        });
                    }
                });
            });

            document.querySelectorAll('.next').forEach(btn => {
                btn.addEventListener('click', () => {
                    const carousel = btn.closest('.carousel-header')?.nextElementSibling;
                    if (carousel) {
                        carousel.scrollBy({
                            left: 300,
                            behavior: 'smooth'
                        });
                    }
                });
            });

            // Refresh attendance
            const refreshAttendance = document.getElementById('refreshAttendance');
            if (refreshAttendance) refreshAttendance.addEventListener('click', loadAttendanceData);

            // Tab navigation
            document.querySelectorAll('.tab-item').forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabId = tab.getAttribute('data-tab');

                    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');

                    document.querySelectorAll('.tab-content').forEach(content => {
                        content.classList.remove('active');
                    });
                    const targetContent = document.getElementById(tabId);
                    if (targetContent) {
                        targetContent.classList.add('active');
                    }
                });
            });

            // Copy invitation link
            const copyInviteLink = document.getElementById('copyInviteLink');
            if (copyInviteLink) copyInviteLink.addEventListener('click', copyInvitationLink);

            // Section management
            const closeSectionManagement = document.getElementById('closeSectionManagement');
            if (closeSectionManagement) closeSectionManagement.addEventListener('click', closeAllModals);

            // Edit section
            const cancelEditSection = document.getElementById('cancelEditSection');
            const updateSection = document.getElementById('updateSection');
            if (cancelEditSection) cancelEditSection.addEventListener('click', closeAllModals);
            if (updateSection) updateSection.addEventListener('click', updateSectionData);

            // Delete section
            const cancelDeleteSection = document.getElementById('cancelDeleteSection');
            const confirmDeleteSection = document.getElementById('confirmDeleteSection');
            if (cancelDeleteSection) cancelDeleteSection.addEventListener('click', closeAllModals);
            if (confirmDeleteSection) confirmDeleteSection.addEventListener('click', deleteSectionData);

            // Section students
            const closeSectionStudents = document.getElementById('closeSectionStudents');
            if (closeSectionStudents) closeSectionStudents.addEventListener('click', closeAllModals);

            // Section invitation
            const closeSectionInvitation = document.getElementById('closeSectionInvitation');
            const copySectionInviteLink = document.getElementById('copySectionInviteLink');
            if (closeSectionInvitation) closeSectionInvitation.addEventListener('click', closeAllModals);
            if (copySectionInviteLink) copySectionInviteLink.addEventListener('click', copySectionInvitationLink);

            // Section enrollment
            const cancelEnrollment = document.getElementById('cancelEnrollment');
            const confirmEnrollment = document.getElementById('confirmEnrollment');
            if (cancelEnrollment) cancelEnrollment.addEventListener('click', closeAllModals);
            if (confirmEnrollment) confirmEnrollment.addEventListener('click', enrollInSection);
        }

        // Page Navigation
        function switchPage(page) {
            elements.pages.forEach(p => p.classList.remove('active'));
            const targetPage = document.getElementById(page);
            if (targetPage) {
                targetPage.classList.add('active');
            }

            const pageTitles = {
                dashboard: 'Dashboard',
                sections: 'My Sections',
                attendance: 'Attendance',
                students: 'Students',
                reports: 'Reports',
                location: 'Location Settings',
                settings: 'Settings'
            };

            if (elements.headerTitle) {
                elements.headerTitle.textContent = pageTitles[page] || 'Dashboard';
            }
            state.currentPage = page;

            switch (page) {
                case 'dashboard':
                    loadDashboardData();
                    break;
                case 'sections':
                    loadSectionsData();
                    break;
                case 'attendance':
                    loadAttendanceData();
                    break;
                case 'students':
                    loadStudentsData();
                    break;
                case 'reports':
                    loadReportsData();
                    break;
            }
        }

        // Sidebar Toggle
        function toggleSidebar() {
            if (elements.sidebar) {
                elements.sidebar.classList.toggle('active');
            }
            if (elements.mainContent) {
                elements.mainContent.classList.toggle('expanded');
            }
            state.sidebarOpen = !state.sidebarOpen;
        }

        // Dark Mode Toggle
        function toggleDarkMode() {
            const isDarkMode = document.getElementById('darkModeToggle').checked;
            document.body.classList.toggle('dark-mode', isDarkMode);
            state.darkMode = isDarkMode;

            if (state.currentUser) {
                db.collection('userPreferences').doc(state.currentUser.uid).set({
                    darkMode: isDarkMode,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, {
                    merge: true
                }).catch(error => {
                    console.error('Error saving dark mode preference:', error);
                });
            }
        }

        // Modal Controls
        function openCreateSectionModal() {
            if (elements.createSectionModal) {
                elements.createSectionModal.classList.add('active');
            }
        }

        function openEditSectionModal(sectionId) {
            const section = state.sections.find(s => s.id === sectionId);
            if (!section || !elements.editSectionModal) return;

            const editContent = document.getElementById('editSectionContent');
            if (editContent) {
                editContent.innerHTML = `
                    <div class="form-group">
                        <label class="form-label">Section Name</label>
                        <input type="text" class="form-control" id="editSectionName" value="${section.name}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Subject</label>
                        <input type="text" class="form-control" id="editSectionSubject" value="${section.subject}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Schedule</label>
                        <input type="text" class="form-control" id="editSectionSchedule" value="${section.schedule}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Location Radius</label>
                        <select class="form-control" id="editSectionRadius">
                            <option value="5" ${section.radius == 5 ? 'selected' : ''}>NearSnap (5m)</option>
                            <option value="10" ${section.radius == 10 ? 'selected' : ''}>NearStandard (10m)</option>
                            <option value="20" ${section.radius == 20 ? 'selected' : ''}>NearFlex (20m)</option>
                            <option value="50" ${section.radius == 50 ? 'selected' : ''}>NearMax (50m)</option>
                            <option value="custom" ${![5,10,20,50].includes(section.radius) ? 'selected' : ''}>Custom</option>
                        </select>
                    </div>

                    <div class="form-group" id="editSectionCustomRadiusContainer" style="${![5,10,20,50].includes(section.radius) ? 'display: block;' : 'display: none;'}">
                        <label class="form-label">Custom Radius (meters)</label>
                        <input type="number" class="form-control" id="editSectionCustomRadius" min="5" max="150" value="${section.radius}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Section Emoji</label>
                        <input type="text" class="form-control" id="editSectionEmoji" value="${section.emoji}">
                    </div>

                    <div class="form-group">
                        <div class="setting-item">
                            <div class="setting-info">
                                <div class="setting-title">SilentScan Mode</div>
                                <div class="setting-description">Prevent unauthorized detection of sessions</div>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="editSilentScanToggle" ${section.silentScan ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="setting-item">
                            <div class="setting-info">
                                <div class="setting-title">Online Check-in</div>
                                <div class="setting-description">Allow students to check-in without location verification</div>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="editSectionOnlineCheckinToggle" ${section.onlineCheckin ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="setting-item">
                            <div class="setting-info">
                                <div class="setting-title">Auto Check-in</div>
                                <div class="setting-description">Automatically check-in students within boundaries</div>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="editSectionAutoCheckinToggle" ${section.autoCheckin ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <input type="hidden" id="editSectionId" value="${section.id}">
                `;

                // Add event listener for radius change
                const editRadiusSelect = document.getElementById('editSectionRadius');
                if (editRadiusSelect) {
                    editRadiusSelect.addEventListener('change', function() {
                        const customContainer = document.getElementById('editSectionCustomRadiusContainer');
                        if (customContainer) {
                            customContainer.style.display = this.value === 'custom' ? 'block' : 'none';
                        }
                    });
                }
            }

            state.selectedSection = section;
            elements.editSectionModal.classList.add('active');
        }

        function openDeleteSectionModal(sectionId) {
            const section = state.sections.find(s => s.id === sectionId);
            if (!section || !elements.deleteSectionModal) return;

            document.getElementById('deleteSectionName').textContent = section.name;
            state.selectedSection = section;
            elements.deleteSectionModal.classList.add('active');
        }

        function openSectionStudentsModal(sectionId) {
            const section = state.sections.find(s => s.id === sectionId);
            if (!section || !elements.sectionStudentsModal) return;

            const studentsContent = document.getElementById('sectionStudentsContent');
            if (studentsContent) {
                let html = `<h3>Students in ${section.name}</h3>`;

                if (!section.students || section.students.length === 0) {
                    html += '<p>No students enrolled in this section yet.</p>';
                } else {
                    html += `
                        <div style="overflow-x: auto;">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Last Check-in</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                    `;

                    const enrolledStudents = state.students.filter(s =>
                        section.students.includes(s.id)
                    );

                    enrolledStudents.forEach(student => {
                        const lastCheckin = state.attendance
                            .filter(a => a.studentId === student.id && a.sectionId === section.id)
                            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

                        html += `
                            <tr>
                                <td>${student.name}</td>
                                <td>${student.email}</td>
                                <td>${lastCheckin ? new Date(lastCheckin.timestamp).toLocaleDateString() : 'Never'}</td>
                                <td>
                                    <button class="btn btn-sm btn-danger" onclick="removeStudentFromSection('${section.id}', '${student.id}')">
                                        <i class="fas fa-user-minus"></i>
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        `;
                    });

                    html += `
                                </tbody>
                            </table>
                        </div>
                    `;
                }

                studentsContent.innerHTML = html;
            }

            state.selectedSection = section;
            elements.sectionStudentsModal.classList.add('active');
        }

        function openSectionInvitationModal(sectionId) {
            const section = state.sections.find(s => s.id === sectionId);
            if (!section || !elements.sectionInvitationModal) return;

            document.getElementById('sectionIdDisplay').value = section.id;
            document.getElementById('sectionInvitationLink').value = `${window.location.origin}?section=${section.id}`;
            state.selectedSection = section;
            elements.sectionInvitationModal.classList.add('active');
        }

        function showSectionEnrollmentModal(sectionId) {
            db.collection('sections').doc(sectionId).get()
                .then(doc => {
                    if (!doc.exists) {
                        showToast('error', 'Invalid Section', 'The section you are trying to join does not exist');
                        return;
                    }

                    const section = {
                        id: doc.id,
                        ...doc.data()
                    };

                    const enrollmentContent = document.getElementById('sectionEnrollmentContent');
                    if (enrollmentContent) {
                        enrollmentContent.innerHTML = `
                            <div style="text-align: center; margin-bottom: 20px;">
                                <div style="font-size: 48px; margin-bottom: 10px;">${section.emoji}</div>
                                <h3 style="margin-bottom: 5px;">${section.name}</h3>
                                <p style="color: var(--text-secondary); margin-bottom: 10px;">${section.subject}</p>
                                <p><strong>Teacher:</strong> ${section.teacherName}</p>
                                <p><strong>Created:</strong> ${section.createdAt ? new Date(section.createdAt.toDate()).toLocaleDateString() : 'Unknown'}</p>
                                <p><strong>Schedule:</strong> ${section.schedule}</p>
                                <p><strong>Location Radius:</strong> ${section.radius}m</p>
                            </div>
                            <input type="hidden" id="enrollmentSectionId" value="${section.id}">
                        `;
                    }

                    state.selectedSection = section;
                    elements.sectionEnrollmentModal.classList.add('active');
                })
                .catch(error => {
                    showToast('error', 'Error', 'Failed to load section information');
                });
        }

        function openCheckinModal(sectionId) {
            const section = state.sections.find(s => s.id === sectionId);
            if (!section || !elements.checkinModal) return;

            state.selectedSection = section;
            const checkinContent = document.getElementById('checkinContent');
            if (checkinContent) {
                checkinContent.innerHTML = `
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 48px; margin-bottom: 10px;">${section.emoji}</div>
                        <h3 style="margin-bottom: 5px;">${section.name}</h3>
                        <p style="color: var(--text-secondary); margin-bottom: 20px;">${section.subject}</p>
                    </div>
                    <div id="checkinStatus">
                        <div class="spinner"></div>
                        <p style="text-align: center; margin-top: 10px;">Validating your location...</p>
                    </div>
                `;
            }

            elements.checkinModal.classList.add('active');
            validateCheckinLocation(section);
        }

        function openJoinSectionModal() {
            if (elements.joinSectionModal) {
                elements.joinSectionModal.classList.add('active');
            }
        }

        function openManualAttendanceModal() {
            const sectionSelect = document.getElementById('manualAttendanceSection');
            if (!sectionSelect) return;

            sectionSelect.innerHTML = '<option value="">Select a section</option>';

            state.sections.forEach(section => {
                const option = document.createElement('option');
                option.value = section.id;
                option.textContent = section.name;
                sectionSelect.appendChild(option);
            });

            sectionSelect.addEventListener('change', function() {
                const studentSelect = document.getElementById('manualAttendanceStudent');
                if (!studentSelect) return;

                studentSelect.innerHTML = '<option value="">Select a student</option>';

                const sectionId = this.value;
                if (!sectionId) return;

                const section = state.sections.find(s => s.id === sectionId);

                if (section && section.students) {
                    section.students.forEach(studentId => {
                        const student = state.students.find(s => s.id === studentId);
                        if (student) {
                            const option = document.createElement('option');
                            option.value = student.id;
                            option.textContent = student.name;
                            studentSelect.appendChild(option);
                        }
                    });
                }
            });

            if (elements.manualAttendanceModal) {
                elements.manualAttendanceModal.classList.add('active');
            }
        }

        function openBLECheckinModal() {
            const sectionSelect = document.getElementById('bleCheckinSection');
            if (sectionSelect) {
                sectionSelect.innerHTML = '<option value="">Select a section</option>';
                
                const enrolledSections = state.sections.filter(section =>
                    section.students && section.students.includes(state.currentUser.uid)
                );
                
                enrolledSections.forEach(section => {
                    const option = document.createElement('option');
                    option.value = section.id;
                    option.textContent = section.name;
                    sectionSelect.appendChild(option);
                });
            }

            const devicesList = document.getElementById('bleDevicesList');
            if (devicesList) {
                devicesList.innerHTML = '<option value="">No devices scanned</option>';
                devicesList.disabled = true;
            }
            
            const confirmBleCheckin = document.getElementById('confirmBleCheckin');
            if (confirmBleCheckin) {
                confirmBleCheckin.disabled = true;
            }
            
            if (elements.bleCheckinModal) {
                elements.bleCheckinModal.classList.add('active');
            }
        }

        function closeAllModals() {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.classList.remove('active');
            });
            state.selectedSection = null;
        }

        // Section Management Functions
        function createSection() {
            const name = document.getElementById('sectionName')?.value;
            const subject = document.getElementById('sectionSubject')?.value;
            const schedule = document.getElementById('sectionSchedule')?.value;
            const radiusType = document.getElementById('sectionRadius')?.value;
            const customRadius = document.getElementById('sectionCustomRadius')?.value;
            const radius = radiusType === 'custom' ? parseInt(customRadius) : parseInt(radiusType);
            const emoji = document.getElementById('sectionEmoji')?.value;
            const silentScan = document.getElementById('silentScanToggle')?.checked || false;
            const onlineCheckin = document.getElementById('sectionOnlineCheckinToggle')?.checked || false;
            const autoCheckin = document.getElementById('sectionAutoCheckinToggle')?.checked || false;

            if (!name || !subject || !schedule) {
                showToast('error', 'Validation Error', 'Please fill in all required fields');
                return;
            }

            if (isNaN(radius) || radius < 10) {
                showToast('error', 'Validation Error', 'Please enter a valid radius (minimum 10 meters)');
                return;
            }

            LocationService.getCurrentLocation()
                .then(location => {
                    const sectionData = {
                        name,
                        subject,
                        schedule,
                        radius,
                        emoji,
                        location: {
                            latitude: location.latitude,
                            longitude: location.longitude
                        },
                        isActive: true,
                        teacherId: state.currentUser.uid,
                        teacherName: state.userData.name,
                        silentScan,
                        onlineCheckin,
                        autoCheckin,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        students: []
                    };

                    return db.collection('sections').add(sectionData);
                })
                .then((docRef) => {
                    showToast('success', 'Section Created', `${name} has been created successfully`);
                    closeAllModals();
                    loadSections();
                    
                    const createSectionForm = document.getElementById('createSectionForm');
                    if (createSectionForm) createSectionForm.reset();
                })
                .catch(error => {
                    showToast('error', 'Creation Failed', error.message);
                });
        }

        function updateSectionData() {
            const sectionId = document.getElementById('editSectionId')?.value;
            const name = document.getElementById('editSectionName')?.value;
            const subject = document.getElementById('editSectionSubject')?.value;
            const schedule = document.getElementById('editSectionSchedule')?.value;
            const radiusType = document.getElementById('editSectionRadius')?.value;
            const customRadius = document.getElementById('editSectionCustomRadius')?.value;
            const radius = radiusType === 'custom' ? parseInt(customRadius) : parseInt(radiusType);
            const emoji = document.getElementById('editSectionEmoji')?.value;
            const silentScan = document.getElementById('editSilentScanToggle')?.checked || false;
            const onlineCheckin = document.getElementById('editSectionOnlineCheckinToggle')?.checked || false;
            const autoCheckin = document.getElementById('editSectionAutoCheckinToggle')?.checked || false;

            if (!sectionId || !name || !subject || !schedule) {
                showToast('error', 'Validation Error', 'Please fill in all required fields');
                return;
            }

            if (isNaN(radius) || radius < 10) {
                showToast('error', 'Validation Error', 'Please enter a valid radius (minimum 10 meters)');
                return;
            }

            const updateData = {
                name,
                subject,
                schedule,
                radius,
                emoji,
                silentScan,
                onlineCheckin,
                autoCheckin,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            db.collection('sections').doc(sectionId).update(updateData)
                .then(() => {
                    showToast('success', 'Section Updated', `${name} has been updated successfully`);
                    closeAllModals();
                    loadSections();
                })
                .catch(error => {
                    showToast('error', 'Update Failed', error.message);
                });
        }

        function deleteSectionData() {
            const section = state.selectedSection;
            if (!section) return;

            db.collection('sections').doc(section.id).delete()
                .then(() => {
                    // Also delete attendance records for this section
                    const attendanceQuery = db.collection('attendance')
                        .where('sectionId', '==', section.id);

                    return attendanceQuery.get().then(snapshot => {
                        const batch = db.batch();
                        snapshot.docs.forEach(doc => {
                            batch.delete(doc.ref);
                        });
                        return batch.commit();
                    });
                })
                .then(() => {
                    showToast('success', 'Section Deleted', `${section.name} has been deleted successfully`);
                    closeAllModals();
                    loadSections();
                })
                .catch(error => {
                    showToast('error', 'Deletion Failed', error.message);
                });
        }

        function removeStudentFromSection(sectionId, studentId) {
            const section = state.sections.find(s => s.id === sectionId);
            if (!section || !section.students) return;

            const updatedStudents = section.students.filter(id => id !== studentId);

            db.collection('sections').doc(sectionId).update({
                students: updatedStudents
            })
            .then(() => {
                showToast('success', 'Student Removed', 'Student has been removed from the section');
                openSectionStudentsModal(sectionId); // Refresh the modal
                loadSections();
            })
            .catch(error => {
                showToast('error', 'Removal Failed', error.message);
            });
        }

        function enrollInSection() {
            const sectionId = document.getElementById('enrollmentSectionId')?.value;
            if (!sectionId) return;

            db.collection('sections').doc(sectionId).get()
                .then(doc => {
                    if (!doc.exists) {
                        throw new Error('Section not found');
                    }

                    const section = doc.data();

                    if (section.students && section.students.includes(state.currentUser.uid)) {
                        throw new Error('You are already enrolled in this section');
                    }

                    const updatedStudents = section.students ? [...section.students, state.currentUser.uid] : [state.currentUser.uid];

                    return db.collection('sections').doc(sectionId).update({
                        students: updatedStudents
                    });
                })
                .then(() => {
                    showToast('success', 'Enrollment Successful', 'You have been enrolled in the section');
                    closeAllModals();
                    loadSections();
                })
                .catch(error => {
                    showToast('error', 'Enrollment Failed', error.message);
                });
        }

        function copySectionInvitationLink() {
            const linkInput = document.getElementById('sectionInvitationLink');
            if (!linkInput) return;

            linkInput.select();
            linkInput.setSelectionRange(0, 99999);

            navigator.clipboard.writeText(linkInput.value)
                .then(() => {
                    showToast('success', 'Link Copied', 'Invitation link copied to clipboard');
                })
                .catch(() => {
                    document.execCommand('copy');
                    showToast('success', 'Link Copied', 'Invitation link copied to clipboard');
                });
        }

        // Toast Notification System
        function showToast(type, title, message, duration = 5000) {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;

            const icons = {
                success: 'fa-check-circle',
                error: 'fa-exclamation-circle',
                warning: 'fa-exclamation-triangle',
                info: 'fa-info-circle'
            };

            toast.innerHTML = `
                <div class="toast-icon ${type}">
                    <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
                </div>
                <div class="toast-content">
                    <div class="toast-title">${title}</div>
                    <div class="toast-message">${message}</div>
                </div>
                <button class="toast-close">
                    <i class="fas fa-times"></i>
                </button>
            `;

            if (elements.toastContainer) {
                elements.toastContainer.appendChild(toast);
            }

            setTimeout(() => {
                toast.classList.add('show');
            }, 100);

            const closeBtn = toast.querySelector('.toast-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    hideToast(toast);
                });
            }

            if (duration > 0) {
                setTimeout(() => {
                    hideToast(toast);
                }, duration);
            }

            return toast;
        }

        function hideToast(toast) {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }

        // Location Validation for Check-in
        function validateCheckinLocation(section) {
            LocationService.getCurrentLocation(true)
                .then(location => {
                    const validation = NeuralNetworkEngine.validateLocation(
                        location,
                        section.location,
                        section.radius,
                        location.accuracy
                    );

                    const statusElement = document.getElementById('checkinStatus');
                    if (!statusElement) return;

                    if (validation.valid && !validation.fraudDetected) {
                        statusElement.innerHTML = `
                            <div style="text-align: center; color: var(--success);">
                                <i class="fas fa-check-circle" style="font-size: 48px; margin-bottom: 10px;"></i>
                                <h3>Location Validated</h3>
                                <p>You are within the required range (${validation.distance.toFixed(1)}m away)</p>
                                <p style="font-size: 14px; color: var(--text-secondary);">
                                    Confidence: ${(validation.confidence * 100).toFixed(1)}%
                                </p>
                                <div class="accuracy-indicator" style="justify-content: center; margin-top: 8px;">
                                    <div class="accuracy-dot accuracy-${LocationService.getAccuracyLevel(validation.accuracy)}"></div>
                                    <span>${LocationService.getAccuracyLevel(validation.accuracy).toUpperCase()} accuracy</span>
                                </div>
                            </div>
                        `;
                        const confirmCheckin = document.getElementById('confirmCheckin');
                        if (confirmCheckin) confirmCheckin.disabled = false;
                    } else {
                        statusElement.innerHTML = `
                            <div style="text-align: center; color: var(--danger);">
                                <i class="fas fa-times-circle" style="font-size: 48px; margin-bottom: 10px;"></i>
                                <h3>Location Validation Failed</h3>
                                <p>You are ${validation.distance.toFixed(1)}m away from the section location</p>
                                <p>Required: Within ${section.radius}m</p>
                                ${validation.fraudDetected ? 
                                    '<p style="color: var(--warning);">Possible location spoofing detected</p>' : ''}
                                <div class="accuracy-indicator" style="justify-content: center; margin-top: 8px;">
                                    <div class="accuracy-dot accuracy-${LocationService.getAccuracyLevel(validation.accuracy)}"></div>
                                    <span>${LocationService.getAccuracyLevel(validation.accuracy).toUpperCase()} accuracy</span>
                                </div>
                            </div>
                        `;
                        const confirmCheckin = document.getElementById('confirmCheckin');
                        if (confirmCheckin) confirmCheckin.disabled = true;
                    }
                })
                .catch(error => {
                    const statusElement = document.getElementById('checkinStatus');
                    if (statusElement) {
                        statusElement.innerHTML = `
                            <div style="text-align: center; color: var(--danger);">
                                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 10px;"></i>
                                <h3>Location Error</h3>
                                <p>${error.message}</p>
                                <p style="margin-top: 16px;">Try using Bluetooth check-in instead</p>
                                <button class="btn btn-primary" onclick="closeAllModals(); openBLECheckinModal();" style="margin-top: 10px;">
                                    <i class="fas fa-bluetooth"></i>
                                    Use Bluetooth Check-in
                                </button>
                            </div>
                        `;
                    }
                    const confirmCheckin = document.getElementById('confirmCheckin');
                    if (confirmCheckin) confirmCheckin.disabled = true;
                });
        }

        // BLE Device Scanning
        function scanBLEDevices() {
            BLEService.scanForDevices()
                .then(devices => {
                    const devicesList = document.getElementById('bleDevicesList');
                    if (!devicesList) return;

                    devicesList.innerHTML = '';

                    if (devices.length === 0) {
                        devicesList.innerHTML = '<option value="">No devices found</option>';
                        return;
                    }

                    devices.forEach(device => {
                        const option = document.createElement('option');
                        option.value = device.id;
                        option.textContent = device.name || `Device (${device.id.substring(0, 8)})`;
                        devicesList.appendChild(option);
                    });

                    devicesList.disabled = false;
                    const confirmBleCheckin = document.getElementById('confirmBleCheckin');
                    if (confirmBleCheckin) confirmBleCheckin.disabled = false;
                    showToast('success', 'Devices Found', `${devices.length} Bluetooth device(s) found`);
                })
                .catch(error => {
                    showToast('error', 'Scan Failed', error.message);
                });
        }

        function processBLECheckin() {
            const devicesList = document.getElementById('bleDevicesList');
            const sectionSelect = document.getElementById('bleCheckinSection');
            
            if (!devicesList || !sectionSelect) return;

            const selectedDeviceId = devicesList.value;
            const selectedSectionId = sectionSelect.value;

            if (!selectedDeviceId) {
                showToast('error', 'Check-in Failed', 'Please select a device');
                return;
            }

            if (!selectedSectionId) {
                showToast('error', 'Check-in Failed', 'Please select a section');
                return;
            }

            BLEService.validateBLEDevice(selectedDeviceId, selectedSectionId)
                .then(validation => {
                    if (validation.valid) {
                        const attendanceData = {
                            sectionId: selectedSectionId,
                            sectionName: validation.sectionName,
                            studentId: state.currentUser.uid,
                            studentName: state.userData.name,
                            timestamp: new Date(),
                            status: 'present',
                            method: 'bluetooth',
                            deviceId: selectedDeviceId,
                            nearId: state.nearId
                        };

                        return db.collection('attendance').add(attendanceData);
                    } else {
                        throw new Error('Bluetooth device validation failed');
                    }
                })
                .then(() => {
                    showToast('success', 'Check-in Complete', 'Your attendance has been recorded via Bluetooth');
                    closeAllModals();
                    loadAttendanceData();
                })
                .catch(error => {
                    showToast('error', 'Check-in Failed', error.message);
                });
        }

        function cancelAutoCheckin() {
            AutoCheckinService.cancelAutoCheckin();
        }

        // Data Management Functions
        function loadUserData() {
            return db.collection('users').doc(state.currentUser.uid).get()
                .then(doc => {
                    if (doc.exists) {
                        state.userData = doc.data();
                        state.userRole = state.userData.role;

                        return db.collection('userPreferences').doc(state.currentUser.uid).get();
                    } else {
                        throw new Error('User data not found');
                    }
                })
                .then(prefDoc => {
                    if (prefDoc.exists) {
                        const preferences = prefDoc.data();

                        if (preferences.darkMode) {
                            const darkModeToggle = document.getElementById('darkModeToggle');
                            if (darkModeToggle) {
                                darkModeToggle.checked = true;
                                toggleDarkMode();
                            }
                        }

                        if (preferences.autoCheckin !== undefined) {
                            state.autoCheckinEnabled = preferences.autoCheckin;
                            const autoCheckinToggle = document.getElementById('autoCheckinToggle');
                            if (autoCheckinToggle) {
                                autoCheckinToggle.checked = state.autoCheckinEnabled;
                            }
                        }

                        if (preferences.locationPrecision) {
                            const precisionMode = document.getElementById('precisionMode');
                            if (precisionMode) precisionMode.value = preferences.locationPrecision;
                        }
                        if (preferences.checkinRadius) {
                            const checkinRadius = document.getElementById('checkinRadius');
                            if (checkinRadius) checkinRadius.value = preferences.checkinRadius;
                        }
                    }

                    loadSections();
                    loadStudents();
                    loadAttendanceData();

                    return Promise.resolve();
                })
                .catch(error => {
                    console.error('Error loading user data:', error);
                    throw error;
                });
        }

        function loadDashboardData() {
            if (state.userRole === 'teacher') {
                loadTeacherDashboard();
            } else {
                loadStudentDashboard();
            }
        }

        function loadTeacherDashboard() {
            const statsContainer = document.getElementById('dashboardStats');
            if (!statsContainer) return;

            const activeSections = state.sections.filter(s => s.isActive).length;
            const totalStudents = state.students.length;

            const today = new Date().toDateString();
            const todayAttendance = state.attendance.filter(a =>
                new Date(a.timestamp).toDateString() === today
            );
            const presentToday = todayAttendance.filter(a => a.status === 'present').length;

            statsContainer.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">Active Sections</div>
                        <div class="card-icon primary">
                            <i class="fas fa-layer-group"></i>
                        </div>
                    </div>
                    <div class="card-content">${activeSections}</div>
                    <div class="card-footer">Out of ${state.sections.length} total</div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">Students Today</div>
                        <div class="card-icon success">
                            <i class="fas fa-user-check"></i>
                        </div>
                    </div>
                    <div class="card-content">${presentToday}/${totalStudents}</div>
                    <div class="card-footer">${totalStudents ? Math.round((presentToday/totalStudents)*100) : 0}% attendance rate</div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">Pending Check-ins</div>
                        <div class="card-icon warning">
                            <i class="fas fa-clock"></i>
                        </div>
                    </div>
                    <div class="card-content">${todayAttendance.filter(a => a.status === 'pending').length}</div>
                    <div class="card-footer">Require approval</div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">Location Accuracy</div>
                        <div class="card-icon danger">
                            <i class="fas fa-crosshairs"></i>
                        </div>
                    </div>
                    <div class="card-content">${state.currentLocation ? '94%' : 'N/A'}</div>
                    <div class="card-footer">${state.currentLocation ? 'High precision mode' : 'Location not available'}</div>
                </div>
            `;

            updateSectionsCarousel();
        }

        function loadStudentDashboard() {
            const enrolledSections = state.sections.filter(s =>
                s.students && s.students.includes(state.currentUser.uid)
            );

            const today = new Date().toDateString();
            const todayAttendance = state.attendance.filter(a =>
                a.studentId === state.currentUser.uid &&
                new Date(a.timestamp).toDateString() === today
            );

            const presentToday = todayAttendance.filter(a => a.status === 'present').length;
            const totalSections = enrolledSections.length;

            const studentAttendanceToday = document.getElementById('studentAttendanceToday');
            const studentAttendanceRate = document.getElementById('studentAttendanceRate');
            const studentActiveSections = document.getElementById('studentActiveSections');
            const studentLocationAccuracy = document.getElementById('studentLocationAccuracy');
            const studentLocationStatus = document.getElementById('studentLocationStatus');

            if (studentAttendanceToday) studentAttendanceToday.textContent = `${presentToday}/${totalSections}`;
            if (studentAttendanceRate) studentAttendanceRate.textContent = `${totalSections ? Math.round((presentToday/totalSections)*100) : 0}% attendance rate`;
            if (studentActiveSections) studentActiveSections.textContent = enrolledSections.length;

            if (studentLocationAccuracy && studentLocationStatus) {
                if (state.currentLocation) {
                    studentLocationAccuracy.textContent = '94%';
                    studentLocationStatus.textContent = 'High precision mode';
                } else {
                    studentLocationAccuracy.textContent = 'N/A';
                    studentLocationStatus.textContent = 'Location not available';
                }
            }

            updateStudentSectionsCarousel();
        }

        function loadSectionsData() {
            if (state.userRole === 'teacher') {
                updateAllSectionsCarousel();
            } else {
                updateStudentEnrolledSectionsCarousel();
            }
        }

        function loadAttendanceData() {
            if (state.userRole === 'teacher') {
                loadTeacherAttendance();
            } else {
                loadStudentAttendance();
            }
        }

        function loadTeacherAttendance() {
            const container = document.getElementById('attendanceTableContainer');
            if (!container) return;

            if (state.attendance.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-clipboard-check"></i></div><div class="empty-state-title">No attendance records</div><div class="empty-state-description">Attendance records will appear here once students start checking in.</div></div>';
                return;
            }

            const today = new Date().toDateString();
            const todayRecords = state.attendance.filter(a =>
                new Date(a.timestamp).toDateString() === today
            );

            if (todayRecords.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-clipboard-check"></i></div><div class="empty-state-title">No attendance today</div><div class="empty-state-description">No attendance records for today yet.</div></div>';
                return;
            }

            let html = `
                <div style="overflow-x: auto;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Section</th>
                                <th>Time</th>
                                <th>Status</th>
                                <th>Distance</th>
                                <th>Confidence</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            todayRecords.forEach(record => {
                const student = state.students.find(s => s.id === record.studentId) || {
                    name: 'Unknown Student'
                };
                const section = state.sections.find(s => s.id === record.sectionId) || {
                    name: 'Unknown Section'
                };

                html += `
                    <tr>
                        <td>${student.name}</td>
                        <td>${section.name}</td>
                        <td>${new Date(record.timestamp).toLocaleTimeString()}</td>
                        <td>
                            <span class="status-badge status-${record.status}">
                                ${record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            </span>
                        </td>
                        <td>${record.distance ? record.distance.toFixed(1) + 'm' : 'N/A'}</td>
                        <td>${record.confidence ? (record.confidence * 100).toFixed(1) + '%' : 'N/A'}</td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = html;
        }

        function loadStudentAttendance() {
            const container = document.getElementById('studentAttendanceTableContainer');
            const summaryContainer = document.getElementById('studentAttendanceSummary');

            if (!container) return;

            const studentAttendance = state.attendance.filter(a =>
                a.studentId === state.currentUser.uid
            );

            if (studentAttendance.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-clipboard-check"></i></div><div class="empty-state-title">No attendance records</div><div class="empty-state-description">Your attendance records will appear here once you start checking in.</div></div>';
                if (summaryContainer) summaryContainer.innerHTML = '<p>No attendance data available.</p>';
                return;
            }

            studentAttendance.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            let html = `
                <div style="overflow-x: auto;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Section</th>
                                <th>Time</th>
                                <th>Status</th>
                                <th>Method</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            studentAttendance.forEach(record => {
                const section = state.sections.find(s => s.id === record.sectionId) || {
                    name: 'Unknown Section'
                };
                const date = new Date(record.timestamp);

                html += `
                    <tr>
                        <td>${date.toLocaleDateString()}</td>
                        <td>${section.name}</td>
                        <td>${date.toLocaleTimeString()}</td>
                        <td>
                            <span class="status-badge status-${record.status}">
                                ${record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            </span>
                        </td>
                        <td>${record.method || 'Auto'}</td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = html;

            if (summaryContainer) {
                const presentCount = studentAttendance.filter(a => a.status === 'present').length;
                const totalCount = studentAttendance.length;
                const attendanceRate = totalCount ? Math.round((presentCount / totalCount) * 100) : 0;

                summaryContainer.innerHTML = `
                    <div class="dashboard-grid">
                        <div class="card">
                            <div class="card-header">
                                <div class="card-title">Total Check-ins</div>
                                <div class="card-icon primary">
                                    <i class="fas fa-calendar-check"></i>
                                </div>
                            </div>
                            <div class="card-content">${totalCount}</div>
                            <div class="card-footer">All-time records</div>
                        </div>
                        
                        <div class="card">
                            <div class="card-header">
                                <div class="card-title">Present</div>
                                <div class="card-icon success">
                                    <i class="fas fa-user-check"></i>
                                </div>
                            </div>
                            <div class="card-content">${presentCount}</div>
                            <div class="card-footer">${attendanceRate}% attendance rate</div>
                        </div>
                        
                        <div class="card">
                            <div class="card-header">
                                <div class="card-title">Current Streak</div>
                                <div class="card-icon warning">
                                    <i class="fas fa-fire"></i>
                                </div>
                            </div>
                            <div class="card-content">${calculateCurrentStreak(studentAttendance)}</div>
                            <div class="card-footer">Consecutive days present</div>
                        </div>
                    </div>
                `;
            }
        }

        function calculateCurrentStreak(attendance) {
            const sorted = [...attendance].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            let streak = 0;
            let currentDate = new Date();

            const today = new Date().toDateString();
            const todayRecord = sorted.find(a => new Date(a.timestamp).toDateString() === today);

            if (todayRecord && todayRecord.status === 'present') {
                streak = 1;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                return 0;
            }

            for (let i = 1; i <= 30; i++) {
                const dateStr = currentDate.toDateString();
                const dayRecord = sorted.find(a => new Date(a.timestamp).toDateString() === dateStr);

                if (dayRecord && dayRecord.status === 'present') {
                    streak++;
                    currentDate.setDate(currentDate.getDate() - 1);
                } else {
                    break;
                }
            }

            return streak;
        }

        function loadStudentsData() {
            const container = document.getElementById('studentsTableContainer');
            if (!container) return;

            if (state.students.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-users"></i></div><div class="empty-state-title">No students</div><div class="empty-state-description">Students will appear here once they join your sections.</div></div>';
                return;
            }

            let html = `
                <div style="overflow-x: auto;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Sections</th>
                                <th>Last Check-in</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            state.students.forEach(student => {
                const studentSections = state.sections.filter(s =>
                    s.students && s.students.includes(student.id)
                );
                const sectionNames = studentSections.map(s => s.name).join(', ');

                const lastCheckin = state.attendance
                    .filter(a => a.studentId === student.id)
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

                html += `
                    <tr>
                        <td>${student.name}</td>
                        <td>${student.email}</td>
                        <td>${sectionNames || 'Not enrolled'}</td>
                        <td>${lastCheckin ? new Date(lastCheckin.timestamp).toLocaleDateString() : 'Never'}</td>
                        <td>
                            <span class="status-badge ${lastCheckin && lastCheckin.status === 'present' ? 'status-present' : 'status-absent'}">
                                ${lastCheckin && lastCheckin.status === 'present' ? 'Present' : 'Absent'}
                            </span>
                        </td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = html;

            const invitationLink = document.getElementById('invitationLink');
            if (invitationLink) {
                invitationLink.value = `${window.location.origin}?teacher=${state.currentUser.uid}`;
            }
        }

        function loadReportsData() {
            const reportsOverview = document.getElementById('reportsOverview');
            const sectionReports = document.getElementById('sectionReports');
            const studentReports = document.getElementById('studentReports');
            const attendanceTrends = document.getElementById('attendanceTrends');

            if (reportsOverview) reportsOverview.innerHTML = '<p>Reports overview will be displayed here.</p>';
            if (sectionReports) sectionReports.innerHTML = '<p>Section reports will be displayed here.</p>';
            if (studentReports) studentReports.innerHTML = '<p>Student reports will be displayed here.</p>';
            if (attendanceTrends) attendanceTrends.innerHTML = '<p>Attendance trends will be displayed here.</p>';
        }

        function updateSectionsCarousel() {
            const container = document.getElementById('sectionsCarousel');
            if (!container) return;

            const activeSections = state.sections.filter(s => s.isActive);

            if (activeSections.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-layer-group"></i></div><div class="empty-state-title">No sections</div><div class="empty-state-description">Create your first section to get started with attendance tracking.</div><button class="btn btn-primary" onclick="openCreateSectionModal()" style="margin-top: 16px;"><i class="fas fa-plus"></i> Create Section</button></div>';
                return;
            }

            container.innerHTML = activeSections.map(section => `
                <div class="section-card">
                    <div class="section-emoji">${section.emoji}</div>
                    <div class="section-name">${section.name}</div>
                    <div class="section-subject">${section.subject}</div>
                    <div class="section-status status-active">Active • ${section.radius}m radius</div>
                    <div class="section-actions">
                        <button class="btn btn-sm btn-primary" onclick="showSectionDetails('${section.id}')">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="openEditSectionModal('${section.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="openDeleteSectionModal('${section.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }

        function updateStudentSectionsCarousel() {
            const container = document.getElementById('studentSectionsCarousel');
            if (!container) return;

            const enrolledSections = state.sections.filter(s =>
                s.students && s.students.includes(state.currentUser.uid)
            );

            if (enrolledSections.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-layer-group"></i></div><div class="empty-state-title">No sections</div><div class="empty-state-description">You haven\'t joined any sections yet. Ask your teacher for an invitation link.</div><button class="btn btn-primary" onclick="openJoinSectionModal()" style="margin-top: 16px;"><i class="fas fa-plus"></i> Join Section</button></div>';
                return;
            }

            container.innerHTML = enrolledSections.map(section => `
                <div class="section-card" onclick="openCheckinModal('${section.id}')">
                    <div class="section-emoji">${section.emoji}</div>
                    <div class="section-name">${section.name}</div>
                    <div class="section-subject">${section.subject}</div>
                    <div class="section-status status-active">Active • ${section.radius}m radius</div>
                </div>
            `).join('');
        }

        function updateAllSectionsCarousel() {
            const container = document.getElementById('allSectionsCarousel');
            const detailsContainer = document.getElementById('sectionDetails');

            if (!container) return;

            if (state.sections.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-layer-group"></i></div><div class="empty-state-title">No sections</div><div class="empty-state-description">Create your first section to get started with attendance tracking.</div><button class="btn btn-primary" onclick="openCreateSectionModal()" style="margin-top: 16px;"><i class="fas fa-plus"></i> Create Section</button></div>';
                if (detailsContainer) detailsContainer.innerHTML = '<p>Select a section to view details</p>';
                return;
            }

            container.innerHTML = state.sections.map(section => `
                <div class="section-card">
                    <div class="section-emoji">${section.emoji}</div>
                    <div class="section-name">${section.name}</div>
                    <div class="section-subject">${section.subject}</div>
                    <div class="section-status ${section.isActive ? 'status-active' : 'status-inactive'}">
                        ${section.isActive ? 'Active' : 'Inactive'} • ${section.radius}m radius
                    </div>
                    <div class="section-actions">
                        <button class="btn btn-sm btn-primary" onclick="showSectionDetails('${section.id}')">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="openEditSectionModal('${section.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="openSectionStudentsModal('${section.id}')">
                            <i class="fas fa-users"></i>
                        </button>
                        <button class="btn btn-sm btn-info" onclick="openSectionInvitationModal('${section.id}')">
                            <i class="fas fa-share"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="openDeleteSectionModal('${section.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }

        function updateStudentEnrolledSectionsCarousel() {
            const container = document.getElementById('studentEnrolledSectionsCarousel');
            const detailsContainer = document.getElementById('studentSectionDetails');

            if (!container) return;

            const enrolledSections = state.sections.filter(s =>
                s.students && s.students.includes(state.currentUser.uid)
            );

            if (enrolledSections.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-layer-group"></i></div><div class="empty-state-title">No sections</div><div class="empty-state-description">You haven\'t joined any sections yet. Ask your teacher for an invitation link.</div><button class="btn btn-primary" onclick="openJoinSectionModal()" style="margin-top: 16px;"><i class="fas fa-plus"></i> Join Section</button></div>';
                if (detailsContainer) detailsContainer.innerHTML = '<p>Select a section to view details</p>';
                return;
            }

            container.innerHTML = enrolledSections.map(section => `
                <div class="section-card" onclick="showStudentSectionDetails('${section.id}')">
                    <div class="section-emoji">${section.emoji}</div>
                    <div class="section-name">${section.name}</div>
                    <div class="section-subject">${section.subject}</div>
                    <div class="section-status ${section.isActive ? 'status-active' : 'status-inactive'}">
                        ${section.isActive ? 'Active' : 'Inactive'} • ${section.radius}m radius
                    </div>
                </div>
            `).join('');
        }

        function showSectionDetails(sectionId) {
            const section = state.sections.find(s => s.id === sectionId);
            if (!section) return;

            const enrolledStudents = state.students.filter(s =>
                section.students && section.students.includes(s.id)
            );

            const today = new Date().toDateString();
            const todayAttendance = state.attendance.filter(a =>
                a.sectionId === sectionId &&
                new Date(a.timestamp).toDateString() === today
            );

            const detailsContainer = document.getElementById('sectionDetails');
            if (detailsContainer) {
                detailsContainer.innerHTML = `
                    <h3 style="margin-bottom: 16px;">${section.emoji} ${section.name}</h3>
                    <p><strong>Subject:</strong> ${section.subject}</p>
                    <p><strong>Schedule:</strong> ${section.schedule}</p>
                    <p><strong>Location Radius:</strong> ${section.radius} meters</p>
                    <p><strong>Enrolled Students:</strong> ${enrolledStudents.length}</p>
                    <p><strong>Today's Attendance:</strong> ${todayAttendance.filter(a => a.status === 'present').length} present</p>
                    <div style="margin-top: 20px;">
                        <button class="btn btn-primary" onclick="viewSectionAnalytics('${section.id}')" style="margin-right: 10px;">
                            <i class="fas fa-chart-bar"></i>
                            View Analytics
                        </button>
                        <button class="btn btn-secondary" onclick="viewSectionStudents('${section.id}')">
                            <i class="fas fa-users"></i>
                            View Students
                        </button>
                    </div>
                `;
            }
        }

        function showStudentSectionDetails(sectionId) {
            const section = state.sections.find(s => s.id === sectionId);
            if (!section) return;

            const today = new Date().toDateString();
            const todayAttendance = state.attendance.filter(a =>
                a.sectionId === sectionId &&
                a.studentId === state.currentUser.uid &&
                new Date(a.timestamp).toDateString() === today
            );

            const isCheckedIn = todayAttendance.length > 0 && todayAttendance[0].status === 'present';

            const detailsContainer = document.getElementById('studentSectionDetails');
            if (detailsContainer) {
                detailsContainer.innerHTML = `
                    <h3 style="margin-bottom: 16px;">${section.emoji} ${section.name}</h3>
                    <p><strong>Subject:</strong> ${section.subject}</p>
                    <p><strong>Schedule:</strong> ${section.schedule}</p>
                    <p><strong>Location Radius:</strong> ${section.radius} meters</p>
                    <p><strong>Teacher:</strong> ${section.teacherName || 'Unknown'}</p>
                    <p><strong>Today's Status:</strong> ${isCheckedIn ? 'Present' : 'Not Checked In'}</p>
                    <div style="margin-top: 20px;">
                        <button class="btn btn-primary" onclick="openCheckinModal('${section.id}')" ${isCheckedIn ? 'disabled' : ''}>
                            <i class="fas fa-check-circle"></i>
                            ${isCheckedIn ? 'Already Checked In' : 'Check In Now'}
                        </button>
                    </div>
                `;
            }
        }

        // Section Management
        function setSectionLocation() {
            LocationService.getCurrentLocation()
                .then(location => {
                    if (state.maps.sectionLocation) {
                        state.maps.sectionLocation.getView().setCenter(
                            ol.proj.fromLonLat([location.longitude, location.latitude])
                        );
                        state.maps.sectionLocation.getView().setZoom(17);

                        const marker = new ol.Feature({
                            geometry: new ol.geom.Point(ol.proj.fromLonLat([location.longitude, location.latitude]))
                        });

                        marker.setStyle(new ol.style.Style({
                            image: new ol.style.Circle({
                                radius: 8,
                                fill: new ol.style.Fill({
                                    color: 'blue'
                                }),
                                stroke: new ol.style.Stroke({
                                    color: 'white',
                                    width: 2
                                })
                            })
                        }));

                        const vectorSource = new ol.source.Vector({
                            features: [marker]
                        });

                        state.maps.sectionLocation.getLayers().getArray()
                            .filter(layer => layer instanceof ol.layer.Vector)
                            .forEach(layer => state.maps.sectionLocation.removeLayer(layer));

                        state.maps.sectionLocation.addLayer(new ol.layer.Vector({
                            source: vectorSource
                        }));
                    }

                    showToast('success', 'Location Set', 'Section location has been updated');
                })
                .catch(error => {
                    showToast('error', 'Location Error', error.message);
                });
        }

        function viewSectionAnalytics(sectionId) {
            showToast('info', 'Analytics', 'Section analytics will be displayed in a future update');
        }

        function viewSectionStudents(sectionId) {
            showToast('info', 'Students', 'Section students will be displayed in a future update');
        }

        function joinSection() {
            const sectionIdInput = document.getElementById('joinSectionId');
            if (!sectionIdInput) return;

            const sectionId = sectionIdInput.value;

            if (!sectionId) {
                showToast('error', 'Validation Error', 'Please enter a section ID');
                return;
            }

            db.collection('sections').doc(sectionId).get()
                .then(doc => {
                    if (!doc.exists) {
                        throw new Error('Section not found');
                    }

                    const section = doc.data();

                    if (section.students && section.students.includes(state.currentUser.uid)) {
                        throw new Error('You are already enrolled in this section');
                    }

                    const updatedStudents = section.students ? [...section.students, state.currentUser.uid] : [state.currentUser.uid];

                    return db.collection('sections').doc(sectionId).update({
                        students: updatedStudents
                    });
                })
                .then(() => {
                    showToast('success', 'Section Joined', 'You have successfully joined the section');
                    closeAllModals();
                    loadSections();
                    
                    sectionIdInput.value = '';
                })
                .catch(error => {
                    showToast('error', 'Join Failed', error.message);
                });
        }

        // Check-in Processing
        function processCheckin() {
            if (!state.selectedSection) return;

            LocationService.getCurrentLocation()
                .then(location => {
                    const validation = NeuralNetworkEngine.validateLocation(
                        location,
                        state.selectedSection.location,
                        state.selectedSection.radius,
                        location.accuracy
                    );

                    const attendanceData = {
                        sectionId: state.selectedSection.id,
                        sectionName: state.selectedSection.name,
                        studentId: state.currentUser.uid,
                        studentName: state.userData.name,
                        timestamp: new Date(),
                        location: {
                            latitude: location.latitude,
                            longitude: location.longitude,
                            accuracy: location.accuracy
                        },
                        status: validation.valid ? 'present' : 'absent',
                        distance: validation.distance,
                        confidence: validation.confidence,
                        fraudDetected: validation.fraudDetected,
                        method: 'manual',
                        nearId: state.nearId
                    };

                    return db.collection('attendance').add(attendanceData);
                })
                .then(() => {
                    showToast('success', 'Check-in Complete', 'Your attendance has been recorded');
                    closeAllModals();
                    loadAttendanceData();
                })
                .catch(error => {
                    showToast('error', 'Check-in Failed', error.message);
                });
        }

        function saveManualAttendance() {
            const sectionSelect = document.getElementById('manualAttendanceSection');
            const studentSelect = document.getElementById('manualAttendanceStudent');
            const statusSelect = document.getElementById('manualAttendanceStatus');
            const notesInput = document.getElementById('manualAttendanceNotes');

            if (!sectionSelect || !studentSelect || !statusSelect) return;

            const sectionId = sectionSelect.value;
            const studentId = studentSelect.value;
            const status = statusSelect.value;
            const notes = notesInput?.value || '';

            if (!sectionId || !studentId) {
                showToast('error', 'Validation Error', 'Please select both a section and a student');
                return;
            }

            const section = state.sections.find(s => s.id === sectionId);
            const student = state.students.find(s => s.id === studentId);

            if (!section || !student) {
                showToast('error', 'Validation Error', 'Invalid section or student selected');
                return;
            }

            const attendanceData = {
                sectionId: sectionId,
                sectionName: section.name,
                studentId: studentId,
                studentName: student.name,
                timestamp: new Date(),
                status: status,
                method: 'manual',
                notes: notes,
                teacherId: state.currentUser.uid
            };

            db.collection('attendance').add(attendanceData)
                .then(() => {
                    showToast('success', 'Attendance Recorded', `${student.name} marked as ${status}`);
                    closeAllModals();
                    loadAttendanceData();
                    
                    const manualAttendanceForm = document.getElementById('manualAttendanceForm');
                    if (manualAttendanceForm) manualAttendanceForm.reset();
                })
                .catch(error => {
                    showToast('error', 'Save Failed', error.message);
                });
        }

        // Settings Management
        function saveLocationSettings() {
            const precisionMode = document.getElementById('precisionMode')?.value;
            const radiusType = document.getElementById('checkinRadius')?.value;
            const customRadius = document.getElementById('customRadius')?.value;
            const radius = radiusType === 'custom' ? parseInt(customRadius) : parseInt(radiusType);
            const autoCheckin = document.getElementById('autoCheckinToggle')?.checked || false;
            const onlineCheckin = document.getElementById('onlineCheckinToggle')?.checked || false;
            const nearId = document.getElementById('nearIdToggle')?.checked || false;

            state.autoCheckinEnabled = autoCheckin;

            if (state.userRole === 'student') {
                if (autoCheckin) {
                    AutoCheckinService.start();
                } else {
                    AutoCheckinService.stop();
                }
            }

            db.collection('userPreferences').doc(state.currentUser.uid).set({
                    locationPrecision: precisionMode,
                    checkinRadius: radius,
                    autoCheckin: autoCheckin,
                    onlineCheckin: onlineCheckin,
                    nearId: nearId,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, {
                    merge: true
                })
                .then(() => {
                    showToast('success', 'Settings Saved', 'Location preferences updated successfully');
                })
                .catch(error => {
                    showToast('error', 'Save Failed', error.message);
                });
        }

        function saveUserSettings() {
            const displayName = document.getElementById('displayName')?.value;
            const email = document.getElementById('userEmail')?.value;
            const checkinConfirmation = document.getElementById('checkinConfirmation')?.value;
            const locationReminder = document.getElementById('locationReminder')?.value;
            const wattTransparency = document.getElementById('wattToggle')?.checked || false;

            if (!displayName || !email) {
                showToast('error', 'Validation Error', 'Please fill in all required fields');
                return;
            }

            const promises = [];

            if (displayName !== state.userData.name) {
                promises.push(
                    state.currentUser.updateProfile({
                        displayName: displayName
                    })
                );
            }

            if (email !== state.currentUser.email) {
                promises.push(
                    state.currentUser.updateEmail(email)
                );
            }

            Promise.all(promises)
                .then(() => {
                    return db.collection('users').doc(state.currentUser.uid).update({
                        name: displayName,
                        email: email
                    });
                })
                .then(() => {
                    return db.collection('userPreferences').doc(state.currentUser.uid).set({
                        checkinConfirmation: checkinConfirmation,
                        locationReminder: locationReminder,
                        wattTransparency: wattTransparency,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, {
                        merge: true
                    });
                })
                .then(() => {
                    showToast('success', 'Settings Saved', 'Your preferences have been updated');
                    updateUserInterface();
                })
                .catch(error => {
                    showToast('error', 'Save Failed', error.message);
                });
        }

        function resetUserSettings() {
            const displayName = document.getElementById('displayName');
            const userEmail = document.getElementById('userEmail');
            const checkinConfirmation = document.getElementById('checkinConfirmation');
            const locationReminder = document.getElementById('locationReminder');
            const wattToggle = document.getElementById('wattToggle');

            if (displayName) displayName.value = state.userData.name;
            if (userEmail) userEmail.value = state.currentUser.email;
            if (checkinConfirmation) checkinConfirmation.value = 'show';
            if (locationReminder) locationReminder.value = 'auto';
            if (wattToggle) wattToggle.checked = true;

            showToast('info', 'Settings Reset', 'All settings have been reset to defaults');
        }

        function clearLocalData() {
            localStorage.removeItem('nearcheck_location_data');
            localStorage.removeItem('nearcheck_section_data');
            localStorage.removeItem('nearcheck_nearid');

            showToast('success', 'Data Cleared', 'Local data has been cleared successfully');
        }

        function copyInvitationLink() {
            const linkInput = document.getElementById('invitationLink');
            if (!linkInput) return;

            linkInput.select();
            linkInput.setSelectionRange(0, 99999);

            navigator.clipboard.writeText(linkInput.value)
                .then(() => {
                    showToast('success', 'Link Copied', 'Invitation link copied to clipboard');
                })
                .catch(() => {
                    document.execCommand('copy');
                    showToast('success', 'Link Copied', 'Invitation link copied to clipboard');
                });
        }

        // Data Loading from Firestore
        function loadSections() {
            if (!state.currentUser) return;

            if (state.userRole === 'teacher') {
                db.collection('sections')
                    .where('teacherId', '==', state.currentUser.uid)
                    .orderBy('createdAt', 'desc')
                    .onSnapshot((snapshot) => {
                        state.sections = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));

                        loadStudents();

                        if (state.currentPage === 'dashboard') {
                            loadDashboardData();
                        } else if (state.currentPage === 'sections') {
                            loadSectionsData();
                        }
                    }, error => {
                        console.error('Error loading sections:', error);
                    });
            } else {
                db.collection('sections')
                    .where('students', 'array-contains', state.currentUser.uid)
                    .orderBy('createdAt', 'desc')
                    .onSnapshot((snapshot) => {
                        state.sections = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));

                        if (state.currentPage === 'dashboard') {
                            loadDashboardData();
                        } else if (state.currentPage === 'sections') {
                            loadSectionsData();
                        }
                    }, error => {
                        console.error('Error loading sections:', error);
                    });
            }
        }

        function loadStudents() {
            if (!state.currentUser || state.userRole !== 'teacher') return;

            const studentIds = new Set();
            state.sections.forEach(section => {
                if (section.students) {
                    section.students.forEach(studentId => {
                        studentIds.add(studentId);
                    });
                }
            });

            if (studentIds.size === 0) {
                state.students = [];
                if (state.currentPage === 'students') {
                    loadStudentsData();
                }
                return;
            }

            const studentPromises = Array.from(studentIds).map(studentId =>
                db.collection('users').doc(studentId).get()
            );

            Promise.all(studentPromises)
                .then(docs => {
                    state.students = docs
                        .filter(doc => doc.exists)
                        .map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));

                    if (state.currentPage === 'students') {
                        loadStudentsData();
                    }
                })
                .catch(error => {
                    console.error('Error loading students:', error);
                });
        }

        function loadAttendanceData() {
            if (!state.currentUser) return;

            if (state.userRole === 'teacher') {
                const sectionIds = state.sections.map(s => s.id);

                if (sectionIds.length === 0) {
                    state.attendance = [];
                    if (state.currentPage === 'attendance') {
                        loadAttendanceData();
                    }
                    return;
                }

                db.collection('attendance')
                    .where('sectionId', 'in', sectionIds)
                    .orderBy('timestamp', 'desc')
                    .limit(100)
                    .onSnapshot((snapshot) => {
                        state.attendance = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));

                        if (state.currentPage === 'attendance') {
                            loadAttendanceData();
                        } else if (state.currentPage === 'dashboard') {
                            loadDashboardData();
                        }
                    }, error => {
                        console.error('Error loading attendance:', error);
                    });
            } else {
                db.collection('attendance')
                    .where('studentId', '==', state.currentUser.uid)
                    .orderBy('timestamp', 'desc')
                    .onSnapshot((snapshot) => {
                        state.attendance = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));

                        if (state.currentPage === 'attendance') {
                            loadAttendanceData();
                        } else if (state.currentPage === 'dashboard') {
                            loadDashboardData();
                        }
                    }, error => {
                        console.error('Error loading attendance:', error);
                    });
            }
        }

        // Initialize Application
        function init() {
            try {
                initializeMaps();
                setupEventListeners();
                initAuth();

                const urlParams = new URLSearchParams(window.location.search);
                const teacherId = urlParams.get('teacher');
                const sectionId = urlParams.get('section');

                if (teacherId || sectionId) {
                    localStorage.setItem('nearcheck_invitation', JSON.stringify({
                        teacherId: teacherId,
                        sectionId: sectionId
                    }));
                }

                LocationService.getCurrentLocation().catch(error => {
                    console.log('Location not available:', error.message);
                });

                console.log('NearCheck+ initialized successfully');
            } catch (error) {
                console.error('Error initializing application:', error);
                showToast('error', 'Initialization Error', 'Failed to initialize application');
            }
        }

        // Make functions available globally for onclick handlers
        window.openCheckinModal = openCheckinModal;
        window.showSectionDetails = showSectionDetails;
        window.showStudentSectionDetails = showStudentSectionDetails;
        window.viewSectionAnalytics = viewSectionAnalytics;
        window.viewSectionStudents = viewSectionStudents;
        window.openCreateSectionModal = openCreateSectionModal;
        window.openEditSectionModal = openEditSectionModal;
        window.openDeleteSectionModal = openDeleteSectionModal;
        window.openSectionStudentsModal = openSectionStudentsModal;
        window.openSectionInvitationModal = openSectionInvitationModal;
        window.openJoinSectionModal = openJoinSectionModal;
        window.openBLECheckinModal = openBLECheckinModal;
        window.switchPage = switchPage;
        window.cancelAutoCheckin = cancelAutoCheckin;
        window.removeStudentFromSection = removeStudentFromSection;

        // Start the application
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }