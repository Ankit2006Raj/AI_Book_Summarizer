/**
 * Voice/Audio functionality for AI Book Summarizer
 * Text-to-Speech features for reading summaries aloud
 */

class VoiceReader {
    constructor() {
        this.synth = window.speechSynthesis;
        this.utterance = null;
        this.isReading = false;
        this.isPaused = false;
        this.currentText = '';
        this.voices = [];
        this.selectedVoice = null;
        this.settings = {
            rate: 0.8,
            pitch: 1,
            volume: 0.9
        };
        
        // Load saved settings
        this.loadSavedSettings();
        
        // Initialize voices when available
        this.initializeVoices();
        
        // Handle voice changes (some browsers load voices asynchronously)
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => this.initializeVoices();
        }
        
        // Ensure voices are loaded after a delay
        setTimeout(() => this.initializeVoices(), 1000);
        setTimeout(() => this.initializeVoices(), 3000);
    }
    
    initializeVoices() {
        this.voices = this.synth.getVoices();
        
        if (this.voices.length === 0) {
            console.log('No voices loaded yet, retrying...');
            return;
        }
        
        // Prefer Hindi/English voices in order of preference
        const preferredVoices = [
            // Hindi voices
            'Microsoft Heera - Hindi (India)',
            'Google हिन्दी',
            'Hindi (India)',
            'hi-IN',
            // English voices
            'Microsoft Zira - English (United States)',
            'Google US English',
            'Microsoft David - English (United States)',
            'English (United States)',
            'en-US'
        ];
        
        // Find the best available voice
        if (!this.selectedVoice) {
            for (const preferred of preferredVoices) {
                const voice = this.voices.find(v => 
                    v.name.includes(preferred) || 
                    v.name === preferred ||
                    v.lang.includes(preferred) ||
                    v.lang === preferred
                );
                if (voice) {
                    this.selectedVoice = voice;
                    console.log('Selected preferred voice:', voice.name, voice.lang);
                    break;
                }
            }
        }
        
        // Fallback to first available voice
        if (!this.selectedVoice && this.voices.length > 0) {
            this.selectedVoice = this.voices[0];
            console.log('Selected fallback voice:', this.selectedVoice.name);
        }
        
        console.log('Total voices available:', this.voices.length);
        console.log('Selected voice:', this.selectedVoice?.name || 'None');
        
        // Load previously saved voice preference
        const savedVoiceIndex = localStorage.getItem('selectedVoiceIndex');
        if (savedVoiceIndex && this.voices[savedVoiceIndex]) {
            this.selectedVoice = this.voices[savedVoiceIndex];
            console.log('Loaded saved voice:', this.selectedVoice.name);
        }
    }
    
    speak(text, options = {}) {
        if (!text || text.trim() === '') {
            console.warn('No text to speak');
            showNotification('कोई टेक्स्ट नहीं मिला पढ़ने के लिए।', 'warning');
            return false;
        }
        
        // Check if speech synthesis is supported
        if (!this.synth) {
            console.error('Speech synthesis not supported');
            showNotification('आपका ब्राउज़र वॉइस सपोर्ट नहीं करता।', 'error');
            return false;
        }
        
        // Stop any current speech
        this.stop();
        
        // Clean and prepare text
        const cleanedText = this.cleanText(text);
        this.currentText = cleanedText;
        
        // Create new utterance
        this.utterance = new SpeechSynthesisUtterance(cleanedText);
        
        // Configure utterance with saved settings
        this.utterance.voice = this.selectedVoice;
        this.utterance.rate = options.rate || this.settings.rate;
        this.utterance.pitch = options.pitch || this.settings.pitch;
        this.utterance.volume = options.volume || this.settings.volume;
        
        // Set language based on voice or content
        if (this.selectedVoice) {
            this.utterance.lang = this.selectedVoice.lang;
        } else if (this.isHindiText(cleanedText)) {
            this.utterance.lang = 'hi-IN';
        } else {
            this.utterance.lang = 'en-US';
        }
        
        // Event listeners
        this.utterance.onstart = () => {
            this.isReading = true;
            this.isPaused = false;
            this.updateUI('playing');
            console.log('✓ Started reading:', cleanedText.substring(0, 50) + '...');
            console.log('Voice:', this.selectedVoice?.name || 'Default');
            console.log('Settings:', this.utterance.rate, this.utterance.volume);
        };
        
        this.utterance.onend = () => {
            this.isReading = false;
            this.isPaused = false;
            this.updateUI('stopped');
            console.log('✓ Finished reading');
            showNotification('पढ़ना समाप्त हुआ। ✅', 'success');
        };
        
        this.utterance.onerror = (event) => {
            console.error('❌ Speech error:', event.error, event);
            this.isReading = false;
            this.isPaused = false;
            this.updateUI('stopped');
            
            let errorMsg = 'वॉइस में समस्या हुई।';
            if (event.error === 'network') {
                errorMsg = 'नेटवर्क की समस्या। कनेक्शन चेक करें।';
            } else if (event.error === 'not-allowed') {
                errorMsg = 'ब्राउज़र में वॉइस की अनुमति नहीं है।';
            } else if (event.error === 'language-not-supported') {
                errorMsg = 'यह भाषा सपोर्ट नहीं है।';
            }
            
            showNotification(errorMsg + ' कृपया फिर से कोशिश करें।', 'error');
        };
        
        this.utterance.onpause = () => {
            this.isPaused = true;
            this.updateUI('paused');
            console.log('⏸️ Reading paused');
        };
        
        this.utterance.onresume = () => {
            this.isPaused = false;
            this.updateUI('playing');
            console.log('▶️ Reading resumed');
        };
        
        // Start speaking
        try {
            this.synth.speak(this.utterance);
            return true;
        } catch (error) {
            console.error('Error starting speech:', error);
            showNotification('वॉइस सपोर्ट उपलब्ध नहीं है।', 'error');
            return false;
        }
    }
    
    pause() {
        if (this.synth.speaking && !this.synth.paused) {
            this.synth.pause();
            this.isPaused = true;
            this.updateUI('paused');
            return true;
        }
        return false;
    }
    
    resume() {
        if (this.synth.paused) {
            this.synth.resume();
            this.isPaused = false;
            this.updateUI('playing');
            return true;
        }
        return false;
    }
    
    stop() {
        if (this.synth.speaking || this.synth.paused) {
            this.synth.cancel();
            this.isReading = false;
            this.isPaused = false;
            this.updateUI('stopped');
            return true;
        }
        return false;
    }
    
    updateUI(state) {
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const stopBtn = document.getElementById('stopBtn');
        
        console.log('Updating UI to state:', state);
        
        if (!playBtn) {
            console.warn('Play button not found');
            return;
        }
        
        // Reset all buttons visibility
        if (pauseBtn) pauseBtn.classList.add('hidden');
        if (stopBtn) stopBtn.classList.add('hidden');
        playBtn.classList.remove('hidden');
        
        switch (state) {
            case 'playing':
                if (pauseBtn) pauseBtn.classList.remove('hidden');
                if (stopBtn) stopBtn.classList.remove('hidden');
                playBtn.classList.add('hidden');
                break;
                
            case 'paused':
                playBtn.classList.remove('hidden');
                if (stopBtn) stopBtn.classList.remove('hidden');
                playBtn.innerHTML = '<i class="fas fa-play mr-1"></i> <span class="hidden sm:inline">जारी रखें</span>';
                break;
                
            case 'stopped':
            default:
                playBtn.classList.remove('hidden');
                playBtn.innerHTML = '<i class="fas fa-play mr-1"></i> <span class="hidden sm:inline">सुनें</span>';
                break;
        }
        
        // Update chapter buttons too
        this.updateChapterButtons(state);
    }
    
    updateChapterButtons(state) {
        const chapterButtons = document.querySelectorAll('[onclick^="readChapter"]');
        chapterButtons.forEach(btn => {
            if (state === 'playing') {
                btn.innerHTML = '<i class="fas fa-volume-up mr-1"></i> <span class="hidden sm:inline">सुन रहे हैं...</span>';
                btn.classList.add('opacity-50');
            } else {
                btn.innerHTML = '<i class="fas fa-play mr-1"></i> <span class="hidden sm:inline">सुनें</span>';
                btn.classList.remove('opacity-50');
            }
        });
    }
    
    // Get clean text for speech (remove HTML tags, clean formatting)
    getCleanText(element) {
        if (typeof element === 'string') {
            return this.cleanText(element);
        }
        
        if (element && element.textContent) {
            return this.cleanText(element.textContent);
        }
        
        return '';
    }
    
    cleanText(text) {
        return text
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ') // Replace HTML entities
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/[^\w\s\u0900-\u097F.,!?;:()\-""'']/g, '') // Keep letters, Hindi chars, and punctuation
            .trim();
    }
    
    isHindiText(text) {
        // Check if text contains Devanagari script
        const hindiPattern = /[\u0900-\u097F]/;
        return hindiPattern.test(text);
    }
    
    loadSavedSettings() {
        // Load saved voice settings
        const savedRate = localStorage.getItem('voiceRate');
        const savedPitch = localStorage.getItem('voicePitch');
        const savedVolume = localStorage.getItem('voiceVolume');
        
        if (savedRate) this.settings.rate = parseFloat(savedRate);
        if (savedPitch) this.settings.pitch = parseFloat(savedPitch);
        if (savedVolume) this.settings.volume = parseFloat(savedVolume);
    }
    
    saveSettings() {
        localStorage.setItem('voiceRate', this.settings.rate.toString());
        localStorage.setItem('voicePitch', this.settings.pitch.toString());
        localStorage.setItem('voiceVolume', this.settings.volume.toString());
    }
}

