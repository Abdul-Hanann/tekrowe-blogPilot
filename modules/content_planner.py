
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
llm = ChatOpenAI(model="gpt-4o", temperature=0.6, openai_api_key=OPENAI_API_KEY)

def read_selected_topic():
    path = "output/selected_topic.txt"
    if not os.path.exists(path):
        print("[!] selected_topic.txt not found.")
        return None
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def generate_content_plan(selected_topic_text):
    raw_content_planner_prompt = f"""
<optimized_prompt>
    <role>You are a highly analytical and expert Technical Content Strategist. Your primary goal is to create detailed, profoundly researched, and extensive content plans for technical blogs that are exceptionally informative, practical, and engaging for a professional technical audience. You must ensure the plan explicitly outlines the deepest technical insights required, integrates compelling real-world examples and statistics, and strictly avoids any 'essay-like' or overly narrative structures.</role>

    <instructions>
        <task>Given the blog topic provided in `selected_topic.txt`, generate a comprehensive, deeply researched, and extensive content plan. This plan must prioritize technical accuracy, practical application, and actionable insights, ensuring all key technical aspects are covered in profound depth. It must also incorporate relevant, impactful examples and verifiable statistics gathered through internet research.</task>
        
        <rules_for_technical_validity>
            1. All claims, statistics, and examples must be backed by **verifiable sources** — include source title, author/publisher, publish date, URL, and date accessed.
            2. Use **current information** — if the field evolves quickly, prioritize sources from the last 12 months.
            3. Clearly differentiate between:
               - Established facts vs. emerging/experimental work
               - Your own synthesis vs. cited material
            4. For each technical claim, specify:
               - The **metric(s)** involved (formula, unit, baseline comparison)
               - The **context** (dataset, environment, constraints)
            5. Include at least one **real-world case study** with measurable results for every major section.
            6. Mention **industry standards, protocols, or benchmarks** relevant to the topic (e.g., ISO, IEEE, RFC, MLPerf).
            7. Identify **risks, limitations, and edge cases** where the approach may fail.
            8. If there are conflicting sources, document both views and the reason for the discrepancy.
        </rules_for_technical_validity>

        <think_process>
            <step>1. Read and thoroughly understand the blog topic from `selected_topic.txt`.</step>
            <step>2. Conduct in-depth research using internet search tools on the core technical problem or concept. Gather comprehensive, up-to-date information, **relevant examples**, and **verifiable statistics** that can support and illustrate technical points effectively.</step>
            <step>3. Identify all key technical details, algorithms, architectures, datasets, evaluation methods, relevant technologies, and precise terminology that *must* be included. Ensure all are current and authoritative.</step>
            <step>4. Select specific, detailed, and compelling **real-world examples** and **case studies**. Include measurable benchmarks and performance data.</step>
            <step>5. Map all content to a logical, section-based structure that builds from foundational to advanced concepts, avoiding generic narrative arcs.</step>
            <step>6. For each section, list:
                - Technical questions answered
                - Exact technical concepts explained
                - Related algorithms/frameworks/libraries
                - Required diagrams/tables
                - Benchmarks or metrics
                - Cited sources
            </step>
        </think_process>

        <output_format>
            <section_title>Blog Title Idea(s):</section_title>
            <section_title>Target Audience:</section_title>
            <section_title>Key Technical Takeaways (What the reader *must* learn and be able to do, with supporting examples and stats):</section_title>
            <section_title>Structure:</section_title>
            <subsection_title>1. Introduction (Define the technical problem/topic and scope; set expectation for depth and data-driven detail)</subsection_title>
            <subsection_title>2. Core Technical Section 1 (Fundamental technical concept with theory, components, architecture diagrams, and benchmarked examples)</subsection_title>
            <subsection_title>3. Core Technical Section 2 (Advanced aspect with comparative analysis, algorithms, evaluation metrics, trade-offs, and case studies)</subsection_title>
            <subsection_title>4. Practical Application/Use Case (Step-by-step implementation, including architecture, datasets, KPIs, and measured outcomes)</subsection_title>
            <subsection_title>5. Conclusion (Summarize technical learnings, highlight limitations, and propose future directions)</subsection_title>
            <section_title>Mandatory Technical Inclusions:</section_title>
            - Named algorithms, frameworks, and models (with version/year)
            - Detailed architecture diagrams and/or flowcharts
            - Performance benchmarks with metrics, units, and baselines
            - Relevant datasets and evaluation protocols
            - Industry standards and compliance considerations
            - Risks, limitations, and failure scenarios
            - At least one real-world, verifiable case study per major section
            <section_title>Avoid:</section_title>
            - Overly abstract or generic statements without source or metric
            - Unverified claims or outdated stats
            - High-level overviews without actionable detail
            - Code snippets without explanation
        </output_format>
    </instructions>

    <input_data>
        <topic_from_file>
            {selected_topic_text}
        </topic_from_file>
    </input_data>

    <context>
        <blog_purpose>The blog must deliver innovative, credible, and deeply technical insights to our target audience, demonstrating domain authority and enabling readers to apply knowledge in real-world technical scenarios.</blog_purpose>
    </context>
</optimized_prompt>
"""

    return llm.invoke([{"role": "user", "content": raw_content_planner_prompt}]).content

def run():
    selected = read_selected_topic()
    if not selected:
        return
    print("[~] Generating content plan...")
    plan = generate_content_plan(selected)
    os.makedirs("output", exist_ok=True)
    out_path = "output/content_plan.txt"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("RESEARCHED CONTENT PLAN\n" + "=" * 60 + "\n\n")
        f.write(plan)
    print(f"[✓] Content plan saved to {out_path}")

if __name__ == "__main__":
    run()