import hashlib
import json
import os
from config import Config
from utils.gemini_client import GeminiClient

class Summarizer:
    """Main summarization logic with caching"""
    
    def __init__(self):
        self.gemini = GeminiClient()
        self.cache_enabled = Config.ENABLE_CACHE
    
    def _get_cache_key(self, text, style, language):
        """Generate cache key from content"""
        content = f"{text}_{style}_{language}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def _load_from_cache(self, cache_key):
        """Load result from cache if available"""
        if not self.cache_enabled:
            return None
        
        cache_file = os.path.join(Config.CACHE_DIR, f"{cache_key}.json")
        if os.path.exists(cache_file):
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return None
        return None
    
    def _save_to_cache(self, cache_key, data):
        """Save result to cache"""
        if not self.cache_enabled:
            return
        
        cache_file = os.path.join(Config.CACHE_DIR, f"{cache_key}.json")
        try:
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except:
            pass
    
    def summarize_book(self, file_metadata, style='detailed', language='English', progress_callback=None):
        """
        Summarize entire book with chapter-wise summaries
        
        Args:
            file_metadata (dict): File metadata from FileProcessor
            style (str): Summary style
            language (str): Output language
            progress_callback (function): Callback for progress updates
            
        Returns:
            dict: Complete summary data
        """
        chapters = file_metadata.get('chapters', [])
        
        if not chapters:
            # No chapters detected, summarize as whole
            chapters = [{
                'title': 'Full Content',
                'content': file_metadata['full_text'],
                'word_count': file_metadata['word_count']
            }]
        
        result = {
            'book_info': {
                'title': file_metadata.get('title', file_metadata['filename']),
                'author': file_metadata.get('author', 'Unknown'),
                'total_chapters': len(chapters),
                'total_words': file_metadata['word_count'],
                'total_pages': file_metadata['page_count'],
                'estimated_reading_time': file_metadata.get('estimated_reading_time', 0)
            },
            'overall_summary': '',
            'chapters': [],
            'all_keywords': [],
            'all_characters': [],
            'overall_themes': {},
            'style': style,
            'language': language
        }
        
        # Process each chapter
        for idx, chapter in enumerate(chapters):
            if progress_callback:
                progress = (idx / len(chapters)) * 100
                progress_callback(progress, f"Processing {chapter['title']}...")
            
            # Check cache
            cache_key = self._get_cache_key(chapter['content'], style, language)
            cached_summary = self._load_from_cache(cache_key)
            
            if cached_summary:
                chapter_summary = cached_summary
            else:
                # Generate summary
                chapter_summary = self.gemini.generate_summary(
                    chapter['content'], 
                    style=style, 
                    language=language
                )
                
                # Add chapter info
                chapter_summary['chapter_number'] = idx + 1
                chapter_summary['chapter_title'] = chapter.get('title', f'Chapter {idx + 1}')
                chapter_summary['word_count'] = chapter.get('word_count', 0)
                
                # Save to cache
                self._save_to_cache(cache_key, chapter_summary)
            
            result['chapters'].append(chapter_summary)
            
            # Aggregate data
            result['all_keywords'].extend(chapter_summary.get('keywords', []))
            result['all_characters'].extend(chapter_summary.get('characters', []))
        
        # Remove duplicates
        result['all_keywords'] = list(set(result['all_keywords']))
        
        # Deduplicate characters by name
        seen_characters = {}
        for char in result['all_characters']:
            name = char.get('name', '')
            if name and name not in seen_characters:
                seen_characters[name] = char
        result['all_characters'] = list(seen_characters.values())
        
        # Generate overall summary from chapter summaries
        if len(chapters) > 1:
            combined_summaries = '\n\n'.join([
                f"Chapter {ch.get('chapter_number', i+1)}: {ch.get('summary', '')}"
                for i, ch in enumerate(result['chapters'])
            ])
            
            overall_prompt = f"""
Based on the following chapter summaries, create a comprehensive overall summary of the entire book in {language}:

{combined_summaries[:15000]}

Provide a cohesive summary that captures the main narrative, themes, and key points of the entire book.
"""
            result['overall_summary'] = self.gemini.generate_content(overall_prompt)
        else:
            result['overall_summary'] = result['chapters'][0].get('summary', '')
        
        # Detect overall themes
        if progress_callback:
            progress_callback(95, "Analyzing themes...")
        
        result['overall_themes'] = self.gemini.detect_theme(file_metadata['full_text'][:20000])
        
        if progress_callback:
            progress_callback(100, "Complete!")
        
        return result
    
    def summarize_chapter(self, chapter_text, style='detailed', language='English'):
        """
        Summarize a single chapter
        
        Args:
            chapter_text (str): Chapter text
            style (str): Summary style
            language (str): Output language
            
        Returns:
            dict: Chapter summary
        """
        cache_key = self._get_cache_key(chapter_text, style, language)
        cached_summary = self._load_from_cache(cache_key)
        
        if cached_summary:
            return cached_summary
        
        summary = self.gemini.generate_summary(chapter_text, style=style, language=language)
        self._save_to_cache(cache_key, summary)
        
        return summary
    
    def extract_quotes(self, text, num_quotes=5):
        """Extract memorable quotes"""
        return self.gemini.extract_quotes(text, num_quotes)
    
    def generate_quiz(self, text, difficulty='medium', num_questions=10, question_types=None):
        """Generate quiz questions"""
        return self.gemini.generate_quiz(text, difficulty, num_questions, question_types)
    
    def translate_summary(self, summary_text, target_language):
        """Translate summary to another language"""
        return self.gemini.translate_text(summary_text, target_language)
    
    def rewrite_tone(self, summary_text, target_tone):
        """Rewrite summary in different tone"""
        return self.gemini.rewrite_tone(summary_text, target_tone)
    
    def start_chat(self, book_id, book_context):
        """Start interactive chat session"""
        return self.gemini.start_chat_session(book_id, book_context)
    
    def send_chat_message(self, session_id, question):
        """Send message in chat session"""
        return self.gemini.chat(session_id, question)
