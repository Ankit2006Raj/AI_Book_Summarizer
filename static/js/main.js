// Global state
let currentFileId = null;
let currentSummary = null;
let currentMetadata = null;
let chatSessionId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadRecentFiles();
});

function initializeApp() {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'light-mode';
    document.body.className = savedTheme;
    updateThemeIcon();
    
    themeToggle.addEventListener('click', toggleTheme);
    
    // Help button
    document.getElementById('helpBtn').addEventListener('click', showHelp);
    
    // Summarize button
    document.getElementById('summarizeBtn').addEventListener('click', startSummarization);
}

function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('dark-mode');
    
    body.className = isDark ? 'light-mode' : 'dark-mode';
    localStorage.setItem('theme', body.className);
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = document.querySelector('#themeToggle i');
    const isDark = document.body.classList.contains('dark-mode');
    icon.className = isDark ? 'fas fa-sun text-xl' : 'fas fa-moon text-xl';
}

function showHelp() {
    alert(`📚 AI Book Summarizer - Quick Guide

1. Upload: Drag & drop or select a book file (PDF, ePub, DOCX, TXT)
2. Configure: Choose summary style and language
3. Summarize: Click "Generate AI Summary"
4. Explore: View summaries, themes, and keywords
5. Interact: Chat with the book, generate quizzes, extract quotes
6. Export: Download summaries in PDF, DOCX, or TXT format

Features:
- Chapter-wise summaries
- Interactive Q&A chat
- AI quiz generator
- Quote extractor
- Keyword cloud visualization
- Multi-language support
- Multiple export formats`);
}

function showProgress(percent, status = 'Processing...') {
    const progressBar = document.getElementById('topProgress');
    const progressFill = progressBar.querySelector('.progress-fill');
    
    progressBar.classList.remove('hidden');
    progressFill.style.width = percent + '%';
    
    if (percent >= 100) {
        setTimeout(() => {
            progressBar.classList.add('hidden');
            progressFill.style.width = '0%';
        }, 1000);
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-4 p-4 rounded-lg shadow-lg z-50 fade-in ${
        type === 'error' ? 'bg-red-500' : 
        type === 'success' ? 'bg-green-500' : 
        'bg-blue-500'
    } text-white`;
    notification.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function updateChapterList(chapters) {
    const chapterList = document.getElementById('chapterList');
    chapterList.innerHTML = '';
    
    chapters.forEach((chapter, index) => {
        const chapterItem = document.createElement('div');
        chapterItem.className = 'p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition';
        chapterItem.innerHTML = `
            <div class="text-sm font-semibold truncate">${chapter.title}</div>
            <div class="text-xs opacity-60">${formatNumber(chapter.word_count)} words</div>
        `;
        chapterItem.onclick = () => scrollToChapter(index);
        chapterList.appendChild(chapterItem);
    });
}

function scrollToChapter(index) {
    const chapterElement = document.getElementById(`chapter-${index}`);
    if (chapterElement) {
        chapterElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

async function loadRecentFiles() {
    try {
        const response = await fetch('/api/files/recent');
        const data = await response.json();
        
        if (data.success && data.files.length > 0) {
            const recentFiles = document.getElementById('recentFiles');
            recentFiles.innerHTML = '';
            
            data.files.forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.className = 'p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition';
                fileItem.innerHTML = `
                    <div class="text-sm font-semibold truncate">${file.title || file.filename}</div>
                    <div class="text-xs opacity-60">${file.author || 'Unknown Author'}</div>
                `;
                recentFiles.appendChild(fileItem);
            });
        }
    } catch (error) {
        console.error('Error loading recent files:', error);
    }
}

async function startSummarization() {
    if (!currentFileId) {
        showNotification('Please upload a file first', 'error');
        return;
    }
    
    const style = document.getElementById('summaryStyle').value;
    const language = document.getElementById('outputLanguage').value;
    const btn = document.getElementById('summarizeBtn');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generating Summary...';
    showProgress(10, 'Starting AI processing...');
    
    try {
        const response = await fetch('/api/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_id: currentFileId,
                style: style,
                language: language
            })
        });
        
        showProgress(50, 'AI analyzing content...');
        
        const data = await response.json();
        
        if (data.success) {
            currentSummary = data.summary;
            displaySummary(data.summary);
            showProgress(100, 'Complete!');
            showNotification('Summary generated successfully!', 'success');
            
            // Enable chat
            document.getElementById('floatingChat').classList.remove('hidden');
            await startChatSession();
        } else {
            throw new Error(data.error || 'Failed to generate summary');
        }
    } catch (error) {
        console.error('Summarization error:', error);
        showNotification('Error: ' + error.message, 'error');
        showProgress(0);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-magic mr-2"></i> Generate AI Summary';
    }
}

function displaySummary(summary) {
    // Show summary section
    document.getElementById('summarySection').classList.remove('hidden');
    
    // Display overall summary
    const overallSummary = document.getElementById('overallSummary');
    overallSummary.innerHTML = `<p class="text-lg leading-relaxed">${summary.overall_summary.replace(/\n/g, '<br><br>')}</p>`;
    
    // Display themes
    displayThemes(summary.overall_themes);
    
    // Display keyword cloud
    displayWordCloud(summary.all_keywords);
    
    // Display chapter summaries
    displayChapterSummaries(summary.chapters);
    
    // Update chapter list in sidebar
    updateChapterList(summary.chapters);
    
    // Populate quiz chapter selector
    populateQuizChapters(summary.chapters);
    
    // Scroll to summary section
    document.getElementById('summarySection').scrollIntoView({ behavior: 'smooth' });
    
    // Auto-start voice reading if enabled (after a short delay)
    setTimeout(() => {
        if (typeof autoStartReading === 'function') {
            autoStartReading();
        }
    }, 1500);
}

function displayThemes(themes) {
    const themesContent = document.getElementById('themesContent');
    themesContent.innerHTML = '';
    
    const themeItems = [
        { label: 'Genre', value: themes.genre, icon: 'fa-theater-masks' },
        { label: 'Tone', value: themes.tone, icon: 'fa-music' },
        { label: 'Mood', value: themes.mood, icon: 'fa-heart' },
    ];
    
    themeItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div class="flex items-center space-x-3">
                <i class="fas ${item.icon} text-2xl opacity-50"></i>
                <div>
                    <p class="text-sm opacity-60">${item.label}</p>
                    <p class="font-semibold">${item.value}</p>
                </div>
            </div>
        `;
        themesContent.appendChild(div);
    });
    
    if (themes.themes && themes.themes.length > 0) {
        const themesList = document.createElement('div');
        themesList.className = 'card col-span-2';
        themesList.innerHTML = `
            <p class="text-sm opacity-60 mb-2">Main Themes</p>
            <div class="flex flex-wrap gap-2">
                ${themes.themes.map(theme => `
                    <span class="px-3 py-1 bg-blue-500 text-white rounded-full text-sm">${theme}</span>
                `).join('')}
            </div>
        `;
        themesContent.appendChild(themesList);
    }
    
    if (themes.emotional_journey) {
        const journey = document.createElement('div');
        journey.className = 'card col-span-2';
        journey.innerHTML = `
            <p class="text-sm opacity-60 mb-2">Emotional Journey</p>
            <p class="text-sm">${themes.emotional_journey}</p>
        `;
        themesContent.appendChild(journey);
    }
}

