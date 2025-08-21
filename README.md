# Blog Automation

An AI-powered multi-agent system for fully automated blog creation, from topic selection to SEO optimization. Built with LangChain, advanced LLMs, and web search tools.

## Project Structure

```
ai-blog-automation/
├── module/
│   ├── topic_agent.py          # Selects trending & relevant topics
│   ├── content_planner.py      # Plans blog structure & gathers research
│   ├── writer_agent.py         # Writes draft blog content
│   ├── editor_agent.py         # Improves clarity, grammar, and flow
│   ├── seo_optimizer.py        # SEO-optimizes titles, slugs, and metadata
├── output/
│   ├── topics.txt              # Generated topics
│   ├── content_plan.txt        # Blog outline & sources
│   ├── draft.md                # Raw drafted blog
│   ├── clean.md                # Edited, final blog content
│   ├── blog_seo.md             # SEO-optimized version
│   ├── final_blog.docx         # Converts Markdown → DOCX
├── main.py                     # Entry point to run automation pipeline
├── .env.example                # Environment variables
├── requirements.txt            # Python package dependencies
├── README.md                   # Project documentation

```

## What this project does

The project runs a sequence of small agents located in `blog_automation/`:

- `topic_generator.py` — gathers research and generates a list of topics, then lets you choose one.
- `content_planner.py` — builds a detailed, research-backed content plan from the chosen topic.
- `writer_agent.py` — produces an in-depth blog draft from the content plan using an LLM.
- `editor_agent.py` — refines the draft into a clean final version.
- `seo_optimizer_agent.py` — produces an optimized version of the blog for SEO.

The orchestrator is `main.py`, which runs those agents in sequence.

## Requirements

- Python 3.10+ recommended.
- Internet access (agents call external LLM/search services).
- An OpenAI-compatible API key (exported in `.env` as `OPENAI_API_KEY`).


Note: this project imports `langchain_openai` and `langchain_community.tools.DuckDuckGoSearchRun` in the agent files. Depending on your environment you may need the respective packages or custom wrappers. If you use a virtual environment, install packages there.


## How to Run (Local Setup)

```bash
# Clone the repository
git clone https://github.com/your-repo/ai-blog-automation.git
cd ai-blog-automation

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
nano .env  # Update API keys & settings

# Run automation pipeline
python main.py

```

## Files produced

- `blog_automation/topics.txt` — structured topic list.
- `blog_automation/selected_topic.txt` — the chosen topic block used for planning.
- `blog_automation/content_plan.txt` — researched and structured content plan.
- `blog_automation/blog_draft.md` — the generated draft blog post.
- `blog_automation/blog_final.docx` — the final polished blog post.

## Environment & secrets

- Use `.env` to store `OPENAI_API_KEY`.
- Do not hardcode secrets in scripts.
- If running CI, inject the key via secure environment variables rather than committing `.env`.

## Customization

- Adjust model choice and temperature in the agent files where `ChatOpenAI` is instantiated (`topic_generator.py`, `content_planner.py`, `writer_agent.py`).
- `main.py` controls which agents run. Uncomment `image_agent.py` in `AGENTS` when ready.

## Safety & copyright

- The writer prompt requests original content and instructs the model to include sources for factual claims. The agents rely on the external LLM for research and content; verify any legal/medical/financial claims before publication.

## Development notes

- The code uses simple subprocess orchestration in `main.py`. You can also run each agent individually for debugging, e.g.: `python blog_automation\content_planner.py`.
- If you want to extend functionality (e.g., add a headless selection path), modify `topic_generator.py` to accept a CLI flag and write `selected_topic.txt` automatically.
