// Chat functionality

function toggleChat() {
    const chatWindow = document.getElementById('chatWindow');
    chatWindow.classList.toggle('active');
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('floatingChat').addEventListener('click', toggleChat);
});

async function startChatSession() {
    if (!currentFileId) return;
    
    try {
        const response = await fetch('/api/chat/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_id: currentFileId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            chatSessionId = data.session_id;
            
            // Add welcome message
            addChatMessage('assistant', 'Hello! I\'ve read your book. Feel free to ask me any questions about it!');
        }
    } catch (error) {
        console.error('Error starting chat:', error);
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    if (!chatSessionId) {
        showNotification('Please generate a summary first to enable chat', 'error');
        return;
    }
    
    // Clear input
    input.value = '';
    
    // Add user message to chat
    addChatMessage('user', message);
    
    // Show typing indicator
    const typingId = addChatMessage('assistant', '<i class="fas fa-spinner fa-spin"></i> Thinking...', true);
    
    try {
        const response = await fetch('/api/chat/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: chatSessionId,
                message: message
            })
        });
        
        const data = await response.json();
        
        // Remove typing indicator
        const typingElement = document.getElementById(typingId);
        if (typingElement) {
            typingElement.remove();
        }
        
        if (data.success) {
            addChatMessage('assistant', data.response);
        } else {
            addChatMessage('assistant', 'Sorry, I encountered an error. Please try again.');
        }
    } catch (error) {
        console.error('Chat error:', error);
        
        // Remove typing indicator
        const typingElement = document.getElementById(typingId);
        if (typingElement) {
            typingElement.remove();
        }
        
        addChatMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    }
}

function addChatMessage(role, message, isTemporary = false) {
    const chatMessages = document.getElementById('chatMessages');
    const messageId = 'msg-' + Date.now();
    
    const messageDiv = document.createElement('div');
    messageDiv.id = messageId;
    messageDiv.className = `mb-4 ${role === 'user' ? 'text-right' : 'text-left'}`;
    
    const bubbleClass = role === 'user' 
        ? 'bg-blue-500 text-white' 
        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white';
    
    messageDiv.innerHTML = `
        <div class="inline-block max-w-[80%] p-3 rounded-lg ${bubbleClass}">
            ${message.replace(/\n/g, '<br>')}
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return isTemporary ? messageId : null;
}

// Voice input (optional - requires Speech Recognition API)
function startVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showNotification('Voice input not supported in this browser', 'error');
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    recognition.onresult = function(event) {
        const speechResult = event.results[0][0].transcript;
        document.getElementById('chatInput').value = speechResult;
    };
    
    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        showNotification('Voice input error: ' + event.error, 'error');
    };
    
    recognition.start();
    showNotification('Listening...', 'info');
}

// Text-to-speech (optional)
function speakMessage(text) {
    if (!('speechSynthesis' in window)) {
        showNotification('Text-to-speech not supported in this browser', 'error');
        return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    speechSynthesis.speak(utterance);
}
