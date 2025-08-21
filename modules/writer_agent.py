

"""
Writer Agent – produces a deep, structured, technical blog from the plan
"""

import os
import textwrap
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
llm = ChatOpenAI(model="gpt-4o", temperature=0.7, openai_api_key=OPENAI_API_KEY)

def read_content_plan():
    path = "output/content_plan.txt"
    if not os.path.exists(path):
        print("[!] content_plan.txt not found. Run the planner first.")
        return None
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def generate_blog_draft(plan_text: str) -> str:
    raw_writer_agent_prompt = f"""
<writer_prompt>
    <role>
        You are a highly skilled Senior Technical Writer with expertise in translating complex technical concepts into clear, concise, and engaging blog posts for a professional audience.
        Your goal is to emulate the writing style, structure, tone, and formatting conventions shown in the provided examples -- not to copy their content or ideas.
        All content must be original and based solely on the provided topic and content plan. You are to write an extensive and comprehensive blog post.
    </role>

    <instructions>
        <task>
            Write a comprehensive, in-depth technical blog post based on the provided content plan and topic.
            The post should be technically accurate, detailed, and directly address all points in the plan.
            Integrate practical scenarios, relevant data points, and detailed explanations where useful.
            **Crucially, the final blog post must be between 3000 and 3500 words, and must NOT include any actual code snippets.**
            **The post must also include at least one mini case study (detailing who, when, context, metric, baseline, and impact) and one implementation blueprint (data → model → evaluate → ship with roles, time, and checkpoints).**
        </task>

        <think_process>
            <step>1. Understand the target audience’s technical proficiency and tailor explanations accordingly, providing profound deep dives into complex concepts.</step>
            <step>2. For each section of the content plan, extract the core technical message and decide how to present it most effectively and extensively.</step>
            <step>3. Ensure utmost clarity and precision in technical explanations. Use correct terminology and define it where necessary.</step>
            <step>4. Integrate detailed descriptions of concepts, practical scenarios, or described diagrams seamlessly to illustrate points, **without including actual code snippets or command-line interfaces.**</step>
            <step>5. Use a direct, problem-solution or how-to style. Avoid unnecessary storytelling or abstract discussion. Every section must contribute significant technical value and depth.</step>
            <step>6. Maintain logical flow between sections, building understanding step-by-step and ensuring a comprehensive narrative. **Ensure clear and concise subheadings are used throughout the blog post.**</step>
            <step>7. **For every concrete claim (stat %, date, $, benchmark, company name, standard), attach a source with: title, publisher, author, URL, publish date (YYYY-MM-DD), and access date. If evidence is mixed, say ‘Evidence unclear’ and show both sides. Never invent sources.**</step>
            <step>8. **If the topic is fast-moving (e.g., AI, security, policy, prices, product specs), include ≥3 reputable sources from the last 12 months. If historical, prioritize primary/landmark sources.**</step>
            <step>9. **Any number must include what/where/when/method. Prefer primary data over blog roundups.**</step>
            <step>10. **Expand each section with profound depth, detailed examples, and thorough elaboration to comprehensively reach the 3000-3500 word count target, ensuring all content is substantive and not filler.**</step>
            <step>11. **Identify a suitable real-world scenario to construct a mini case study. Ensure it clearly outlines 'who, when, context, metric, baseline, and impact' within a paragraph or structured prose, not using bullet points.**</step>
            <step>12. **Develop a comprehensive implementation blueprint (data → model → evaluate → ship). Describe each stage, specifying typical roles involved, estimated timeframes, and key checkpoints, presenting this information in clear, connected prose.**</step>
            <step>13. **Include limitations, risks, and counterarguments where appropriate. Flag legal/medical/financial content for disclaimers.**</step>
        </think_process>

        <style_and_tone>
            <tone>Authoritative, informative, direct, practical, engaging, and deeply analytical.</tone>
            <style>Concise sentences, active voice, clear, concise, and meaningful headings (H2/H3). **Absolutely no bullet points are to be used anywhere in the generated blog post.** Structured explanations are paramount.</style>
            <avoid>Flowery language, vague statements, long paragraphs without substance, personal anecdotes (unless illustrating a technical point), **and absolutely no actual code snippets or command-line interfaces, and no bullet points.**</avoid>
        </style_and_tone>

        <output_requirements>
            <format>Markdown for blog posts.</format>
            <inclusion>Follow all inclusions from the content plan (e.g., specific data points). **Strictly adhere to the exclusion of code snippets and bullet points.** **Must include at least one mini case study and one implementation blueprint, presented in prose.**</inclusion>
            <technical_depth>Deep, actionable insights for developers and engineers -- not just high-level overviews. Content must be comprehensive and well-researched.</technical_depth>
            <word_count_target>3000--3500 words.</word_count_target>
            <citation_style>
                **For every concrete claim (stat %, date, $, benchmark, company name, standard), attach a source with: title, publisher, author, URL, publish date (YYYY-MM-DD), and access date. If evidence is mixed, say ‘Evidence unclear’ and show both sides. Never invent sources.**
                **If the topic is fast-moving (e.g., AI, security, policy, prices, product specs), include ≥3 reputable sources from the last 12 months. If historical, prioritize primary/landmark sources.**
                **Any number must include what/where/when/method. Prefer primary data over blog roundups.**
            </citation_style>
            <headings>All headings and subheadings must be brief, meaningful, SEO-friendly, and consistently used to structure the content.</headings>
            <bias_and_safety>
                **Include limitations, risks, and counterarguments. Flag legal/medical/financial content for disclaimers.**
            </bias_and_safety>
        </output_requirements>
    </instructions>

    <input_data>
        <content_plan>{plan_text}</content_plan>
        <topic>{{{{BLOG_TOPIC}}}}</topic>
        <!-- Optional contextual variables for tailoring content -->
        <audience>{{audience}}</audience>
        <goal>{{goal}}</goal>
        <region>{{region}}</region>
        <timeframe>{{timeframe}}</timeframe>
        <tone>{{tone}}</tone>
    </input_data>

    <few_shot_examples>
        <note>
            Review these examples on the provided Medium URLs to learn their style, structure, tone, formatting, and how they integrate data and technical explanation.
            Do NOT reuse any sentences, paragraphs, or specific content from them.
        </note>

        <example_1>
            <title>How to Get Started with Generative AI</title>
            <source_url>https://medium.com/@Tekrowedigital/how-to-get-started-with-generative-ai-11c760389a02</source_url>
        </example_1>

        <example_2>
            <title>How AI is Transforming Fashion: Design, Production & Sales Optimization</title>
            <source_url>https://medium.com/@Tekrowedigital/how-ai-is-transforming-fashion-design-production-sales-optimization-ca78202dc3dd</source_url>
        </example_2>

        <example_3>
            <title>AI in SaaS: How Artificial Intelligence is Transforming Software as a Service</title>
            <source_url>https://medium.com/@Tekrowedigital/ai-in-saas-how-artificial-intelligence-is-transforming-software-as-a-service-e201447f708a</source_url>
        </example_3>

        <example_4>
            <title>Generative AI for Marketing: Transforming Content & Engagement</title>
            <source_url>https://medium.com/@Tekrowedigital/generative-ai-for-marketing-transforming-content-engagement-78743fe6ce1f</source_url>
        </example_4>
    </few_shot_examples>
</writer_prompt>
"""

    prompt = textwrap.dedent(raw_writer_agent_prompt)
    return llm.invoke(prompt).content

def run():
    plan = read_content_plan()
    if not plan:
        return
    print("[~] Drafting blog post…")
    draft = generate_blog_draft(plan)
    os.makedirs("output", exist_ok=True)
    out_path = "output/blog_draft.md"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(draft)
    print(f"[✓] Blog draft saved to {out_path}")

if __name__ == "__main__":
    run()