// Global voice reader instance
let voiceReader = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing voice features');
    voiceReader = new VoiceReader();
    
    // Load auto-read setting after a short delay
    setTimeout(() => {
        loadAutoReadSetting();
    }, 1000);
});

// Voice control functions (called from HTML)
function readSummary() {
    console.log('readSummary called');
    
    if (!voiceReader) {
        console.log('Creating new VoiceReader');
        voiceReader = new VoiceReader();
        // Wait a moment for initialization
        setTimeout(() => readSummary(), 500);
        return;
    }
    
    const summaryElement = document.getElementById('overallSummary');
    if (!summaryElement) {
        showNotification('पहले समरी जनरेट करें।', 'warning');
        return;
    }
    
    const text = voiceReader.getCleanText(summaryElement);
    console.log('Text to read:', text.substring(0, 100) + '...');
    
    if (!text) {
        showNotification('समरी में कोई टेक्स्ट नहीं मिला।', 'warning');
        return;
    }
    
    // Check if already reading, then resume
    if (voiceReader.isPaused && voiceReader.synth.paused) {
        const resumed = voiceReader.resume();
        if (resumed) {
            showNotification('वॉइस जारी की गई। 🔊', 'success');
        }
    } else {
        // Start new reading
        console.log('Starting to speak...');
        const success = voiceReader.speak(text);
        if (success) {
            showNotification('समरी पढ़ी जा रही है... 🔊', 'success');
        } else {
            showNotification('वॉइस शुरू करने में समस्या हुई।', 'error');
        }
    }
}

