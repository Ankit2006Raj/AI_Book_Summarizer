# 📚 AI Book Summarizer - Ultimate Edition

An intelligent book summarization platform powered by Google's Gemini AI that transforms lengthy documents into concise, actionable insights. Upload PDFs, eBooks, or documents and get comprehensive summaries, interactive quizzes, and AI-powered chat assistance.

## ✨ Features

### 🎯 Core Capabilities
- **Multi-Format Support** - Process PDFs, EPUB, DOCX, TXT, and image-based documents
- **AI-Powered Summaries** - Generate detailed, concise, or bullet-point summaries in multiple languages
- **Interactive Chat** - Ask questions about your uploaded content with context-aware AI responses
- **Smart Quiz Generation** - Create custom quizzes with multiple choice, true/false, and short answer questions
- **Quote Extraction** - Automatically identify and extract memorable quotes from your documents
- **Multi-Language Support** - Translate summaries into various languages
- **Tone Rewriting** - Adjust summary tone (professional, casual, academic, simple)

### 📊 Advanced Features
- **Chapter-by-Chapter Analysis** - Break down books into digestible sections
- **Keyword Extraction** - Identify key concepts and themes
- **Word Cloud Visualization** - Visual representation of important terms
- **Export Options** - Download summaries in PDF, DOCX, TXT, or JSON formats
- **Recent Files Management** - Quick access to previously uploaded documents
- **Voice Integration** - Text-to-speech and speech recognition capabilities

## 🚀 Getting Started

### Prerequisites
- Python 3.8 or higher
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ankit2006Raj/ai-book-summarizer.git
   cd ai-book-summarizer
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Run the application**
   ```bash
   python app.py
   ```

5. **Open your browser**
   Navigate to `http://localhost:5000`

## 🛠️ Tech Stack

### Backend
- **Flask** - Web framework
- **Google Generative AI** - AI-powered summarization and chat
- **PyPDF2 & pdfplumber** - PDF processing
- **python-docx** - Word document handling
- **ebooklib** - EPUB file processing
- **pytesseract** - OCR for image-based documents

### Frontend
- **Vanilla JavaScript** - Interactive UI
- **CSS3** - Modern styling
- **HTML5** - Semantic markup

### Additional Libraries
- **gTTS** - Text-to-speech conversion
- **SpeechRecognition** - Voice input
- **ReportLab** - PDF generation
- **WordCloud** - Keyword visualization
- **BeautifulSoup4** - HTML parsing

## 📁 Project Structure

```
ai-book-summarizer/
├── app.py                 # Main Flask application
├── config.py              # Configuration settings
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
├── templates/
│   └── index.html        # Main web interface
├── static/
│   ├── css/
│   │   └── style.css     # Styling
│   └── js/
│       ├── main.js       # Core functionality
│       ├── chat.js       # Chat interface
│       ├── quiz.js       # Quiz generation
│       ├── upload.js     # File upload handling
│       ├── export.js     # Export functionality
│       └── voice.js      # Voice features
├── utils/
│   ├── file_processor.py # Document processing
│   ├── summarizer.py     # AI summarization logic
│   ├── exporter.py       # Export utilities
│   └── gemini_client.py  # Gemini API integration
├── uploads/              # Uploaded files storage
└── exports/              # Generated exports
```

## 🎮 Usage

1. **Upload a Document** - Drag and drop or select a file (PDF, EPUB, DOCX, TXT)
2. **Generate Summary** - Choose summary style (detailed, concise, bullet points) and language
3. **Interact with Content**:
   - Chat with AI about the document
   - Generate custom quizzes
   - Extract memorable quotes
   - Translate or rewrite summaries
4. **Export Results** - Download summaries in your preferred format

## 🔑 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Upload and process documents |
| `/api/summarize` | POST | Generate book summary |
| `/api/chat/start` | POST | Start chat session |
| `/api/chat/message` | POST | Send chat message |
| `/api/quiz/generate` | POST | Generate quiz questions |
| `/api/quotes/extract` | POST | Extract memorable quotes |
| `/api/translate` | POST | Translate summary |
| `/api/rewrite` | POST | Rewrite in different tone |
| `/api/export` | POST | Export summary |
| `/api/wordcloud` | POST | Generate word cloud data |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the MIT License.

## 🐛 Known Issues & Limitations

- Large files (>50MB) may take longer to process
- OCR accuracy depends on image quality
- API rate limits apply based on your Gemini API tier

## 🔮 Future Enhancements

- [ ] Support for more file formats (Markdown, HTML)
- [ ] Batch processing capabilities
- [ ] User authentication and saved sessions
- [ ] Advanced analytics and insights
- [ ] Mobile app version
- [ ] Collaborative features

## 👨‍💻 Author

**Ankit Raj**  
AIML Student | Web Developer

- 🐙 GitHub: [@Ankit2006Raj](https://github.com/Ankit2006Raj)
- 💼 LinkedIn: [Ankit Raj](https://www.linkedin.com/in/ankit-raj-226a36309)
- 📧 Email: [ankit9905163014@gmail.com](mailto:ankit9905163014@gmail.com)

---

<div align="center">

### ⭐ If you find this project helpful, please consider giving it a star!

**Made with ❤️ by Ankit Raj**

</div>
"# AI_Book_Summarizer" 
