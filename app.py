from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import uuid
import traceback
from datetime import datetime

from config import Config
from utils.file_processor import FileProcessor
from utils.summarizer import Summarizer
from utils.exporter import Exporter

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

# Initialize configuration
Config.init_app()

# Initialize utilities
file_processor = FileProcessor()
summarizer = Summarizer()
exporter = Exporter()

# Store active sessions (in production, use Redis or database)
active_sessions = {}
uploaded_files = {}


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS


@app.route('/')
def index():
    """Render main page"""
    return render_template('index.html')


@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle file upload"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not supported'}), 400
        
        # Generate unique ID for this upload
        file_id = str(uuid.uuid4())
        filename = secure_filename(file.filename)
        file_path = os.path.join(Config.UPLOAD_FOLDER, f"{file_id}_{filename}")
        
        # Save file
        file.save(file_path)
        
        # Process file
        metadata = file_processor.process_file(file_path)
        metadata['file_id'] = file_id
        metadata['uploaded_at'] = datetime.now().isoformat()
        
        # Store metadata
        uploaded_files[file_id] = {
            'metadata': metadata,
            'file_path': file_path,
            'summary': None
        }
        
        return jsonify({
            'success': True,
            'file_id': file_id,
            'metadata': metadata
        })
    
    except Exception as e:
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500


@app.route('/api/summarize', methods=['POST'])
def summarize():
    """Generate summary for uploaded file"""
    try:
        data = request.json
        file_id = data.get('file_id')
        style = data.get('style', 'detailed')
        language = data.get('language', 'English')
        
        if not file_id or file_id not in uploaded_files:
            return jsonify({'error': 'File not found'}), 404
        
        file_data = uploaded_files[file_id]
        metadata = file_data['metadata']
        
        # Generate summary
        summary = summarizer.summarize_book(metadata, style=style, language=language)
        
        # Store summary
        file_data['summary'] = summary
        
        return jsonify({
            'success': True,
            'summary': summary
        })
    
    except Exception as e:
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500