function pauseReading() {
    console.log('pauseReading called');
    if (voiceReader && voiceReader.isReading && !voiceReader.isPaused) {
        const paused = voiceReader.pause();
        if (paused) {
            showNotification('वॉइस रोकी गई। ⏸️', 'info');
        }
    } else {
        console.log('Cannot pause - not reading or already paused');
    }
}

function stopReading() {
    console.log('stopReading called');
    if (voiceReader) {
        const stopped = voiceReader.stop();
        if (stopped) {
            showNotification('वॉइस बंद की गई। ⏹️', 'info');
        }
    }
}

// Auto-start reading when summary is generated (optional)
function autoStartReading() {
    console.log('autoStartReading called');
    // Wait a moment for the summary to be displayed
    setTimeout(() => {
        const autoRead = localStorage.getItem('autoReadSummary');
        console.log('Auto-read setting:', autoRead);
        if (autoRead === 'true') {
            console.log('Auto-reading enabled, starting...');
            readSummary();
        }
    }, 2000); // Increased delay to ensure summary is fully loaded
}

// Settings for auto-read
function toggleAutoRead() {
    const checkbox = document.getElementById('autoReadToggle');
    const isChecked = checkbox ? checkbox.checked : false;
    
    localStorage.setItem('autoReadSummary', isChecked.toString());
    showNotification(
        isChecked ? 'ऑटो-रीडिंग चालू की गई। ✅' : 'ऑटो-रीडिंग बंद की गई। ❌',
        'info'
    );
    console.log('Auto-read toggled to:', isChecked);
}

