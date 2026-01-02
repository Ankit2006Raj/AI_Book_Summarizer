// File upload handling

document.addEventListener('DOMContentLoaded', function() {
    initializeUpload();
});

function initializeUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);
    
    // Handle file input change
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            handleFile(this.files[0]);
        }
    });
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    document.getElementById('dropZone').classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900');
}

function unhighlight(e) {
    document.getElementById('dropZone').classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

async function handleFile(file) {
    console.log('File received:', file.name, 'Type:', file.type, 'Size:', file.size);
    
    // Validate file type - be more lenient with type checking
    const allowedExtensions = ['.pdf', '.epub', '.docx', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    console.log('File extension:', fileExtension);
    
    if (!allowedExtensions.includes(fileExtension)) {
        showNotification('Please upload a PDF, ePub, DOCX, or TXT file', 'error');
        return;
    }
    
    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        showNotification('File size exceeds 50MB limit', 'error');
        return;
    }
    
    // Show upload progress
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadStatus = document.getElementById('uploadStatus');
    const uploadPercent = document.getElementById('uploadPercent');
    const uploadProgressBar = document.getElementById('uploadProgressBar');
    
    uploadProgress.classList.remove('hidden');
    uploadStatus.textContent = 'Uploading...';
    uploadPercent.textContent = '0%';
    uploadProgressBar.style.width = '0%';
    
    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        console.log('Starting file upload...');
        
        // Upload file with progress tracking
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                uploadProgressBar.style.width = percentComplete + '%';
                uploadPercent.textContent = Math.round(percentComplete) + '%';
                console.log('Upload progress:', percentComplete + '%');
            }
        });
        
        xhr.addEventListener('load', function() {
            console.log('Upload complete. Status:', xhr.status);
            console.log('Response:', xhr.responseText);
            
            if (xhr.status === 200) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    
                    if (data.success) {
                        uploadStatus.textContent = 'Processing file...';
                        uploadProgressBar.style.width = '100%';
                        uploadPercent.textContent = '100%';
                        
                        setTimeout(() => {
                            uploadProgress.classList.add('hidden');
                            displayFileInfo(data.metadata);
                            currentFileId = data.file_id;
                            currentMetadata = data.metadata;
                            showNotification('File uploaded successfully! 🎉', 'success');
                        }, 500);
                    } else {
                        throw new Error(data.error || 'Upload failed');
                    }
                } catch (parseError) {
                    console.error('Error parsing response:', parseError);
                    throw new Error('Server response error: ' + parseError.message);
                }
            } else {
                let errorMsg = 'Upload failed with status: ' + xhr.status;
                try {
                    const errorData = JSON.parse(xhr.responseText);
                    if (errorData.error) {
                        errorMsg = errorData.error;
                    }
                } catch (e) {
                    // Ignore JSON parse error for error response
                }
                throw new Error(errorMsg);
            }
        });
        
        xhr.addEventListener('error', function() {
            console.error('Network error during upload');
            throw new Error('Network error during upload. Please check your connection.');
        });
        
        xhr.addEventListener('abort', function() {
            console.error('Upload aborted');
            throw new Error('Upload was cancelled');
        });
        
        xhr.open('POST', '/api/upload');
        xhr.send(formData);
        
        console.log('Upload request sent');
        
    } catch (error) {
        console.error('Upload error:', error);
        showNotification('Error uploading file: ' + error.message, 'error');
        uploadProgress.classList.add('hidden');
    }
}

function displayFileInfo(metadata) {
    // Show file info section
    const fileInfo = document.getElementById('fileInfo');
    fileInfo.classList.remove('hidden');
    
    // Update book information
    document.getElementById('bookTitle').textContent = metadata.title || metadata.filename;
    document.getElementById('bookAuthor').textContent = metadata.author || 'Unknown';
    document.getElementById('bookChapters').textContent = metadata.chapters.length;
    document.getElementById('bookWords').textContent = formatNumber(metadata.word_count);
    
    // Show options section
    document.getElementById('optionsSection').classList.remove('hidden');
    
    // Update sidebar chapter list
    updateChapterList(metadata.chapters);
    
    // Scroll to options
    setTimeout(() => {
        document.getElementById('optionsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
}
