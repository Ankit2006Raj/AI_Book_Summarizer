// Quiz generation and management

let currentQuiz = null;

async function generateQuiz() {
    if (!currentFileId) {
        showNotification('Please upload and summarize a book first', 'error');
        return;
    }
    
    const chapterIndex = document.getElementById('quizChapter').value;
    const difficulty = document.getElementById('quizDifficulty').value;
    
    showProgress(20, 'Generating quiz questions...');
    
    try {
        const response = await fetch('/api/quiz/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_id: currentFileId,
                chapter_index: chapterIndex === '' ? null : parseInt(chapterIndex),
                difficulty: difficulty,
                num_questions: 10,
                question_types: ['multiple_choice', 'true_false', 'short_answer']
            })
        });
        
        showProgress(70, 'Processing questions...');
        
        const data = await response.json();
        
        if (data.success && data.quiz.length > 0) {
            currentQuiz = data.quiz;
            displayQuiz(data.quiz);
            showProgress(100, 'Quiz ready!');
            showNotification('Quiz generated successfully!', 'success');
        } else {
            throw new Error('Failed to generate quiz questions');
        }
    } catch (error) {
        console.error('Quiz generation error:', error);
        showNotification('Error generating quiz: ' + error.message, 'error');
        showProgress(0);
    }
}

function displayQuiz(quiz) {
    const modal = document.getElementById('quizModal');
    const content = document.getElementById('quizContent');
    
    content.innerHTML = '';
    
    quiz.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg';
        
        let optionsHtml = '';
        
        if (question.type === 'multiple_choice') {
            optionsHtml = `
                <div class="space-y-2 mt-3">
                    ${question.options.map((option, i) => `
                        <div class="flex items-start space-x-2">
                            <input type="radio" name="q${index}" id="q${index}_${i}" value="${option}" class="mt-1">
                            <label for="q${index}_${i}" class="flex-1 cursor-pointer">${option}</label>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (question.type === 'true_false') {
            optionsHtml = `
                <div class="space-y-2 mt-3">
                    <div class="flex items-center space-x-2">
                        <input type="radio" name="q${index}" id="q${index}_true" value="True">
                        <label for="q${index}_true" class="cursor-pointer">True</label>
                    </div>
                    <div class="flex items-center space-x-2">
                        <input type="radio" name="q${index}" id="q${index}_false" value="False">
                        <label for="q${index}_false" class="cursor-pointer">False</label>
                    </div>
                </div>
            `;
        } else if (question.type === 'short_answer') {
            optionsHtml = `
                <textarea id="q${index}_answer" class="w-full mt-3 p-2 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600" rows="3" placeholder="Your answer..."></textarea>
            `;
        }
        
        questionDiv.innerHTML = `
            <div class="flex items-start space-x-3">
                <span class="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    ${index + 1}
                </span>
                <div class="flex-1">
                    <p class="font-semibold mb-2">${question.question}</p>
                    ${optionsHtml}
                    <div id="answer${index}" class="hidden mt-3 p-3 bg-green-100 dark:bg-green-900 rounded">
                        <p class="font-semibold text-green-800 dark:text-green-200">Correct Answer:</p>
                        <p class="text-green-700 dark:text-green-300">${question.correct_answer}</p>
                        ${question.explanation ? `
                            <p class="mt-2 text-sm text-green-700 dark:text-green-300">
                                <strong>Explanation:</strong> ${question.explanation}
                            </p>
                        ` : ''}
                    </div>
                    <button onclick="showAnswer(${index})" class="mt-2 text-sm text-blue-500 hover:text-blue-700">
                        <i class="fas fa-eye mr-1"></i> Show Answer
                    </button>
                </div>
            </div>
        `;
        
        content.appendChild(questionDiv);
    });
    
    // Add submit button
    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn-primary w-full mt-4';
    submitBtn.innerHTML = '<i class="fas fa-check mr-2"></i> Check Answers';
    submitBtn.onclick = checkQuizAnswers;
    content.appendChild(submitBtn);
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function showAnswer(index) {
    const answerDiv = document.getElementById(`answer${index}`);
    answerDiv.classList.toggle('hidden');
}