// Load auto-read setting on page load
function loadAutoReadSetting() {
    const autoRead = localStorage.getItem('autoReadSummary') === 'true';
    const checkbox = document.getElementById('autoReadToggle');
    if (checkbox) {
        checkbox.checked = autoRead;
    }
    console.log('Auto-read setting loaded:', autoRead);
}

// Voice settings modal (advanced feature)
function showVoiceSettings() {
    if (!voiceReader) {
        voiceReader = new VoiceReader();
        setTimeout(() => showVoiceSettings(), 1000);
        return;
    }
    
    if (!voiceReader.voices.length) {
        showNotification('वॉइस लोड हो रही है, कृपया प्रतीक्षा करें।', 'info');
        // Try to reload voices
        voiceReader.initializeVoices();
        setTimeout(() => showVoiceSettings(), 2000);
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold flex items-center">
                    <i class="fas fa-cog mr-2 text-blue-500"></i>
                    वॉइस सेटिंग्स
                </h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700 text-xl">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="mb-4">
                <label class="block mb-2 font-semibold">वॉइस चुनें:</label>
                <select id="voiceSelect" class="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                    ${voiceReader.voices.map((voice, index) => 
                        `<option value="${index}" ${voice === voiceReader.selectedVoice ? 'selected' : ''}>
                            ${voice.name} (${voice.lang})
                        </option>`
                    ).join('')}
                </select>
            </div>
            
            <div class="mb-4">
                <label class="block mb-2 font-semibold">स्पीड: <span id="rateValue" class="text-blue-600">${voiceReader.settings.rate}</span></label>
                <input type="range" id="rateSlider" min="0.3" max="2" step="0.1" value="${voiceReader.settings.rate}" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer">
                <div class="flex justify-between text-xs text-gray-500 mt-1">
                    <span>धीमा</span>
                    <span>तेज़</span>
                </div>
            </div>
            
            <div class="mb-4">
                <label class="block mb-2 font-semibold">वॉल्यूम: <span id="volumeValue" class="text-green-600">${voiceReader.settings.volume}</span></label>
                <input type="range" id="volumeSlider" min="0" max="1" step="0.1" value="${voiceReader.settings.volume}" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer">
                <div class="flex justify-between text-xs text-gray-500 mt-1">
                    <span>कम</span>
                    <span>ज्यादा</span>
                </div>
            </div>
            
            <div class="mb-6">
                <button id="testVoiceBtn" onclick="testVoice()" class="w-full p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300">
                    <i class="fas fa-play mr-2"></i>टेस्ट करें
                </button>
            </div>
            
            <div class="flex justify-end space-x-2">
                <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors">बंद करें</button>
                <button onclick="applyVoiceSettings()" class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">सेव करें</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Update rate display and real-time preview
    const rateSlider = modal.querySelector('#rateSlider');
    const rateValue = modal.querySelector('#rateValue');
    if (rateSlider && rateValue) {
        rateSlider.addEventListener('input', () => {
            rateValue.textContent = rateSlider.value;
        });
    }
    
    // Update volume display and real-time preview
    const volumeSlider = modal.querySelector('#volumeSlider');
    const volumeValue = modal.querySelector('#volumeValue');
    if (volumeSlider && volumeValue) {
        volumeSlider.addEventListener('input', () => {
            volumeValue.textContent = volumeSlider.value;
        });
    }
}

function applyVoiceSettings() {
    const voiceSelect = document.getElementById('voiceSelect');
    const rateSlider = document.getElementById('rateSlider');
    const volumeSlider = document.getElementById('volumeSlider');
    
    if (voiceSelect && voiceReader) {
        voiceReader.selectedVoice = voiceReader.voices[voiceSelect.value];
        localStorage.setItem('selectedVoiceIndex', voiceSelect.value);
    }
    
    if (rateSlider && voiceReader) {
        voiceReader.settings.rate = parseFloat(rateSlider.value);
        localStorage.setItem('voiceRate', rateSlider.value);
    }
    
    if (volumeSlider && voiceReader) {
        voiceReader.settings.volume = parseFloat(volumeSlider.value);
        localStorage.setItem('voiceVolume', volumeSlider.value);
    }
    
    voiceReader.saveSettings();
    showNotification('वॉइस सेटिंग्स सेव हो गईं। ✅', 'success');
    document.querySelector('.fixed.inset-0').remove();
}