function displayWordCloud(keywords) {
    const canvas = document.getElementById('wordcloudCanvas');
    
    // Prepare data for word cloud
    let wordList = [];
    
    if (Array.isArray(keywords)) {
        if (keywords.length > 0 && typeof keywords[0] === 'string') {
            // Simple array of strings
            const wordCounts = {};
            keywords.forEach(word => {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            });
            
            wordList = Object.entries(wordCounts).map(([text, count]) => [text, count * 10]);
        } else if (keywords.length > 0 && typeof keywords[0] === 'object') {
            // Array of objects with text and value
            wordList = keywords.map(item => [item.text, item.value]);
        }
    }
    
    if (wordList.length === 0) {
        canvas.parentElement.style.display = 'none';
        return;
    }
    
    // Draw word cloud
    try {
        WordCloud(canvas, {
            list: wordList.slice(0, 50),
            gridSize: 8,
            weightFactor: 3,
            fontFamily: 'Arial, sans-serif',
            color: function() {
                const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
                return colors[Math.floor(Math.random() * colors.length)];
            },
            rotateRatio: 0.3,
            backgroundColor: 'transparent'
        });
    } catch (error) {
        console.error('WordCloud error:', error);
    }
}

function displayChapterSummaries(chapters) {
    const container = document.getElementById('chapterSummaries');
    container.innerHTML = '';
    
    chapters.forEach((chapter, index) => {
        const chapterDiv = document.createElement('div');
        chapterDiv.id = `chapter-${index}`;
        chapterDiv.className = 'card';
        chapterDiv.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <h3 class="text-xl font-bold flex items-center">
                    <span class="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">
                        ${chapter.chapter_number}
                    </span>
                    ${chapter.chapter_title}
                </h3>
                <button onclick="readChapter(${index})" class="btn-secondary text-sm px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center" title="इस चैप्टर को सुनें">
                    <i class="fas fa-play mr-1"></i> <span class="hidden sm:inline">सुनें</span>
                </button>
            </div>
            <div class="text-sm opacity-60 mb-3">${formatNumber(chapter.word_count)} words</div>
            <div id="chapter-content-${index}" class="mb-4 leading-relaxed">${chapter.summary.replace(/\n/g, '<br><br>')}</div>
            
            ${chapter.key_concepts && chapter.key_concepts.length > 0 ? `
                <div class="mt-4">
                    <p class="font-semibold mb-2 flex items-center">
                        <i class="fas fa-lightbulb mr-2"></i>
                        Key Points
                    </p>
                    <ul class="list-disc list-inside space-y-1 opacity-80">
                        ${chapter.key_concepts.slice(0, 5).map(concept => `<li>${concept}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${chapter.keywords && chapter.keywords.length > 0 ? `
                <div class="mt-4">
                    <p class="font-semibold mb-2 flex items-center">
                        <i class="fas fa-tags mr-2"></i>
                        Keywords
                    </p>
                    <div class="flex flex-wrap gap-2">
                        ${chapter.keywords.slice(0, 8).map(keyword => `
                            <span class="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm">${keyword}</span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
        container.appendChild(chapterDiv);
    });
}

function populateQuizChapters(chapters) {
    const select = document.getElementById('quizChapter');
    select.innerHTML = '<option value="">Entire Book</option>';
    
    chapters.forEach((chapter, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `Chapter ${chapter.chapter_number}: ${chapter.chapter_title}`;
        select.appendChild(option);
    });
}