@app.route('/api/chat/start', methods=['POST'])
def start_chat():
    """Start a chat session"""
    try:
        data = request.json
        file_id = data.get('file_id')
        
        if not file_id or file_id not in uploaded_files:
            return jsonify({'error': 'File not found'}), 404
        
        file_data = uploaded_files[file_id]
        metadata = file_data['metadata']
        
        # Start chat session
        session_id = summarizer.start_chat(file_id, metadata['full_text'])
        
        # Store session
        active_sessions[session_id] = {
            'file_id': file_id,
            'created_at': datetime.now().isoformat()
        }
        
        return jsonify({
            'success': True,
            'session_id': session_id
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/chat/message', methods=['POST'])
def send_message():
    """Send a message in chat session"""
    try:
        data = request.json
        session_id = data.get('session_id')
        message = data.get('message')
        
        if not session_id or session_id not in active_sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        # Send message
        response = summarizer.send_chat_message(session_id, message)
        
        return jsonify({
            'success': True,
            'response': response
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/quiz/generate', methods=['POST'])
def generate_quiz():
    """Generate quiz questions"""
    try:
        data = request.json
        file_id = data.get('file_id')
        chapter_index = data.get('chapter_index', None)
        difficulty = data.get('difficulty', 'medium')
        num_questions = data.get('num_questions', 10)
        question_types = data.get('question_types', ['multiple_choice', 'true_false', 'short_answer'])
        
        if not file_id or file_id not in uploaded_files:
            return jsonify({'error': 'File not found'}), 404
        
        file_data = uploaded_files[file_id]
        metadata = file_data['metadata']
        
        # Get text to generate quiz from
        if chapter_index is not None:
            chapters = metadata.get('chapters', [])
            if chapter_index >= len(chapters):
                return jsonify({'error': 'Chapter not found'}), 404
            text = chapters[chapter_index]['content']
        else:
            text = metadata['full_text']
        
        # Generate quiz
        quiz = summarizer.generate_quiz(text, difficulty, num_questions, question_types)
        
        return jsonify({
            'success': True,
            'quiz': quiz
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/quotes/extract', methods=['POST'])
def extract_quotes():
    """Extract memorable quotes"""
    try:
        data = request.json
        file_id = data.get('file_id')
        num_quotes = data.get('num_quotes', 5)
        
        if not file_id or file_id not in uploaded_files:
            return jsonify({'error': 'File not found'}), 404
        
        file_data = uploaded_files[file_id]
        metadata = file_data['metadata']
        
        # Extract quotes
        quotes = summarizer.extract_quotes(metadata['full_text'], num_quotes)
        
        return jsonify({
            'success': True,
            'quotes': quotes
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/translate', methods=['POST'])
def translate():
    """Translate summary to another language"""
    try:
        data = request.json
        text = data.get('text')
        target_language = data.get('target_language')
        
        if not text or not target_language:
            return jsonify({'error': 'Missing required parameters'}), 400
        
        # Translate
        translated = summarizer.translate_summary(text, target_language)
        
        return jsonify({
            'success': True,
            'translated_text': translated
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/rewrite', methods=['POST'])
def rewrite():
    """Rewrite summary in different tone"""
    try:
        data = request.json
        text = data.get('text')
        target_tone = data.get('target_tone')
        
        if not text or not target_tone:
            return jsonify({'error': 'Missing required parameters'}), 400
        
        # Rewrite
        rewritten = summarizer.rewrite_tone(text, target_tone)
        
        return jsonify({
            'success': True,
            'rewritten_text': rewritten
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/export', methods=['POST'])
def export():
    """Export summary in various formats"""
    try:
        data = request.json
        file_id = data.get('file_id')
        export_format = data.get('format', 'pdf')
        
        if not file_id or file_id not in uploaded_files:
            return jsonify({'error': 'File not found'}), 404
        
        file_data = uploaded_files[file_id]
        summary = file_data.get('summary')
        
        if not summary:
            return jsonify({'error': 'No summary available. Please generate summary first.'}), 400
        
        # Generate filename
        book_title = summary['book_info'].get('title', 'book_summary')
        safe_title = "".join(c for c in book_title if c.isalnum() or c in (' ', '-', '_')).rstrip()
        filename = f"{safe_title}_{datetime.now().strftime('%Y%m%d')}"
        
        # Export based on format
        if export_format == 'pdf':
            output_path = exporter.export_to_pdf(summary, f"{filename}.pdf")
        elif export_format == 'docx':
            output_path = exporter.export_to_docx(summary, f"{filename}.docx")
        elif export_format == 'txt':
            output_path = exporter.export_to_txt(summary, f"{filename}.txt")
        elif export_format == 'json':
            output_path = exporter.export_to_json(summary, f"{filename}.json")
        else:
            return jsonify({'error': 'Unsupported export format'}), 400
        
        return send_file(output_path, as_attachment=True)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/export/quiz', methods=['POST'])
def export_quiz():
    """Export quiz data"""
    try:
        data = request.json
        quiz_data = data.get('quiz_data')
        export_format = data.get('format', 'csv')
        
        if not quiz_data:
            return jsonify({'error': 'No quiz data provided'}), 400
        
        filename = f"quiz_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        if export_format == 'csv':
            output_path = exporter.export_quiz_to_csv(quiz_data, f"{filename}.csv")
        elif export_format == 'json':
            output_path = exporter.export_to_json({'quiz': quiz_data}, f"{filename}.json")
        else:
            return jsonify({'error': 'Unsupported export format'}), 400
        
        return send_file(output_path, as_attachment=True)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/files/recent', methods=['GET'])
def get_recent_files():
    """Get list of recently uploaded files"""
    try:
        # Get last 5 uploaded files
        recent = []
        sorted_files = sorted(
            uploaded_files.items(),
            key=lambda x: x[1]['metadata'].get('uploaded_at', ''),
            reverse=True
        )[:5]
        
        for file_id, data in sorted_files:
            metadata = data['metadata']
            recent.append({
                'file_id': file_id,
                'filename': metadata['filename'],
                'title': metadata.get('title', ''),
                'author': metadata.get('author', ''),
                'uploaded_at': metadata.get('uploaded_at', ''),
                'has_summary': data['summary'] is not None
            })
        
        return jsonify({
            'success': True,
            'files': recent
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/wordcloud', methods=['POST'])
def generate_wordcloud():
    """Generate word cloud data"""
    try:
        data = request.json
        file_id = data.get('file_id')
        
        if not file_id or file_id not in uploaded_files:
            return jsonify({'error': 'File not found'}), 404
        
        file_data = uploaded_files[file_id]
        
        # Get keywords from summary or extract from text
        if file_data['summary']:
            keywords = file_data['summary'].get('all_keywords', [])
        else:
            # Simple keyword extraction
            from collections import Counter
            import re
            
            text = file_data['metadata']['full_text']
            words = re.findall(r'\b\w{4,}\b', text.lower())
            # Remove common words
            stop_words = {'that', 'this', 'with', 'from', 'have', 'been', 'were', 'will', 'would', 'could', 'should'}
            words = [w for w in words if w not in stop_words]
            
            word_counts = Counter(words)
            keywords = [{'text': word, 'value': count} for word, count in word_counts.most_common(50)]
        
        if isinstance(keywords, list) and len(keywords) > 0 and isinstance(keywords[0], str):
            # Convert to format for word cloud
            from collections import Counter
            keyword_counts = Counter(keywords)
            keywords = [{'text': word, 'value': count} for word, count in keyword_counts.most_common(50)]
        
        return jsonify({
            'success': True,
            'keywords': keywords
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.errorhandler(413)
def too_large(e):
    """Handle file too large error"""
    return jsonify({'error': f'File too large. Maximum size is {Config.MAX_FILE_SIZE_MB}MB'}), 413


@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors"""
    return jsonify({'error': 'Resource not found'}), 404


@app.errorhandler(500)
def server_error(e):
    """Handle 500 errors"""
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    print("=" * 80)
    print("🚀 AI Book Summarizer - Ultimate Edition")
    print("=" * 80)
    print(f"📚 Server starting on http://localhost:5000")
    print(f"📁 Upload folder: {Config.UPLOAD_FOLDER}")
    print(f"💾 Cache folder: {Config.CACHE_DIR}")
    print(f"📤 Export folder: {Config.EXPORT_DIR}")
    print(f"🔑 API Key configured: {'Yes' if Config.GEMINI_API_KEY else 'No - Please add to .env file'}")
    print("=" * 80)
    
    if not Config.GEMINI_API_KEY:
        print("\n⚠️  WARNING: GEMINI_API_KEY not found!")
        print("Please add your API key to the .env file:")
        print("  1. Copy .env.example to .env")
        print("  2. Add your Gemini API key")
        print("  3. Restart the server\n")
    
    app.run(debug=Config.FLASK_DEBUG, host='0.0.0.0', port=5000)