function checkQuizAnswers() {
    if (!currentQuiz) return;
    
    let correct = 0;
    let total = currentQuiz.length;
    
    currentQuiz.forEach((question, index) => {
        if (question.type === 'multiple_choice' || question.type === 'true_false') {
            const selected = document.querySelector(`input[name="q${index}"]:checked`);
            if (selected && selected.value === question.correct_answer) {
                correct++;
            }
        }
    });
    
    const percentage = Math.round((correct / total) * 100);
    
    let grade = 'F';
    if (percentage >= 90) grade = 'A';
    else if (percentage >= 80) grade = 'B';
    else if (percentage >= 70) grade = 'C';
    else if (percentage >= 60) grade = 'D';
    
    showNotification(`Quiz Score: ${correct}/${total} (${percentage}%) - Grade: ${grade}`, 'success');
}

function closeQuizModal() {
    const modal = document.getElementById('quizModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function exportQuiz() {
    if (!currentQuiz) {
        showNotification('No quiz to export', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/export/quiz', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quiz_data: currentQuiz,
                format: 'csv'
            })
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `quiz_${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            
            showNotification('Quiz exported successfully!', 'success');
        } else {
            throw new Error('Export failed');
        }
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Error exporting quiz', 'error');
    }
}

// Quote extraction
async function extractQuotes() {
    if (!currentFileId) {
        showNotification('Please upload a book first', 'error');
        return;
    }
    
    const numQuotes = parseInt(document.getElementById('numQuotes').value);
    
    showProgress(30, 'Extracting memorable quotes...');
    
    try {
        const response = await fetch('/api/quotes/extract', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_id: currentFileId,
                num_quotes: numQuotes
            })
        });
        
        showProgress(70, 'Processing quotes...');
        
        const data = await response.json();
        
        if (data.success && data.quotes.length > 0) {
            displayQuotes(data.quotes);
            showProgress(100, 'Quotes ready!');
            showNotification('Quotes extracted successfully!', 'success');
        } else {
            throw new Error('Failed to extract quotes');
        }
    } catch (error) {
        console.error('Quote extraction error:', error);
        showNotification('Error extracting quotes: ' + error.message, 'error');
        showProgress(0);
    }
}

function displayQuotes(quotes) {
    const modal = document.getElementById('quotesModal');
    const content = document.getElementById('quotesContent');
    
    content.innerHTML = '';
    
    quotes.forEach((quote, index) => {
        const quoteDiv = document.createElement('div');
        quoteDiv.className = 'mb-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-lg shadow';
        quoteDiv.innerHTML = `
            <div class="flex items-start space-x-4">
                <i class="fas fa-quote-left text-4xl text-blue-500 opacity-30"></i>
                <div class="flex-1">
                    <p class="text-lg italic mb-3">"${quote.quote}"</p>
                    ${quote.speaker ? `
                        <p class="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                            — ${quote.speaker}
                        </p>
                    ` : ''}
                    ${quote.context ? `
                        <p class="text-sm opacity-70">
                            <strong>Context:</strong> ${quote.context}
                        </p>
                    ` : ''}
                    <button onclick="copyQuote('${quote.quote.replace(/'/g, "\\'")}', '${quote.speaker || ''}')" class="mt-3 text-sm text-blue-500 hover:text-blue-700">
                        <i class="fas fa-copy mr-1"></i> Copy Quote
                    </button>
                </div>
            </div>
        `;
        content.appendChild(quoteDiv);
    });
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeQuotesModal() {
    const modal = document.getElementById('quotesModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function copyQuote(quote, speaker) {
    const text = speaker ? `"${quote}" — ${speaker}` : `"${quote}"`;
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Quote copied to clipboard!', 'success');
    });
}
