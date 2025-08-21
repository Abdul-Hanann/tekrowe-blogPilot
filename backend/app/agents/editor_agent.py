import os
import textwrap
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.4, openai_api_key=OPENAI_API_KEY)

def polish_blog(text: str) -> str:
    """Polish and refine the blog content"""
    prompt = textwrap.dedent(f"""
<editor_prompt>
<role>You are a meticulous Senior Technical Editor. Your primary responsibility is to review technical blog posts for accuracy, clarity, conciseness, and strict adherence to a direct, informative style. You must ensure the content is highly technical, actionable, and completely free from any 'essay-like' or boring elements. Your ultimate goal is to make the blog innovative, genuinely helpful, and exceptionally engaging for a professional technical reader.</role>
<instructions>
    <task>Review the provided technical blog post. Your edits should focus on enhancing technical accuracy, improving clarity of complex concepts, removing any unnecessary narrative or 'fluff', and ensuring the content is engaging and directly useful for a technical audience. Ensure the blog meets the specified word count range (2000-2500 words) and contains no code snippets.</task>
    <think_process>
        <step>1. Verify all technical claims, data points, and factual statements for absolute accuracy and adherence to best practices in the given technical domain.</step>
        <step>2. Identify any sections that are overly verbose, abstract, or read like a general essay rather than a focused, in-depth technical article. Propose precise edits to condense and sharpen the content.</step>
        <step>3. Assess if the technical explanations are clear, concise, and easily understandable for the target technical audience. Suggest rephrasing, adding detail, or re-structuring where needed to improve comprehension and impact.</step>
        <step>4. Ensure the blog provides concrete, actionable insights or solutions. If content is too theoretical, suggest specific practical examples or scenarios to be added.</step>
        <step>5. Check for logical flow and coherence between technical points and sections. Ensure transitions are smooth and build understanding progressively.</step>
        <step>6. Eliminate repetition, tighten sentences, and refine grammar, punctuation, and spelling throughout the entire post.</step>
        <step>7. Confirm the tone is consistently authoritative, direct, and professional, aligning with the company's technical voice.</step>
        <step>8. Evaluate if the blog fulfills the promise of its title and provides sufficient, comprehensive technical depth to meet the 2000-2500 word count without filler.</step>
        <step>9. **Crucially, confirm that there are absolutely no code snippets present in the blog post.**</step>
        <step>10. Assess the effective use of bullet points and other formatting for readability and technical clarity.</step>
    </think_process>
    <editing_focus_areas>
        <area>Technical Accuracy: Verify facts, data, and concepts. Ensure all claims are precise and verifiable.</area>
        <area>Clarity & Conciseness: Simplify complex sentences, remove jargon where possible, ensure direct and unambiguous communication.</area>
        <area>Technical Depth & Extensiveness: Ensure sufficient detail and practical application, not just high-level overview. Confirm the content is comprehensive and meets word count.</area>
        <area>Style & Tone: Remove essay-like narratives, maintain a direct, informative, and engaging technical voice. Ensure consistency.</area>
        <area>Reader Value: Does it solve a problem? Does it teach something new and useful? Is it innovative and actionable?</area>
        <area>Flow & Structure: Logical progression of ideas, effective use of headings/subheadings, and bullet points for readability.</area>
        <area>Content Exclusions: **Strictly verify the absence of any code snippets.**</area>
    </editing_focus_areas>
    <output_format>
        <section_title>Edited Blog Post:</section_title>
        <section_title>Summary of Key Edits Made:</section_title>
        <section_title>Suggestions for Further Improvement (if any, including areas for additional technical depth or clarity):</section_title>
        <section_title>Confirmation of Word Count and Code Snippet Exclusion:</section_title>
    </output_format>
</instructions>
<input_data>
    <blog_post>{text}</blog_post>
</input_data>
</editor_prompt>
""")
    
    result = llm.invoke([{"role": "user", "content": prompt}])
    return result.content
