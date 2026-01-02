// Export functionality

async function exportSummary(format) {
    if (!currentFileId || !currentSummary) {
        showNotification('Please generate a summary first', 'error');
        return;
    }
    
    showProgress(30, `Generating ${format.toUpperCase()} file...`);
    
    try {
        const response = await fetch('/api/export', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_id: currentFileId,
                format: format
            })
        });
        
        showProgress(70, 'Preparing download...');
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Get filename from Content-Disposition header or create default
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `book_summary_${Date.now()}.${format}`;
            
            if (contentDisposition) {
                const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }
            
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            
            showProgress(100, 'Download complete!');
            showNotification(`Summary exported as ${format.toUpperCase()} successfully!`, 'success');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Export failed');
        }
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Error exporting summary: ' + error.message, 'error');
        showProgress(0);
    }
}

async function exportFlashcards() {
    if (!currentFileId || !currentSummary) {
        showNotification('Please generate a summary first', 'error');
        return;
    }
    
    showProgress(30, 'Generating flashcards...');
    
    try {
        // Create flashcards content
        let flashcardsContent = 'FLASHCARDS FOR ANKI/NOTION\n\n';
        
        currentSummary.chapters.forEach((chapter, index) => {
            flashcardsContent += `=== CHAPTER ${chapter.chapter_number}: ${chapter.chapter_title} ===\n\n`;
            
            // Key concepts as flashcards
            if (chapter.key_concepts && chapter.key_concepts.length > 0) {
                chapter.key_concepts.forEach((concept, i) => {
                    flashcardsContent += `Q${index + 1}.${i + 1}: What is a key concept in ${chapter.chapter_title}?\n`;
                    flashcardsContent += `A: ${concept}\n\n`;
                });
            }
            
            // Keywords as flashcards
            if (chapter.keywords && chapter.keywords.length > 0) {
                chapter.keywords.slice(0, 3).forEach((keyword, i) => {
                    flashcardsContent += `Q${index + 1}.K${i + 1}: Define '${keyword}' in the context of ${chapter.chapter_title}\n`;
                    flashcardsContent += `A: [Review chapter content for context]\n\n`;
                });
            }
        });
        
        // Create and download file
        const blob = new Blob([flashcardsContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flashcards_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        showProgress(100, 'Flashcards ready!');
        showNotification('Flashcards exported successfully!', 'success');
    } catch (error) {
        console.error('Flashcards export error:', error);
        showNotification('Error creating flashcards', 'error');
        showProgress(0);
    }
}

async function exportStudyBundle() {
    if (!currentFileId || !currentSummary) {
        showNotification('Please generate a summary first', 'error');
        return;
    }
    
    showProgress(20, 'Creating study bundle...');
    
    try {
        // This would ideally zip multiple files together
        // For now, we'll export PDF as the main study guide
        await exportSummary('pdf');
        
        showNotification('Study bundle created! More formats can be exported individually.', 'success');
    } catch (error) {
        console.error('Bundle export error:', error);
        showNotification('Error creating study bundle', 'error');
        showProgress(0);
    }
}

// Translation feature
async function translateSummary(targetLanguage) {
    if (!currentSummary) {
        showNotification('Please generate a summary first', 'error');
        return;
    }
    
    showProgress(30, `Translating to ${targetLanguage}...`);
    
    try {
        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: currentSummary.overall_summary,
                target_language: targetLanguage
            })
        });
        
        showProgress(70, 'Processing translation...');
        
        const data = await response.json();
        
        if (data.success) {
            // Display translated summary
            const overallSummary = document.getElementById('overallSummary');
            overallSummary.innerHTML = `
                <div class="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg mb-4">
                    <p class="text-sm font-semibold mb-2">
                        <i class="fas fa-language mr-2"></i>
                        Translated to ${targetLanguage}
                    </p>
                </div>
                <p class="text-lg leading-relaxed">${data.translated_text.replace(/\n/g, '<br><br>')}</p>
            `;
            
            showProgress(100, 'Translation complete!');
            showNotification('Summary translated successfully!', 'success');
        } else {
            throw new Error('Translation failed');
        }
    } catch (error) {
        console.error('Translation error:', error);
        showNotification('Error translating summary', 'error');
        showProgress(0);
    }
}

// Tone rewriting
async function rewriteTone(targetTone) {
    if (!currentSummary) {
        showNotification('Please generate a summary first', 'error');
        return;
    }
    
    showProgress(30, `Rewriting in ${targetTone} tone...`);
    
    try {
        const response = await fetch('/api/rewrite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: currentSummary.overall_summary,
                target_tone: targetTone
            })
        });
        
        showProgress(70, 'Processing rewrite...');
        
        const data = await response.json();
        
        if (data.success) {
            // Display rewritten summary
            const overallSummary = document.getElementById('overallSummary');
            overallSummary.innerHTML = `
                <div class="p-4 bg-purple-50 dark:bg-purple-900 rounded-lg mb-4">
                    <p class="text-sm font-semibold mb-2">
                        <i class="fas fa-pen mr-2"></i>
                        Rewritten in ${targetTone} tone
                    </p>
                </div>
                <p class="text-lg leading-relaxed">${data.rewritten_text.replace(/\n/g, '<br><br>')}</p>
            `;
            
            showProgress(100, 'Rewrite complete!');
            showNotification('Summary rewritten successfully!', 'success');
        } else {
            throw new Error('Rewrite failed');
        }
    } catch (error) {
        console.error('Rewrite error:', error);
        showNotification('Error rewriting summary', 'error');
        showProgress(0);
    }
}