function testVoice() {
    if (!voiceReader) return;
    
    // Apply current settings temporarily
    const voiceSelect = document.getElementById('voiceSelect');
    const rateSlider = document.getElementById('rateSlider');
    const volumeSlider = document.getElementById('volumeSlider');
    
    const testText = voiceReader.isHindiText('नमस्ते') ? 
        'नमस्ते! यह एक टेस्ट है। आपकी आवाज़ कैसी लग रही है?' : 
        'Hello! This is a voice test. How does it sound?';
    
    const testOptions = {
        rate: rateSlider ? parseFloat(rateSlider.value) : voiceReader.settings.rate,
        volume: volumeSlider ? parseFloat(volumeSlider.value) : voiceReader.settings.volume,
        pitch: voiceReader.settings.pitch
    };
    
    // Temporarily set voice
    if (voiceSelect && voiceReader.voices[voiceSelect.value]) {
        const originalVoice = voiceReader.selectedVoice;
        voiceReader.selectedVoice = voiceReader.voices[voiceSelect.value];
        
        voiceReader.speak(testText, testOptions);
        
        // Restore original voice after test
        setTimeout(() => {
            voiceReader.selectedVoice = originalVoice;
        }, 5000);
    } else {
        voiceReader.speak(testText, testOptions);
    }
}

// Load saved settings
function loadVoiceSettings() {
    const savedVoiceIndex = localStorage.getItem('selectedVoiceIndex');
    const savedRate = localStorage.getItem('voiceRate');
    const savedVolume = localStorage.getItem('voiceVolume');
    
    if (savedVoiceIndex && voiceReader && voiceReader.voices[savedVoiceIndex]) {
        voiceReader.selectedVoice = voiceReader.voices[savedVoiceIndex];
    }
}

// Load settings when voices are ready
setTimeout(loadVoiceSettings, 1000);

// Keyboard shortcuts for voice controls
document.addEventListener('keydown', function(event) {
    // Only work when not typing in input fields
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') {
        return;
    }
    
    // Ctrl + Shift + R = Read Summary
    if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        readSummary();
    }
    
    // Ctrl + Shift + P = Pause/Resume
    if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        if (voiceReader && voiceReader.synth.paused) {
            voiceReader.resume();
        } else {
            pauseReading();
        }
    }
    
    // Ctrl + Shift + S = Stop
    if (event.ctrlKey && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        stopReading();
    }
    
    // Space bar = Play/Pause (when summary is visible)
    if (event.key === ' ' && document.getElementById('summarySection') && !document.getElementById('summarySection').classList.contains('hidden')) {
        event.preventDefault();
        if (voiceReader && voiceReader.isReading) {
            if (voiceReader.synth.paused) {
                voiceReader.resume();
            } else {
                pauseReading();
            }
        } else {
            readSummary();
        }
    }
});

