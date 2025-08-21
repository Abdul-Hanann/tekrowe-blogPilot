import os
import re
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_community.tools import DuckDuckGoSearchRun

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7, openai_api_key=OPENAI_API_KEY)
search = DuckDuckGoSearchRun()

def generate_trending_topics():
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
    for query in sources:
        combined_results += f"Search: {query}\n"
        combined_results += search.run(query)
        combined_results += "\n\n"

    prompt = f"""
You are a senior technical content strategist tasked with building a blog editorial plan for 2025.

From the research below, generate a list of **20 high-quality blog or whitepaper topic ideas** across AI, software engineering, and the tech business landscape.

Group them into 3 categories:
**[Trending Now]**, **[Needs Explanation]**, **[Thought Leadership]**

For each topic, provide:
1. **Title**
2. **2–3 sentence summary**
3. **Suggested angle**
4. **Intended audience**

===== START OF RAW SOURCE MATERIAL =====
{combined_results}
===== END OF SOURCE MATERIAL =====
    """

    result = llm.invoke([{"role": "user", "content": prompt}])

    os.makedirs("output", exist_ok=True)
    with open("output/topics.txt", "w", encoding="utf-8") as f:
        f.write(result.content)

    print("[✓] Saved structured topic list to output/topics.txt")

def parse_topics_from_file():
    try:
        with open("output/topics.txt", "r", encoding="utf-8") as f:
            content = f.read()

        topics = []
        current_category = ""
        lines = content.split('\n')
        current_topic = {}

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

                current_topic['number'] = len(topics) + 1
                current_topic['title'] = line
                current_topic['details'] = []
            elif current_topic:
                current_topic['details'].append(line)

        if current_topic:
            current_topic['category'] = current_category
            topics.append(current_topic)

        return topics

    except FileNotFoundError:
        print("[!] Topics file not found. Please run generate_trending_topics() first.")
        return []

def select_topic():
    topics = parse_topics_from_file()
    if not topics:
        return

    print("\n=== AVAILABLE TOPICS ===")
    current_category = ""
    for i, topic in enumerate(topics, 1):
        if topic['category'] != current_category:
            current_category = topic['category']
            print(f"\n**[{current_category}]**")
        print(f"{i}. {topic['title'].split('.', 1)[-1].strip()}")

    try:
        choice = int(input("\nEnter the topic number you want to select: "))
        if 1 <= choice <= len(topics):
            selected_topic = topics[choice - 1]
            content = f"""SELECTED TOPIC FOR BLOG GENERATION
=====================================

Category: {selected_topic['category']}
Topic Number: {choice}

{selected_topic['title']}

{chr(10).join(selected_topic['details'])}

=====================================
Ready for next agent processing.
"""
            os.makedirs("output", exist_ok=True)
            with open("output/selected_topic.txt", "w", encoding="utf-8") as f:
                f.write(content)

            print(f"[✓] Selected topic #{choice} saved to output/selected_topic.txt")
        else:
            print(f"[!] Invalid choice. Please enter a number between 1 and {len(topics)}")

    except ValueError:
        print("[!] Invalid input.")
    except KeyboardInterrupt:
        print("\n[!] Selection cancelled.")

def run():
    generate_trending_topics()
    select_topic()

if __name__ == "__main__":
    run()
