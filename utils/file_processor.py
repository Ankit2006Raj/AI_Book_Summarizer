import os
import re
from PyPDF2 import PdfReader
import pdfplumber
from docx import Document
from ebooklib import epub
from bs4 import BeautifulSoup
import chardet

class FileProcessor:
    """Process various file formats and extract text"""
    
    def __init__(self):
        self.supported_formats = ['pdf', 'epub', 'docx', 'txt']
    
    def process_file(self, file_path):
        """
        Process a file and extract text content
        
        Args:
            file_path (str): Path to the file
            
        Returns:
            dict: File metadata and content
        """
        file_ext = os.path.splitext(file_path)[1].lower()[1:]
        
        if file_ext not in self.supported_formats:
            raise ValueError(f"Unsupported file format: {file_ext}")
        
        metadata = {
            'filename': os.path.basename(file_path),
            'format': file_ext,
            'size': os.path.getsize(file_path),
            'title': '',
            'author': '',
            'chapters': [],
            'page_count': 0,
            'word_count': 0,
            'full_text': ''
        }
        
        # Process based on file type
        if file_ext == 'pdf':
            metadata = self._process_pdf(file_path, metadata)
        elif file_ext == 'epub':
            metadata = self._process_epub(file_path, metadata)
        elif file_ext == 'docx':
            metadata = self._process_docx(file_path, metadata)
        elif file_ext == 'txt':
            metadata = self._process_txt(file_path, metadata)
        
        # Calculate word count
        metadata['word_count'] = len(metadata['full_text'].split())
        
        # Extract chapters if not already done
        if not metadata['chapters']:
            metadata['chapters'] = self._extract_chapters(metadata['full_text'])
        
        # Estimate reading time (average 200 words per minute)
        metadata['estimated_reading_time'] = metadata['word_count'] / 200
        
        return metadata
    
    def _process_pdf(self, file_path, metadata):
        """Process PDF files"""
        try:
            # Try with PyPDF2 first
            reader = PdfReader(file_path)
            metadata['page_count'] = len(reader.pages)
            
            # Extract metadata
            if reader.metadata:
                metadata['title'] = reader.metadata.get('/Title', '') or ''
                metadata['author'] = reader.metadata.get('/Author', '') or ''
            
            # Extract text from all pages
            full_text = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    full_text.append(text)
            
            metadata['full_text'] = '\n\n'.join(full_text)
            
            # If text extraction failed, try pdfplumber
            if not metadata['full_text'].strip():
                with pdfplumber.open(file_path) as pdf:
                    full_text = []
                    for page in pdf.pages:
                        text = page.extract_text()
                        if text:
                            full_text.append(text)
                    metadata['full_text'] = '\n\n'.join(full_text)
            
        except Exception as e:
            raise Exception(f"Error processing PDF: {str(e)}")
        
        return metadata
    
    def _process_epub(self, file_path, metadata):
        """Process EPUB files"""
        try:
            book = epub.read_epub(file_path)
            
            # Extract metadata
            metadata['title'] = book.get_metadata('DC', 'title')
            if metadata['title']:
                metadata['title'] = metadata['title'][0][0] if metadata['title'] else ''
            
            metadata['author'] = book.get_metadata('DC', 'creator')
            if metadata['author']:
                metadata['author'] = metadata['author'][0][0] if metadata['author'] else ''
            
            # Extract text from all items
            full_text = []
            chapters = []
            
            for item in book.get_items():
                if item.get_type() == epub.ITEM_DOCUMENT:
                    content = item.get_content()
                    soup = BeautifulSoup(content, 'html.parser')
                    text = soup.get_text()
                    
                    if text.strip():
                        full_text.append(text)
                        
                        # Try to extract chapter title
                        chapter_title = ''
                        for tag in ['h1', 'h2', 'h3']:
                            heading = soup.find(tag)
                            if heading:
                                chapter_title = heading.get_text().strip()
                                break
                        
                        if chapter_title:
                            chapters.append({
                                'title': chapter_title,
                                'content': text,
                                'word_count': len(text.split())
                            })
            
            metadata['full_text'] = '\n\n'.join(full_text)
            metadata['chapters'] = chapters
            metadata['page_count'] = len(chapters)
            
        except Exception as e:
            raise Exception(f"Error processing EPUB: {str(e)}")
        
        return metadata
    
    def _process_docx(self, file_path, metadata):
        """Process DOCX files"""
        try:
            doc = Document(file_path)
            
            # Extract metadata
            core_properties = doc.core_properties
            metadata['title'] = core_properties.title or ''
            metadata['author'] = core_properties.author or ''
            
            # Extract text from paragraphs
            full_text = []
            for para in doc.paragraphs:
                if para.text.strip():
                    full_text.append(para.text)
            
            metadata['full_text'] = '\n\n'.join(full_text)
            metadata['page_count'] = len(full_text) // 50  # Estimate pages
            
        except Exception as e:
            raise Exception(f"Error processing DOCX: {str(e)}")
        
        return metadata
    
    def _process_txt(self, file_path, metadata):
        """Process TXT files"""
        try:
            # Detect encoding
            with open(file_path, 'rb') as f:
                raw_data = f.read()
                result = chardet.detect(raw_data)
                encoding = result['encoding'] or 'utf-8'
            
            # Read file with detected encoding
            with open(file_path, 'r', encoding=encoding, errors='ignore') as f:
                full_text = f.read()
            
            metadata['full_text'] = full_text
            metadata['page_count'] = len(full_text) // 2000  # Estimate pages
            
            # Try to extract title from filename
            filename = os.path.basename(file_path)
            metadata['title'] = os.path.splitext(filename)[0].replace('_', ' ').replace('-', ' ')
            
        except Exception as e:
            raise Exception(f"Error processing TXT: {str(e)}")
        
        return metadata
    
    def _extract_chapters(self, text):
        """
        Extract chapters from text using pattern matching
        
        Args:
            text (str): Full text content
            
        Returns:
            list: List of chapter dictionaries
        """
        chapters = []
        
        # Common chapter patterns
        patterns = [
            r'Chapter\s+\d+[:\-\s]+.*?(?=Chapter\s+\d+|$)',
            r'CHAPTER\s+\d+[:\-\s]+.*?(?=CHAPTER\s+\d+|$)',
            r'\d+\.\s+[A-Z][^.\n]+.*?(?=\d+\.\s+[A-Z]|$)',
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.DOTALL | re.IGNORECASE)
            temp_chapters = []
            
            for match in matches:
                chapter_text = match.group(0)
                # Extract chapter title (first line)
                lines = chapter_text.split('\n', 1)
                title = lines[0].strip() if lines else 'Untitled Chapter'
                content = lines[1] if len(lines) > 1 else chapter_text
                
                temp_chapters.append({
                    'title': title,
                    'content': content.strip(),
                    'word_count': len(content.split())
                })
            
            if temp_chapters:
                chapters = temp_chapters
                break
        
        # If no chapters detected, split by paragraphs
        if not chapters:
            paragraphs = text.split('\n\n')
            chunk_size = max(1, len(paragraphs) // 10)  # Divide into ~10 sections
            
            for i in range(0, len(paragraphs), chunk_size):
                chunk = '\n\n'.join(paragraphs[i:i+chunk_size])
                if chunk.strip():
                    chapters.append({
                        'title': f'Section {len(chapters) + 1}',
                        'content': chunk.strip(),
                        'word_count': len(chunk.split())
                    })
        
        return chapters
    
    def split_text_for_processing(self, text, max_tokens=25000):
        """
        Split large text into manageable chunks
        
        Args:
            text (str): Text to split
            max_tokens (int): Maximum tokens per chunk (approximate by words)
            
        Returns:
            list: List of text chunks
        """
        words = text.split()
        chunks = []
        current_chunk = []
        current_length = 0
        
        for word in words:
            current_chunk.append(word)
            current_length += 1
            
            if current_length >= max_tokens:
                chunks.append(' '.join(current_chunk))
                current_chunk = []
                current_length = 0
        
        if current_chunk:
            chunks.append(' '.join(current_chunk))
        
        return chunks
