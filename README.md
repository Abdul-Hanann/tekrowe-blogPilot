# AI Blog Automation - Full Stack Web Application

An AI-powered multi-agent system for fully automated blog creation, now with a modern web interface. Built with React frontend, FastAPI backend, LangChain, and advanced LLMs.

## Project Structure

```
ai-blog-automation/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service calls
│   │   └── utils/          # Utility functions
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
├── backend/                 # FastAPI backend application
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Core configuration
│   │   ├── models/         # Data models
│   │   ├── services/       # Business logic
│   │   └── agents/         # AI agent modules
│   ├── requirements.txt    # Python dependencies
│   └── main.py            # FastAPI entry point
├── shared/                  # Shared utilities and types
└── docker-compose.yml      # Development environment setup
```

## Features

- **Web Interface**: Modern React frontend for easy blog creation
- **AI Agents**: Automated topic generation, content planning, writing, editing, and SEO optimization
- **Real-time Progress**: Track blog creation progress through the pipeline
- **Content Management**: Save, edit, and manage multiple blog projects
- **Export Options**: Download blogs in various formats (Markdown, DOCX, HTML)

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Query** for API state management
- **React Router** for navigation

### Backend
- **FastAPI** with Python 3.10+
- **LangChain** for AI agent orchestration
- **OpenAI GPT-4** for content generation
- **DuckDuckGo** for web research
- **SQLAlchemy** for database management

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- OpenAI API key

### Development Setup

1. **Clone and setup environment**
```bash
git clone <your-repo>
cd ai-blog-automation
cp .env.example .env
# Update .env with your OpenAI API key
```

2. **Start Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

3. **Start Frontend**
```bash
cd frontend
npm install
npm run dev
```

4. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## API Endpoints

- `POST /api/blogs/create` - Start new blog creation
- `GET /api/blogs/{id}` - Get blog status and content
- `GET /api/blogs` - List all blogs
- `DELETE /api/blogs/{id}` - Delete blog

## Environment Variables

```env
OPENAI_API_KEY=your_openai_api_key
DATABASE_URL=sqlite:///./blog_automation.db
CORS_ORIGINS=http://localhost:5173
```

## Development Notes

- The AI agents are now integrated into the FastAPI backend as services
- Frontend provides real-time progress updates during blog creation
- All blog data is stored in a database for persistence
- Docker setup available for consistent development environment
