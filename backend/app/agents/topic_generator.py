import os
import re
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from ddgs import DDGS
from app.models.blog import BlogStatus

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7, openai_api_key=OPENAI_API_KEY)

def generate_trending_topics():
    """Generate trending topics using web search and AI"""
    sources = [
        "GitHub AI trends 2025",
        "OpenAI latest research 2025",
        "Google DeepMind projects 2025",
        "Hugging Face new releases 2025",
        "Microsoft AI announcements 2025",
        "Meta AI trends 2025",
        "Hacker News top posts AI 2025",
        "arXiv trending AI papers 2025",
        "TechCrunch AI startups 2025"
    ]

    combined_results = ""
    with DDGS() as ddgs:
        for query in sources:
            combined_results += f"Search: {query}\n"
            try:
                # Get search results using the new ddgs package
                search_results = ddgs.text(query, max_results=3)
                for result in search_results:
                    combined_results += f"Title: {result.get('title', '')}\n"
                    combined_results += f"Body: {result.get('body', '')}\n"
                    combined_results += f"URL: {result.get('href', '')}\n"
            except Exception as e:
                # If search fails, continue with other sources
                combined_results += f"Search failed for: {query}\n"
            combined_results += "\n\n"

    prompt = f"""
        You are a senior technical content strategist tasked with building a blog editorial plan for 2025.

        From the research below, generate a list of **15 high-quality blog or whitepaper topic ideas** across AI, software engineering, and the tech business landscape.

        Group them into 3 categories:
        **[Trending Now]**, **[Needs Explanation]**, **[Thought Leadership]**

        For each topic, provide:
        1. **Title**
        2. **2–3 sentence summary**
        3. **Suggested angle**
        4. **Intended audience**

        ===== START OF RAW SOURCE MATERIAL =====
        {combined_results}
        ===== END OF RAW SOURCE MATERIAL =====
    """

    result = llm.invoke([{"role": "user", "content": prompt}])
    return result.content

def parse_topics_from_text(content: str):
    """Parse topics from generated content"""
    topics = []
    current_category = ""
    lines = content.split('\n')
    current_topic = {}
    topic_count = 0

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if line.startswith('**[') and line.endswith(']**'):
            current_category = line.strip('*[]')
            continue

        if re.match(r'^\d+\.', line):
            if current_topic:
                current_topic['category'] = current_category
                topics.append(current_topic)
                current_topic = {}

            topic_count += 1
            current_topic['number'] = topic_count
            
            # Extract clean title by removing numbering and formatting
            title_match = re.match(r'^\d+\.\s*(.*)', line)
            if title_match:
                # Clean up the title by removing markdown formatting
                clean_title = title_match.group(1)
                # Remove **Title:** prefix if present (more robust pattern)
                clean_title = re.sub(r'^\*\*Title:\*\*\s*', '', clean_title)
                clean_title = re.sub(r'^\*\*Title:\s*', '', clean_title)
                clean_title = re.sub(r'^\*\*Title\*\*:\s*', '', clean_title)
                # Remove quotes if present
                clean_title = re.sub(r'^["""](.*?)["""]$', r'\1', clean_title)
                clean_title = re.sub(r'^["""](.*?)["""]$', r'\1', clean_title)
                # Clean up any remaining markdown
                clean_title = re.sub(r'^\*\*', '', clean_title)
                clean_title = re.sub(r'\*\*$', '', clean_title)
                # Strip whitespace
                clean_title = clean_title.strip()
                current_topic['title'] = clean_title
            else:
                current_topic['title'] = line
            current_topic['details'] = []
        elif current_topic:
            current_topic['details'].append(line)

    if current_topic:
        current_topic['category'] = current_category
        topics.append(current_topic)

    return topics

def select_topic_by_number(topics: list, selection: int):
    """Select a topic by number from the parsed topics"""
    
    if 1 <= selection <= len(topics):
        selected_topic = topics[selection - 1]
        
        # Ensure we have clean data
        clean_title = selected_topic['title'].strip()
        clean_details = '\n'.join(selected_topic['details']).strip()
        
        return {
            'title': clean_title,
            'category': selected_topic['category'],
            'details': clean_details
        }
    else:
        return None
