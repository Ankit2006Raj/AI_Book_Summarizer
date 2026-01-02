import google.generativeai as genai
from config import Config
import time
import json

class GeminiClient:
    """Client for interacting with Google Gemini API"""
    
    def __init__(self):
        """Initialize Gemini client"""
        if not Config.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        genai.configure(api_key=Config.GEMINI_API_KEY)
        
        # Try multiple models in order of preference (different models have separate quotas)
        model_priority = [
            'gemini-2.0-flash-lite',  # Lite version often has higher quotas
            'gemini-flash-latest',     # Latest flash model
            'learnlm-2.0-flash-experimental',  # Experimental model with separate quota
            'gemini-2.0-flash',        # Standard flash
            'gemma-3-12b-it',          # Gemma models have separate quotas
        ]
        
        self.model = None
        for model_name in model_priority:
            try:
                self.model = genai.GenerativeModel(model_name)
                # Test if model works with a tiny request
                print(f"✓ Using Gemini model: {model_name}")
                break
            except Exception as e:
                print(f"⚠ Model {model_name} not available: {e}")
                continue
        
        if not self.model:
            # Fallback to default
            self.model = genai.GenerativeModel('gemini-2.0-flash')
        
        self.chat_sessions = {}
    
    def generate_content(self, prompt, max_retries=3):
        """
        Generate content using Gemini API with retry logic
        
        Args:
            prompt (str): The prompt to send to Gemini
            max_retries (int): Maximum number of retries on failure
            
        Returns:
            str: Generated content
        """
        for attempt in range(max_retries):
            try:
                response = self.model.generate_content(prompt)
                return response.text
            except Exception as e:
                error_msg = str(e)
                
                # Check if it's a quota error
                if '429' in error_msg or 'quota' in error_msg.lower() or 'ResourceExhausted' in error_msg:
                    raise Exception(
                        "⚠️ API Quota Exceeded! Your Gemini API key has run out of free requests.\n\n"
                        "Solutions:\n"
                        "1. Get a new API key at: https://aistudio.google.com/app/apikey\n"
                        "2. Wait 24 hours for your quota to reset\n"
                        "3. Upgrade to a paid plan at: https://ai.google.dev/pricing\n\n"
                        f"Original error: {error_msg[:200]}"
                    )
                
                # For other errors, retry with exponential backoff
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                    continue
                else:
                    raise Exception(f"Failed to generate content after {max_retries} attempts: {str(e)}")
    
    def generate_summary(self, text, style='detailed', language='English'):
        """
        Generate a summary of the given text
        
        Args:
            text (str): Text to summarize
            style (str): Summary style (concise, detailed, analytical)
            language (str): Output language
            
        Returns:
            dict: Summary data including main summary, key points, etc.
        """
        style_prompts = {
            'concise': 'Provide a brief, concise summary in bullet points. Focus only on the most important information.',
            'detailed': 'Provide a detailed summary with comprehensive coverage of all main points, themes, and important details.',
            'analytical': 'Provide an analytical summary that includes themes, tone, emotions, character development, and deeper insights into the text.'
        }
        
        prompt = f"""
Analyze and summarize the following text in {language}. {style_prompts.get(style, style_prompts['detailed'])}

Please provide a structured response in JSON format with the following fields:
- summary: The main summary text
- key_concepts: List of key concepts and subtopics (array of strings)
- keywords: Important keywords (array of strings)
- characters: List of characters with their roles (array of objects with 'name' and 'role')
- central_ideas: Main themes and ideas (array of strings)
- tone: Overall tone and emotion of the text
- chapter_title: A suggested title if this is a chapter (optional)

Text to analyze:
{text[:Config.MAX_TOKENS_PER_REQUEST]}

Respond ONLY with valid JSON, no additional text.
"""
        
        try:
            response = self.generate_content(prompt)
            # Try to parse JSON from response
            # Remove markdown code blocks if present
            response = response.strip()
            if response.startswith('```json'):
                response = response[7:]
            if response.startswith('```'):
                response = response[3:]
            if response.endswith('```'):
                response = response[:-3]
            response = response.strip()
            
            result = json.loads(response)
            return result
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            return {
                'summary': response,
                'key_concepts': [],
                'keywords': [],
                'characters': [],
                'central_ideas': [],
                'tone': 'neutral',
                'chapter_title': ''
            }
    
    def start_chat_session(self, book_id, context):
        """
        Start a chat session for a specific book
        
        Args:
            book_id (str): Unique identifier for the book
            context (str): Book context/content
            
        Returns:
            str: Session ID
        """
        session_id = f"{book_id}_{int(time.time())}"
        
        # Create chat with initial context
        chat = self.model.start_chat(history=[
            {
                "role": "user",
                "parts": [f"I'm going to ask you questions about this book. Here's the content:\n\n{context[:20000]}"]
            },
            {
                "role": "model",
                "parts": ["I understand. I've read the book content you provided. Feel free to ask me any questions about it, and I'll answer based on the information given."]
            }
        ])
        
        self.chat_sessions[session_id] = chat
        return session_id
    
    def chat(self, session_id, question):
        """
        Send a question in an existing chat session
        
        Args:
            session_id (str): Session identifier
            question (str): User's question
            
        Returns:
            str: AI response
        """
        if session_id not in self.chat_sessions:
            return "Session not found. Please start a new chat session."
        
        try:
            chat = self.chat_sessions[session_id]
            response = chat.send_message(question)
            return response.text
        except Exception as e:
            return f"Error processing question: {str(e)}"
    
    def generate_quiz(self, text, difficulty='medium', num_questions=10, question_types=None):
        """
        Generate quiz questions from text
        
        Args:
            text (str): Text to generate quiz from
            difficulty (str): Difficulty level (easy, medium, hard)
            num_questions (int): Number of questions to generate
            question_types (list): Types of questions (multiple_choice, true_false, short_answer)
            
        Returns:
            list: List of quiz questions
        """
        if question_types is None:
            question_types = ['multiple_choice', 'true_false', 'short_answer']
        
        prompt = f"""
Generate {num_questions} quiz questions from the following text. 
Difficulty level: {difficulty}
Question types to include: {', '.join(question_types)}

For each question, provide:
- type: question type (multiple_choice, true_false, or short_answer)
- question: the question text
- options: array of options (for multiple_choice, should have 4 options)
- correct_answer: the correct answer
- explanation: brief explanation of why this is correct

Text:
{text[:Config.MAX_TOKENS_PER_REQUEST]}

Respond ONLY with valid JSON array, no additional text.
Format:
[
  {{
    "type": "multiple_choice",
    "question": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "Explanation text"
  }}
]
"""
        
        try:
            response = self.generate_content(prompt)
            # Clean response
            response = response.strip()
            if response.startswith('```json'):
                response = response[7:]
            if response.startswith('```'):
                response = response[3:]
            if response.endswith('```'):
                response = response[:-3]
            response = response.strip()
            
            questions = json.loads(response)
            return questions
        except json.JSONDecodeError:
            # Return empty list if parsing fails
            return []
    
    def extract_quotes(self, text, num_quotes=5):
        """
        Extract memorable quotes from text
        
        Args:
            text (str): Text to extract quotes from
            num_quotes (int): Number of quotes to extract
            
        Returns:
            list: List of quotes with context
        """
        prompt = f"""
Extract {num_quotes} most memorable, meaningful, or impactful quotes from the following text.
For each quote, provide the quote text and a brief context about why it's significant.

Text:
{text[:Config.MAX_TOKENS_PER_REQUEST]}

Respond with a JSON array:
[
  {{
    "quote": "The actual quote text",
    "context": "Why this quote is significant",
    "speaker": "Who said it (if applicable)"
  }}
]

Respond ONLY with valid JSON, no additional text.
"""
        
        try:
            response = self.generate_content(prompt)
            response = response.strip()
            if response.startswith('```json'):
                response = response[7:]
            if response.startswith('```'):
                response = response[3:]
            if response.endswith('```'):
                response = response[:-3]
            response = response.strip()
            
            quotes = json.loads(response)
            return quotes
        except:
            return []
    
    def detect_theme(self, text):
        """
        Detect themes and genre of the text
        
        Args:
            text (str): Text to analyze
            
        Returns:
            dict: Theme and genre information
        """
        prompt = f"""
Analyze the following text and identify:
- Primary genre (e.g., fiction, non-fiction, mystery, romance, science fiction, etc.)
- Main themes (e.g., love, betrayal, redemption, survival, etc.)
- Overall tone/mood (e.g., suspenseful, romantic, dark, hopeful, etc.)
- Emotional journey of the text

Text:
{text[:Config.MAX_TOKENS_PER_REQUEST]}

Respond with JSON:
{{
  "genre": "primary genre",
  "themes": ["theme1", "theme2", "theme3"],
  "tone": "overall tone",
  "mood": "overall mood",
  "emotional_journey": "brief description"
}}

Respond ONLY with valid JSON, no additional text.
"""
        
        try:
            response = self.generate_content(prompt)
            response = response.strip()
            if response.startswith('```json'):
                response = response[7:]
            if response.startswith('```'):
                response = response[3:]
            if response.endswith('```'):
                response = response[:-3]
            response = response.strip()
            
            theme_data = json.loads(response)
            return theme_data
        except:
            return {
                'genre': 'Unknown',
                'themes': [],
                'tone': 'Neutral',
                'mood': 'Neutral',
                'emotional_journey': 'Unable to analyze'
            }
    
    def translate_text(self, text, target_language):
        """
        Translate text to target language
        
        Args:
            text (str): Text to translate
            target_language (str): Target language
            
        Returns:
            str: Translated text
        """
        prompt = f"""
Translate the following text to {target_language}. Maintain the original meaning, tone, and style.

Text:
{text[:Config.MAX_TOKENS_PER_REQUEST]}

Provide ONLY the translation, no additional commentary.
"""
        
        return self.generate_content(prompt)
    
    def rewrite_tone(self, text, target_tone):
        """
        Rewrite text in a different tone
        
        Args:
            text (str): Original text
            target_tone (str): Target tone (academic, casual, storytelling, etc.)
            
        Returns:
            str: Rewritten text
        """
        prompt = f"""
Rewrite the following text in a {target_tone} tone while maintaining the core information and meaning.

Original text:
{text[:Config.MAX_TOKENS_PER_REQUEST]}

Provide ONLY the rewritten text, no additional commentary.
"""
        
        return self.generate_content(prompt)