// Show voice help/shortcuts modal
function showVoiceHelp() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-96 overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-2xl font-bold flex items-center">
                    <i class="fas fa-volume-up mr-2 text-green-500"></i>
                    वॉइस कंट्रोल्स 🎤
                </h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700 text-2xl">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="space-y-4">
                <div class="bg-gradient-to-r from-green-100 to-blue-100 dark:from-green-900 dark:to-blue-900 p-4 rounded-lg">
                    <h4 class="font-bold mb-2">🎯 मुख्य कंट्रोल्स:</h4>
                    <ul class="space-y-2 text-sm">
                        <li><span class="font-semibold">▶️ सुनें:</span> समरी को सुनना शुरू करें</li>
                        <li><span class="font-semibold">⏸️ रोकें:</span> सुनना रोकें (पॉज़ करें)</li>
                        <li><span class="font-semibold">⏹️ बंद:</span> सुनना पूरी तरह बंद करें</li>
                        <li><span class="font-semibold">📖 चैप्टर सुनें:</span> किसी विशेष चैप्टर को सुनें</li>
                        <li><span class="font-semibold">📚 सभी सुनें:</span> सभी चैप्टर्स एक के बाद एक सुनें</li>
                    </ul>
                </div>
                
                <div class="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 p-4 rounded-lg">
                    <h4 class="font-bold mb-2">⌨️ कीबोर्ड शॉर्टकट्स:</h4>
                    <ul class="space-y-2 text-sm">
                        <li><kbd class="px-2 py-1 bg-gray-200 rounded">Ctrl + Shift + R</kbd> = समरी पढ़ना शुरू करें</li>
                        <li><kbd class="px-2 py-1 bg-gray-200 rounded">Ctrl + Shift + P</kbd> = पॉज़/रिज्यूम करें</li>
                        <li><kbd class="px-2 py-1 bg-gray-200 rounded">Ctrl + Shift + S</kbd> = बंद करें</li>
                        <li><kbd class="px-2 py-1 bg-gray-200 rounded">Space</kbd> = प्ले/पॉज़ (जब समरी खुली हो)</li>
                    </ul>
                </div>
                
                <div class="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900 p-4 rounded-lg">
                    <h4 class="font-bold mb-2">⚙️ सेटिंग्स:</h4>
                    <ul class="space-y-2 text-sm">
                        <li>• <strong>वॉइस चुनें:</strong> हिंदी/अंग्रेजी आवाज़ें उपलब्ध</li>
                        <li>• <strong>स्पीड:</strong> पढ़ने की गति बदलें</li>
                        <li>• <strong>वॉल्यूम:</strong> आवाज़ का वॉल्यूम कंट्रोल करें</li>
                        <li>• <strong>ऑटो-रीड:</strong> समरी बनने पर अपने आप सुनाना</li>
                    </ul>
                </div>
                
                <div class="bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 p-4 rounded-lg">
                    <h4 class="font-bold mb-2">💡 टिप्स:</h4>
                    <ul class="space-y-1 text-sm">
                        <li>• समरी जनरेट होने के बाद वॉइस बटन दिखेंगे</li>
                        <li>• हेडफोन्स का उपयोग बेहतर अनुभव के लिए करें</li>
                        <li>• ब्राउज़र में वॉल्यूम चेक करें अगर आवाज़ नहीं आ रही</li>
                        <li>• वॉइस सेटिंग्स अपनी पसंद के अनुसार बदलें</li>
                    </ul>
                </div>
            </div>
            
            <div class="flex justify-center mt-6">
                <button onclick="this.closest('.fixed').remove()" class="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-full font-semibold hover:from-green-600 hover:to-blue-600 transition-all duration-300">
                    <i class="fas fa-check mr-2"></i>समझ गया!
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Read specific chapter
function readChapter(chapterIndex) {
    if (!voiceReader) {
        voiceReader = new VoiceReader();
    }
    
    const chapterElement = document.getElementById(`chapter-content-${chapterIndex}`);
    if (!chapterElement) {
        showNotification('चैप्टर नहीं मिला।', 'warning');
        return;
    }
    
    const text = voiceReader.getCleanText(chapterElement);
    if (!text) {
        showNotification('चैप्टर में कोई टेक्स्ट नहीं मिला।', 'warning');
        return;
    }
    
    // Stop any current reading
    voiceReader.stop();
    
    // Start reading the chapter
    const success = voiceReader.speak(text);
    if (success) {
        showNotification(`चैप्टर ${chapterIndex + 1} पढ़ा जा रहा है... 🔊`, 'success');
    }
}

// Read all chapters one by one
function readAllChapters() {
    if (!voiceReader) {
        voiceReader = new VoiceReader();
    }
    
    const chapterElements = document.querySelectorAll('[id^="chapter-content-"]');
    if (chapterElements.length === 0) {
        showNotification('कोई चैप्टर नहीं मिला।', 'warning');
        return;
    }
    
    let allText = '';
    chapterElements.forEach((element, index) => {
        const text = voiceReader.getCleanText(element);
        if (text) {
            allText += `चैप्टर ${index + 1}। ${text}। अगला चैप्टर। `;
        }
    });
    
    if (!allText) {
        showNotification('चैप्टर्स में कोई टेक्स्ट नहीं मिला।', 'warning');
        return;
    }
    
    const success = voiceReader.speak(allText);
    if (success) {
        showNotification('सभी चैप्टर्स पढ़े जा रहे हैं... 📚🔊', 'success');
    }
}