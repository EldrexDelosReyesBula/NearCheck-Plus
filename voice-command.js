// voice-commands.js
// NearTalk: Voice Command System for NearCheck+
// File should be saved as voice-commands.js and included in HTML

const voiceCommands = {
    isInitialized: false,
    isListening: false,
    recognition: null,
    commands: {
        // Navigation commands
        navigation: [
            { command: 'go to dashboard', action: () => loadPage('dashboard'), description: 'Navigate to dashboard' },
            { command: 'show dashboard', action: () => loadPage('dashboard'), description: 'Show dashboard' },
            { command: 'go to sections', action: () => loadPage('sections'), description: 'Navigate to sections' },
            { command: 'show sections', action: () => loadPage('sections'), description: 'Show sections' },
            { command: 'go to sessions', action: () => appState.currentUser?.role === 'teacher' && loadPage('sessions'), description: 'Navigate to sessions (teachers only)' },
            { command: 'show sessions', action: () => appState.currentUser?.role === 'teacher' && loadPage('sessions'), description: 'Show sessions' },
            { command: 'go to messages', action: () => loadPage('messages'), description: 'Navigate to messages' },
            { command: 'show messages', action: () => loadPage('messages'), description: 'Show messages' },
            { command: 'go to settings', action: () => loadPage('settings'), description: 'Navigate to settings' },
            { command: 'show settings', action: () => loadPage('settings'), description: 'Show settings' },
            { command: 'go to profile', action: () => loadPage('profile'), description: 'Navigate to profile' },
            { command: 'show profile', action: () => loadPage('profile'), description: 'Show profile' },
            { command: 'open menu', action: () => openNavigationDrawer(), description: 'Open navigation menu' },
            { command: 'show menu', action: () => openNavigationDrawer(), description: 'Show navigation menu' },
            { command: 'search', action: () => openFullscreenSearch(), description: 'Open search' },
            { command: 'open search', action: () => openFullscreenSearch(), description: 'Open search panel' },
            { command: 'notifications', action: () => openFullscreenNotifications(), description: 'Open notifications' },
            { command: 'show notifications', action: () => openFullscreenNotifications(), description: 'Show notifications' },
            { command: 'go back', action: () => window.history.length > 1 && window.history.back(), description: 'Go back' },
            { command: 'close', action: () => closeModal(), description: 'Close current modal or sheet' },
        ],
        
        // Section management commands
        sections: [
            { command: 'create section', action: () => appState.currentUser?.role === 'teacher' && openCreateSectionModal(), description: 'Create new section (teachers only)' },
            { command: 'new section', action: () => appState.currentUser?.role === 'teacher' && openCreateSectionModal(), description: 'Create new section' },
            { command: 'join section', action: () => appState.currentUser?.role === 'student' && openJoinSectionModal(), description: 'Join a section (students only)' },
            { command: 'open section', action: () => voiceCommands.handleOpenSection(), description: 'Open a specific section' },
            { command: 'view section', action: () => voiceCommands.handleOpenSection(), description: 'View a specific section' },
        ],
        
        // Session and attendance commands
        attendance: [
            { command: 'check in', action: () => appState.currentUser?.role === 'student' && performManualCheckIn(), description: 'Check in to active session (students only)' },
            { command: 'manual check in', action: () => appState.currentUser?.role === 'student' && performManualCheckIn(), description: 'Manual check in' },
            { command: 'start session', action: () => appState.currentUser?.role === 'teacher' && openStartSessionModal(), description: 'Start new session (teachers only)' },
            { command: 'new session', action: () => appState.currentUser?.role === 'teacher' && openStartSessionModal(), description: 'Start new session' },
            { command: 'end session', action: () => voiceCommands.handleEndSession(), description: 'End current session' },
            { command: 'view attendance', action: () => openAttendanceHistoryModal(), description: 'View attendance history' },
            { command: 'take attendance', action: () => appState.currentUser?.role === 'teacher' && voiceCommands.handleTakeAttendance(), description: 'Take manual attendance' },
        ],
        
        // Messaging commands
        messaging: [
            { command: 'send announcement', action: () => appState.currentUser?.role === 'teacher' && openQuickAnnouncementModal(), description: 'Send announcement (teachers only)' },
            { command: 'new announcement', action: () => appState.currentUser?.role === 'teacher' && openQuickAnnouncementModal(), description: 'Create new announcement' },
            { command: 'reply to message', action: () => voiceCommands.handleReplyToMessage(), description: 'Reply to current message' },
            { command: 'mark as read', action: () => voiceCommands.handleMarkAsRead(), description: 'Mark message as read' },
            { command: 'mark all as read', action: () => markAllAsRead(), description: 'Mark all messages as read' },
        ],
        
        // Settings and profile commands
        settings: [
            { command: 'toggle location', action: () => voiceCommands.toggleSetting('locationAccess'), description: 'Toggle location access' },
            { command: 'toggle notifications', action: () => voiceCommands.toggleSetting('notifications'), description: 'Toggle notifications' },
            { command: 'toggle auto check in', action: () => voiceCommands.toggleSetting('autoCheckIn'), description: 'Toggle auto check-in' },
            { command: 'toggle voice commands', action: () => voiceCommands.toggleSetting('voiceCommands'), description: 'Toggle voice commands' },
            { command: 'toggle high contrast', action: () => voiceCommands.toggleSetting('highContrast'), description: 'Toggle high contrast mode' },
            { command: 'save profile', action: () => saveProfile(), description: 'Save profile changes' },
            { command: 'logout', action: () => logoutUser(), description: 'Logout from account' },
            { command: 'sign out', action: () => logoutUser(), description: 'Sign out' },
        ],
        
        // Utility commands
        utility: [
            { command: 'help', action: () => voiceCommands.showHelp(), description: 'Show voice command help' },
            { command: 'what can i say', action: () => voiceCommands.showHelp(), description: 'Show available commands' },
            { command: 'stop listening', action: () => voiceCommands.stop(), description: 'Stop voice recognition' },
            { command: 'start listening', action: () => voiceCommands.start(), description: 'Start voice recognition' },
            { command: 'refresh', action: () => location.reload(), description: 'Refresh the page' },
            { command: 'go home', action: () => loadPage('dashboard'), description: 'Go to home/dashboard' },
        ]
    },
    
    // Status indicators
    status: {
        initialized: false,
        supported: false,
        permission: 'default',
        language: 'en-US'
    },
    
    // Voice command history
    history: [],
    maxHistorySize: 20,
    
    // DOM elements
    elements: {
        voiceIndicator: null,
        voiceOverlay: null,
        voiceFeedback: null,
        helpModal: null
    },
    
    // Initialize NearTalk
    init: function() {
        if (this.isInitialized) {
            console.log('NearTalk already initialized');
            return;
        }
        
        // Check browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported in this browser');
            this.showToast('Voice commands are not supported in your browser');
            return;
        }
        
        this.status.supported = true;
        
        // Initialize speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configure recognition
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = this.status.language;
        this.recognition.maxAlternatives = 3;
        
        // Set up event handlers
        this.setupRecognitionEvents();
        
        // Create UI elements
        this.createUIElements();
        
        // Check permission
        this.checkPermission();
        
        this.isInitialized = true;
        console.log('NearTalk initialized successfully');
        
        // Show welcome message
        setTimeout(() => {
            this.showToast('NearTalk voice commands are ready. Say "help" to see available commands.');
        }, 1000);
        
        return true;
    },
    
    // Check microphone permission
    checkPermission: function() {
        if (!navigator.permissions || !navigator.permissions.query) {
            this.status.permission = 'granted'; // Assume granted for older browsers
            return;
        }
        
        navigator.permissions.query({ name: 'microphone' })
            .then(permissionStatus => {
                this.status.permission = permissionStatus.state;
                
                permissionStatus.onchange = () => {
                    this.status.permission = permissionStatus.state;
                    this.updatePermissionStatus();
                };
                
                this.updatePermissionStatus();
            })
            .catch(error => {
                console.error('Error checking microphone permission:', error);
                this.status.permission = 'prompt';
            });
    },
    
    // Update permission status UI
    updatePermissionStatus: function() {
        if (!this.elements.voiceIndicator) return;
        
        switch (this.status.permission) {
            case 'granted':
                this.elements.voiceIndicator.style.backgroundColor = '#4CAF50';
                break;
            case 'denied':
                this.elements.voiceIndicator.style.backgroundColor = '#F44336';
                this.showToast('Microphone access denied. Please enable in browser settings.');
                break;
            case 'prompt':
                this.elements.voiceIndicator.style.backgroundColor = '#FF9800';
                break;
        }
    },
    
    // Create UI elements for voice feedback
    createUIElements: function() {
        // Create voice indicator (floating button)
        this.elements.voiceIndicator = document.createElement('div');
        this.elements.voiceIndicator.className = 'voice-indicator';
        this.elements.voiceIndicator.innerHTML = `
            <span class="material-icons">mic</span>
            <div class="voice-status">Ready</div>
        `;
        this.elements.voiceIndicator.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 60px;
            height: 60px;
            background-color: #6750A4;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            cursor: pointer;
            z-index: 9998;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
            user-select: none;
        `;
        
        // Create voice overlay
        this.elements.voiceOverlay = document.createElement('div');
        this.elements.voiceOverlay.className = 'voice-overlay';
        this.elements.voiceOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(103, 80, 164, 0.1);
            backdrop-filter: blur(4px);
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9997;
            pointer-events: none;
        `;
        
        // Create voice feedback element
        this.elements.voiceFeedback = document.createElement('div');
        this.elements.voiceFeedback.className = 'voice-feedback';
        this.elements.voiceFeedback.style.cssText = `
            background-color: white;
            padding: 24px 32px;
            border-radius: 16px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            text-align: center;
            max-width: 400px;
            width: 80%;
            pointer-events: auto;
        `;
        
        // Create listening animation
        const listeningAnimation = document.createElement('div');
        listeningAnimation.className = 'listening-animation';
        listeningAnimation.innerHTML = `
            <div class="pulse-ring"></div>
            <div class="pulse-ring delay-1"></div>
            <div class="pulse-ring delay-2"></div>
            <span class="material-icons" style="font-size: 48px; color: #6750A4;">mic</span>
        `;
        listeningAnimation.style.cssText = `
            position: relative;
            width: 100px;
            height: 100px;
            margin-bottom: 20px;
        `;
        
        // Create pulse rings style
        const pulseStyle = document.createElement('style');
        pulseStyle.textContent = `
            .pulse-ring {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                border: 3px solid #6750A4;
                animation: pulse 2s infinite;
                opacity: 0;
            }
            .pulse-ring.delay-1 {
                animation-delay: 0.66s;
            }
            .pulse-ring.delay-2 {
                animation-delay: 1.33s;
            }
            @keyframes pulse {
                0% {
                    transform: scale(0.8);
                    opacity: 1;
                }
                100% {
                    transform: scale(1.5);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(pulseStyle);
        
        // Create feedback text
        const feedbackText = document.createElement('div');
        feedbackText.className = 'feedback-text';
        feedbackText.textContent = 'Listening... Speak now';
        feedbackText.style.cssText = `
            font-size: 18px;
            font-weight: 500;
            color: #1D1B20;
            margin-bottom: 16px;
        `;
        
        // Create command display
        const commandDisplay = document.createElement('div');
        commandDisplay.className = 'command-display';
        commandDisplay.textContent = 'Say a command like "go to dashboard"';
        commandDisplay.style.cssText = `
            font-size: 14px;
            color: #79747E;
            margin-bottom: 24px;
            min-height: 20px;
        `;
        
        // Create stop button
        const stopButton = document.createElement('button');
        stopButton.className = 'button button-filled';
        stopButton.textContent = 'Stop Listening';
        stopButton.style.cssText = `
            background-color: #F44336;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 100px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
        `;
        stopButton.addEventListener('click', () => this.stop());
        
        // Assemble feedback element
        this.elements.voiceFeedback.appendChild(listeningAnimation);
        this.elements.voiceFeedback.appendChild(feedbackText);
        this.elements.voiceFeedback.appendChild(commandDisplay);
        this.elements.voiceFeedback.appendChild(stopButton);
        
        this.elements.voiceOverlay.appendChild(this.elements.voiceFeedback);
        
        // Add elements to body
        document.body.appendChild(this.elements.voiceIndicator);
        document.body.appendChild(this.elements.voiceOverlay);
        
        // Add event listeners
        this.elements.voiceIndicator.addEventListener('click', () => {
            if (this.isListening) {
                this.stop();
            } else {
                this.start();
            }
        });
        
        // Add hover effects
        this.elements.voiceIndicator.addEventListener('mouseenter', () => {
            this.elements.voiceIndicator.style.transform = 'scale(1.1)';
        });
        
        this.elements.voiceIndicator.addEventListener('mouseleave', () => {
            this.elements.voiceIndicator.style.transform = 'scale(1)';
        });
        
        // Update permission status
        this.updatePermissionStatus();
    },
    
    // Setup recognition events
    setupRecognitionEvents: function() {
        if (!this.recognition) return;
        
        this.recognition.onstart = () => {
            console.log('Voice recognition started');
            this.isListening = true;
            this.showListeningUI();
        };
        
        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase().trim();
            const confidence = event.results[0][0].confidence;
            
            console.log(`Voice command: "${transcript}" (confidence: ${confidence})`);
            
            this.updateCommandDisplay(transcript);
            
            // Process command after a short delay for better UX
            setTimeout(() => {
                this.processCommand(transcript, confidence);
            }, 500);
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.handleRecognitionError(event.error);
            this.stop();
        };
        
        this.recognition.onend = () => {
            console.log('Voice recognition ended');
            this.isListening = false;
            this.hideListeningUI();
        };
    },
    
    // Show listening UI
    showListeningUI: function() {
        if (this.elements.voiceIndicator) {
            this.elements.voiceIndicator.style.backgroundColor = '#F44336';
            this.elements.voiceIndicator.querySelector('.voice-status').textContent = 'Listening';
            this.elements.voiceIndicator.querySelector('.material-icons').textContent = 'mic_off';
            this.elements.voiceIndicator.style.transform = 'scale(1.1)';
        }
        
        if (this.elements.voiceOverlay) {
            this.elements.voiceOverlay.style.display = 'flex';
        }
        
        // Provide haptic feedback if enabled
        if (appState.settings.hapticFeedback && 'vibrate' in navigator) {
            navigator.vibrate([50, 50, 50]);
        }
    },
    
    // Hide listening UI
    hideListeningUI: function() {
        if (this.elements.voiceIndicator) {
            this.elements.voiceIndicator.style.backgroundColor = '#6750A4';
            this.elements.voiceIndicator.querySelector('.voice-status').textContent = 'Ready';
            this.elements.voiceIndicator.querySelector('.material-icons').textContent = 'mic';
            this.elements.voiceIndicator.style.transform = 'scale(1)';
        }
        
        if (this.elements.voiceOverlay) {
            this.elements.voiceOverlay.style.display = 'none';
        }
    },
    
    // Update command display
    updateCommandDisplay: function(command) {
        const commandDisplay = this.elements.voiceFeedback?.querySelector('.command-display');
        if (commandDisplay) {
            commandDisplay.textContent = `Heard: "${command}"`;
            commandDisplay.style.color = '#1D1B20';
            commandDisplay.style.fontWeight = '500';
        }
    },
    
    // Handle recognition errors
    handleRecognitionError: function(error) {
        let errorMessage = 'Voice recognition error';
        
        switch (error) {
            case 'no-speech':
                errorMessage = 'No speech detected. Please try again.';
                break;
            case 'audio-capture':
                errorMessage = 'No microphone found. Please check your microphone.';
                break;
            case 'not-allowed':
                errorMessage = 'Microphone access denied. Please enable microphone permissions.';
                break;
            case 'network':
                errorMessage = 'Network error. Please check your connection.';
                break;
            case 'aborted':
                errorMessage = 'Voice recognition aborted.';
                break;
            default:
                errorMessage = `Error: ${error}`;
        }
        
        this.showToast(errorMessage);
        
        // Update UI
        const commandDisplay = this.elements.voiceFeedback?.querySelector('.command-display');
        if (commandDisplay) {
            commandDisplay.textContent = errorMessage;
            commandDisplay.style.color = '#F44336';
        }
    },
    
    // Process voice command
    processCommand: function(transcript, confidence) {
        // Add to history
        this.addToHistory(transcript);
        
        // Normalize transcript
        const normalizedTranscript = transcript.toLowerCase().trim();
        
        // Check for exact matches first
        let matchedCommand = null;
        
        // Search through all command categories
        for (const category in this.commands) {
            matchedCommand = this.commands[category].find(cmd => {
                return normalizedTranscript === cmd.command.toLowerCase();
            });
            
            if (matchedCommand) break;
        }
        
        // If no exact match, try fuzzy matching
        if (!matchedCommand) {
            matchedCommand = this.fuzzyMatchCommand(normalizedTranscript);
        }
        
        if (matchedCommand) {
            this.executeCommand(matchedCommand, normalizedTranscript);
        } else {
            this.handleUnknownCommand(normalizedTranscript);
        }
    },
    
    // Fuzzy match command
    fuzzyMatchCommand: function(transcript) {
        let bestMatch = null;
        let bestScore = 0;
        const threshold = 0.7; // Similarity threshold
        
        // Calculate Levenshtein distance
        function similarity(s1, s2) {
            const longer = s1.length > s2.length ? s1 : s2;
            const shorter = s1.length > s2.length ? s2 : s1;
            
            if (longer.length === 0) return 1.0;
            
            const distance = levenshteinDistance(longer, shorter);
            return (longer.length - distance) / longer.length;
        }
        
        // Levenshtein distance algorithm
        function levenshteinDistance(s1, s2) {
            const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
            
            for (let i = 0; i <= s1.length; i++) {
                matrix[0][i] = i;
            }
            
            for (let j = 0; j <= s2.length; j++) {
                matrix[j][0] = j;
            }
            
            for (let j = 1; j <= s2.length; j++) {
                for (let i = 1; i <= s1.length; i++) {
                    const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
                    matrix[j][i] = Math.min(
                        matrix[j][i - 1] + 1,
                        matrix[j - 1][i] + 1,
                        matrix[j - 1][i - 1] + indicator
                    );
                }
            }
            
            return matrix[s2.length][s1.length];
        }
        
        // Search through all commands
        for (const category in this.commands) {
            for (const command of this.commands[category]) {
                const score = similarity(transcript, command.command);
                
                if (score > bestScore && score >= threshold) {
                    bestScore = score;
                    bestMatch = command;
                }
            }
        }
        
        return bestMatch;
    },
    
    // Execute command
    executeCommand: function(command, transcript) {
        console.log(`Executing command: ${command.command}`);
        
        // Update UI feedback
        const commandDisplay = this.elements.voiceFeedback?.querySelector('.command-display');
        if (commandDisplay) {
            commandDisplay.textContent = `Executing: "${command.description}"`;
            commandDisplay.style.color = '#4CAF50';
        }
        
        // Provide audio feedback if available
        this.playSuccessSound();
        
        // Execute the command action
        try {
            command.action();
            
            // Show confirmation
            this.showToast(`Command executed: ${command.description}`);
            
            // Log analytics if enabled
            if (appState.settings.analyticsEnabled) {
                this.logVoiceCommandUsage(command.command, transcript);
            }
        } catch (error) {
            console.error('Error executing command:', error);
            this.showToast(`Error executing command: ${error.message}`);
            
            if (commandDisplay) {
                commandDisplay.textContent = `Error: ${error.message}`;
                commandDisplay.style.color = '#F44336';
            }
        }
        
        // Restart listening after delay
        setTimeout(() => {
            if (this.isInitialized && appState.settings.voiceCommands) {
                this.start();
            }
        }, 2000);
    },
    
    // Handle unknown command
    handleUnknownCommand: function(transcript) {
        console.log(`Unknown command: "${transcript}"`);
        
        // Update UI
        const commandDisplay = this.elements.voiceFeedback?.querySelector('.command-display');
        if (commandDisplay) {
            commandDisplay.textContent = `Unknown command: "${transcript}"`;
            commandDisplay.style.color = '#FF9800';
        }
        
        this.showToast(`Command not recognized: "${transcript}". Say "help" for available commands.`);
        
        // Restart listening after delay
        setTimeout(() => {
            if (this.isInitialized && appState.settings.voiceCommands) {
                this.start();
            }
        }, 2000);
    },
    
    // Add command to history
    addToHistory: function(command) {
        this.history.unshift({
            command: command,
            timestamp: new Date().toISOString(),
            page: appState.currentPage
        });
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.pop();
        }
        
        // Save to localStorage
        this.saveHistory();
    },
    
    // Save history to localStorage
    saveHistory: function() {
        try {
            localStorage.setItem('nearTalkHistory', JSON.stringify(this.history));
        } catch (error) {
            console.error('Error saving voice command history:', error);
        }
    },
    
    // Load history from localStorage
    loadHistory: function() {
        try {
            const savedHistory = localStorage.getItem('nearTalkHistory');
            if (savedHistory) {
                this.history = JSON.parse(savedHistory);
            }
        } catch (error) {
            console.error('Error loading voice command history:', error);
        }
    },
    
    // Start voice recognition
    start: function() {
        if (!this.isInitialized || !this.status.supported) {
            this.showToast('Voice commands not available');
            return false;
        }
        
        if (this.status.permission === 'denied') {
            this.showToast('Microphone access denied. Please enable in browser settings.');
            return false;
        }
        
        if (this.isListening) {
            console.log('Already listening');
            return false;
        }
        
        try {
            this.recognition.start();
            return true;
        } catch (error) {
            console.error('Error starting voice recognition:', error);
            this.showToast('Error starting voice recognition. Please try again.');
            return false;
        }
    },
    
    // Stop voice recognition
    stop: function() {
        if (!this.isInitialized || !this.isListening) {
            return false;
        }
        
        try {
            this.recognition.stop();
            this.isListening = false;
            this.hideListeningUI();
            return true;
        } catch (error) {
            console.error('Error stopping voice recognition:', error);
            return false;
        }
    },
    
    // Toggle voice recognition
    toggle: function() {
        if (this.isListening) {
            return this.stop();
        } else {
            return this.start();
        }
    },
    
    // Play success sound
    playSuccessSound: function() {
        // Create audio context for success sound
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
            
            // Clean up
            setTimeout(() => {
                oscillator.disconnect();
                gainNode.disconnect();
            }, 300);
        } catch (error) {
            console.error('Error playing success sound:', error);
        }
    },
    
    // Show help modal
    showHelp: function() {
        if (this.elements.helpModal) {
            this.elements.helpModal.remove();
        }
        
        // Create help modal
        this.elements.helpModal = document.createElement('div');
        this.elements.helpModal.className = 'voice-help-modal';
        this.elements.helpModal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: white;
            border-radius: 16px;
            padding: 24px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 10000;
            box-shadow: 0 16px 32px rgba(0,0,0,0.2);
        `;
        
        // Create modal content
        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #1D1B20;">NearTalk Voice Commands</h2>
                <button class="close-help" style="background: none; border: none; cursor: pointer; color: #79747E;">
                    <span class="material-icons">close</span>
                </button>
            </div>
            
            <div style="margin-bottom: 24px; color: #79747E;">
                <p>Say any of the following commands to control NearCheck+. Commands will execute based on your role (teacher/student).</p>
            </div>
        `;
        
        // Add commands by category
        for (const category in this.commands) {
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
            const categoryCommands = this.commands[category];
            
            html += `
                <div style="margin-bottom: 24px;">
                    <h3 style="color: #6750A4; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #E7E0EC;">${categoryName}</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px;">
            `;
            
            categoryCommands.forEach(cmd => {
                html += `
                    <div style="background-color: #F7F2FA; padding: 12px; border-radius: 8px;">
                        <div style="font-weight: 500; color: #1D1B20; margin-bottom: 4px;">"${cmd.command}"</div>
                        <div style="font-size: 12px; color: #79747E;">${cmd.description}</div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        // Add recent history if available
        if (this.history.length > 0) {
            html += `
                <div style="margin-bottom: 24px;">
                    <h3 style="color: #6750A4; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #E7E0EC;">Recent Commands</h3>
                    <div style="max-height: 200px; overflow-y: auto;">
            `;
            
            this.history.slice(0, 10).forEach(item => {
                const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #F7F2FA;">
                        <div style="color: #1D1B20;">"${item.command}"</div>
                        <div style="font-size: 12px; color: #79747E;">${time} • ${item.page}</div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        // Add tips
        html += `
            <div style="background-color: #E8DEF8; padding: 16px; border-radius: 12px; margin-top: 24px;">
                <h4 style="color: #1D1B20; margin-top: 0; margin-bottom: 8px;">Tips for Best Results:</h4>
                <ul style="margin: 0; padding-left: 20px; color: #49454F;">
                    <li>Speak clearly and at a normal pace</li>
                    <li>Use a quiet environment</li>
                    <li>Keep the microphone close to your mouth</li>
                    <li>Say "stop listening" to pause voice commands</li>
                    <li>Some commands are role-specific (teacher/student only)</li>
                </ul>
            </div>
        `;
        
        this.elements.helpModal.innerHTML = html;
        
        // Add close button event
        const closeButton = this.elements.helpModal.querySelector('.close-help');
        closeButton.addEventListener('click', () => {
            this.elements.helpModal.remove();
            this.elements.helpModal = null;
        });
        
        // Add click outside to close
        this.elements.helpModal.addEventListener('click', (e) => {
            if (e.target === this.elements.helpModal) {
                this.elements.helpModal.remove();
                this.elements.helpModal = null;
            }
        });
        
        // Add to document
        document.body.appendChild(this.elements.helpModal);
        
        // Stop listening while help is open
        if (this.isListening) {
            this.stop();
        }
    },
    
    // Handle complex commands
    handleOpenSection: function() {
        if (!appState.sections || appState.sections.length === 0) {
            this.showToast('No sections available');
            return;
        }
        
        if (appState.sections.length === 1) {
            openSectionDetails(appState.sections[0].id);
        } else {
            // Show section selection
            let html = `
                <div class="sheet-header">
                    <div class="sheet-title">Select Section</div>
                    <button class="sheet-close" id="sheetClose" aria-label="Close">
                        <span class="material-icons" aria-hidden="true">close</span>
                    </button>
                </div>
                <div class="sheet-content">
                    <div class="list">
            `;
            
            appState.sections.forEach(section => {
                html += `
                    <div class="list-item" onclick="openSectionDetails('${section.id}'); closeModal()">
                        <div class="list-item-icon">${section.emoji}</div>
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
    },
    
    handleEndSession: function() {
        if (appState.currentUser?.role !== 'teacher') {
            this.showToast('Only teachers can end sessions');
            return;
        }
        
        if (!appState.activeSessions || appState.activeSessions.length === 0) {
            this.showToast('No active sessions');
            return;
        }
        
        if (appState.activeSessions.length === 1) {
            endSession(appState.activeSessions[0].id);
        } else {
            // Show session selection
            let html = `
                <div class="sheet-header">
                    <div class="sheet-title">Select Session to End</div>
                    <button class="sheet-close" id="sheetClose" aria-label="Close">
                        <span class="material-icons" aria-hidden="true">close</span>
                    </button>
                </div>
                <div class="sheet-content">
                    <div class="list">
            `;
            
            appState.activeSessions.forEach(session => {
                const section = appState.sections.find(s => s.id === session.sectionId);
                if (!section) return;
                
                html += `
                    <div class="list-item" onclick="endSession('${session.id}'); closeModal()">
                        <div class="list-item-icon">${section.emoji}</div>
                        <div class="list-item-content">
                            <div class="list-item-title">${section.name}</div>
                            <div class="list-item-subtitle">${formatSessionDuration(session.startTime)}</div>
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
    },
    
    handleTakeAttendance: function() {
        if (!appState.sections || appState.sections.length === 0) {
            this.showToast('No sections available');
            return;
        }
        
        if (appState.sections.length === 1) {
            takeManualAttendance(appState.sections[0].id);
        } else {
            // Show section selection
            let html = `
                <div class="sheet-header">
                    <div class="sheet-title">Select Section</div>
                    <button class="sheet-close" id="sheetClose" aria-label="Close">
                        <span class="material-icons" aria-hidden="true">close</span>
                    </button>
                </div>
                <div class="sheet-content">
                    <div class="list">
            `;
            
            appState.sections.forEach(section => {
                html += `
                    <div class="list-item" onclick="takeManualAttendance('${section.id}'); closeModal()">
                        <div class="list-item-icon">${section.emoji}</div>
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
    },
    
    handleReplyToMessage: function() {
        if (!appState.messages || appState.messages.length === 0) {
            this.showToast('No messages available');
            return;
        }
        
        const latestMessage = appState.messages[0];
        if (latestMessage.sectionId) {
            openSectionDetails(latestMessage.sectionId);
            setTimeout(() => {
                const announcementInput = document.getElementById('announcementInput');
                if (announcementInput) {
                    announcementInput.value = `Re: ${latestMessage.content.substring(0, 50)}...`;
                    announcementInput.focus();
                }
            }, 100);
        } else {
            this.showToast('Cannot reply to this message');
        }
    },
    
    handleMarkAsRead: function() {
        if (!appState.messages || appState.messages.length === 0) {
            this.showToast('No messages available');
            return;
        }
        
        const unreadMessages = appState.messages.filter(msg =>
            !msg.read || (msg.read && !msg.read.includes(appState.currentUser.id))
        );
        
        if (unreadMessages.length === 0) {
            this.showToast('No unread messages');
            return;
        }
        
        if (unreadMessages.length === 1) {
            markAsRead(unreadMessages[0].id);
        } else {
            // Mark all as read
            markAllAsRead();
        }
    },
    
    // Toggle setting
    toggleSetting: function(settingKey) {
        const settingElement = document.getElementById(`${settingKey}Toggle`);
        if (settingElement) {
            settingElement.checked = !settingElement.checked;
            settingElement.dispatchEvent(new Event('change'));
            this.showToast(`${settingKey.replace(/([A-Z])/g, ' $1')} ${settingElement.checked ? 'enabled' : 'disabled'}`);
        } else {
            this.showToast(`Cannot toggle ${settingKey}`);
        }
    },
    
    // Log voice command usage
    logVoiceCommandUsage: function(command, transcript) {
        // In a production environment, you would send this to your analytics service
        console.log(`Voice command logged: ${command} (original: "${transcript}")`);
        
        // Update local analytics
        if (appState.analytics.features.voiceCommands !== undefined) {
            appState.analytics.features.voiceCommands++;
        }
    },
    
    // Show toast notification
    showToast: function(message) {
        // Use the existing toast system from main app
        if (window.showToast) {
            showToast(message);
        } else {
            // Fallback toast
            const toast = document.createElement('div');
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                background-color: #1D1B20;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                max-width: 80%;
                text-align: center;
            `;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.remove();
            }, 3000);
        }
    },
    
    // Destroy NearTalk
    destroy: function() {
        if (!this.isInitialized) return;
        
        this.stop();
        
        // Remove UI elements
        if (this.elements.voiceIndicator) {
            this.elements.voiceIndicator.remove();
        }
        
        if (this.elements.voiceOverlay) {
            this.elements.voiceOverlay.remove();
        }
        
        if (this.elements.helpModal) {
            this.elements.helpModal.remove();
        }
        
        // Clear recognition
        if (this.recognition) {
            this.recognition.onstart = null;
            this.recognition.onresult = null;
            this.recognition.onerror = null;
            this.recognition.onend = null;
            this.recognition = null;
        }
        
        // Reset state
        this.isInitialized = false;
        this.isListening = false;
        this.elements = {
            voiceIndicator: null,
            voiceOverlay: null,
            voiceFeedback: null,
            helpModal: null
        };
        
        console.log('NearTalk destroyed');
    },
    
    // Add custom command
    addCommand: function(category, command, action, description) {
        if (!this.commands[category]) {
            this.commands[category] = [];
        }
        
        this.commands[category].push({
            command: command.toLowerCase(),
            action: action,
            description: description || command
        });
        
        console.log(`Added custom command: ${command}`);
    },
    
    // Remove command
    removeCommand: function(commandText) {
        const normalizedCommand = commandText.toLowerCase();
        
        for (const category in this.commands) {
            const index = this.commands[category].findIndex(cmd => cmd.command === normalizedCommand);
            if (index !== -1) {
                this.commands[category].splice(index, 1);
                console.log(`Removed command: ${commandText}`);
                return true;
            }
        }
        
        return false;
    },
    
    // Get command list for UI
    getCommandList: function() {
        const list = [];
        
        for (const category in this.commands) {
            this.commands[category].forEach(cmd => {
                list.push({
                    category: category,
                    command: cmd.command,
                    description: cmd.description
                });
            });
        }
        
        return list;
    },
    
    // Get command statistics
    getStatistics: function() {
        let totalCommands = 0;
        const categoryCounts = {};
        
        for (const category in this.commands) {
            const count = this.commands[category].length;
            categoryCounts[category] = count;
            totalCommands += count;
        }
        
        return {
            totalCommands: totalCommands,
            categoryCounts: categoryCounts,
            historySize: this.history.length,
            isListening: this.isListening,
            isSupported: this.status.supported,
            permission: this.status.permission
        };
    },
    
    // Export command history
    exportHistory: function() {
        const data = {
            history: this.history,
            exportedAt: new Date().toISOString(),
            statistics: this.getStatistics()
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nearchat-history-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showToast('Voice command history exported');
    }
};

// Export for use in main app
window.voiceCommands = voiceCommands;

// Auto-initialize if setting is enabled
document.addEventListener('DOMContentLoaded', function() {
    // Check if voice commands should be auto-enabled
    setTimeout(() => {
        if (appState && appState.settings && appState.settings.voiceCommands) {
            voiceCommands.init();
        }
    }, 2000);
});

// Global keyboard shortcut for voice commands (Ctrl+Shift+V or Cmd+Shift+V)
document.addEventListener('keydown', function(event) {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'V') {
        event.preventDefault();
        if (voiceCommands.isInitialized) {
            voiceCommands.toggle();
        } else {
            voiceCommands.init();
        }
    }
    
    // Escape key to stop listening
    if (event.key === 'Escape' && voiceCommands.isListening) {
        voiceCommands.stop();
    }
});
