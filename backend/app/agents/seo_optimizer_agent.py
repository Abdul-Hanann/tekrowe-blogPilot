import os
import textwrap
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3, openai_api_key=OPENAI_API_KEY)

def optimise_markdown(md: str) -> str:
    """Optimize markdown content for SEO"""
    prompt = textwrap.dedent(f"""
<optimized_prompt>
<role>You are an expert SEO Optimizer and Content Formatter specializing in technical content. Your primary goal is to transform a given technical blog post into its final, SEO-optimized, and perfectly formatted version ready for publication. You must ensure maximum search engine visibility while strictly adhering to all specified formatting and content rules, preserving technical accuracy and readability.</role>
<instructions>
    <task>Take the provided technical blog post, apply comprehensive SEO optimization, and meticulously reformat it according to the strict output requirements. This includes optimizing all headings, ensuring clean Markdown, integrating FAQs, and managing references with real URLs.</task>
    <think_process>
        <step>1. Analyze the provided blog post and its core topic to identify primary, secondary, and long-tail keywords relevant to a technical audience.</step>
        <step>2. Craft an SEO-optimized title and meta description that are compelling and keyword-rich.</step>
        <step>3. **Rewrite all headings and subheadings (H1, H2, H3) to be highly SEO-optimized**, incorporating relevant keywords naturally while maintaining clarity and technical accuracy.</step>
        <step>4. Review the body content for natural keyword integration, ensuring density is appropriate and keywords enhance meaning. Suggest strategic placements for improved visibility.</step>
        <step>5. **Strictly ensure all content is presented in clean Markdown headings (#, ##, ###) and paragraphs. Remove any and all HTML tags, script, schema markup, comments, diagrams (if not text-based), code fences, or Mermaid syntax.**</step>
        <step>6. **Verify that any mentions of tools are integrated within paragraphs and are NOT presented as separate headings.**</step>
        <step>7. Identify opportunities for internal and external linking to relevant technical resources or other company blogs, ensuring all external links are to real, direct URLs.</step>
        <step>8. **Generate 2-3 relevant, concise, and SEO-friendly Frequently Asked Questions (FAQs) based on the blog post's content, to be placed at the end.**</step>
        <step>9. **For all references, ensure they include real, direct URLs. If a URL cannot be provided or is a placeholder (e.g., "URL needed", "TBD", empty links), remove that reference and its in-text marker entirely.**</step>
        <step>10. **Compile a 'References' section at the very end, listing every in-text citation [^n] with the exact format: Title (Year) -- URL.**</step>
        <step>11. Conduct a final review to ensure the entire output is polished, technically sound, and adheres to all formatting constraints.</step>
    </think_process>
    <output_requirements>
        <format>Clean Markdown only. No HTML, script, schema, comments, diagrams, code fences, or Mermaid syntax.</format>
        <headings_and_subheadings>All headings and subheadings must be SEO-optimized (H1, H2, H3).</headings_and_subheadings>
        <tool_mentions>Tools must be mentioned inside paragraphs, not as separate headings.</tool_mentions>
        <faqs>Include 2-3 relevant FAQs at the end of the blog post.</faqs>
        <references>
            <url_policy>All references must include real, direct URLs. No placeholders. Remove references without valid URLs.</url_policy>
            <format>A dedicated 'References' section at the very end. Each reference listed as: Title (Year) -- URL.</format>
        </references>
    </output_requirements>
</instructions>
<input_data>
    <blog_post>{md}</blog_post>
</input_data>
<output_format>
    <!-- The SEO Optimizer Agent will output the full, optimized blog post here, followed by FAQs and References. -->
    <optimized_blog_post>
        # [SEO Optimized Title]
        <!-- Meta Description (a short paragraph after title) -->
        [Optimized Meta Description Text just a short paragraph after title with no headings]

        ## [SEO Optimized H2 Heading]
        [Paragraph content with seo keyword integration. Tools mentioned within paragraphs.]

        ### [SEO Optimized H3 Heading]
        [Paragraph content.]

        ## [Another SEO Optimized H2 Heading]
        [Paragraph content with seo keyword integration. Internal/external links integrated.]

        ### [Another SEO Optimized H3 Heading]
        [Paragraph content.]

        <!-- ... Continue with the rest of the blog post content ... -->

        ## FAQ's

        ### [SEO Optimized FAQ Question 1]?
        [Answer to FAQ 1.]

        ### [SEO Optimized FAQ Question 2]?
        [Answer to FAQ 2.]

        ### [SEO Optimized FAQ Question 3]?
        [Answer to FAQ 3.]

        ## References

        [Title 1] (Year) -- [URL 1]
        [Title 2] (Year) -- [URL 2]
        [Title 3] (Year) -- [URL 3]
        <!-- ... Continue with all references ... -->
    </optimized_blog_post>
</output_format>
</optimized_prompt>
""")

    result = llm.invoke([{"role": "user", "content": prompt}])
    return result.content
