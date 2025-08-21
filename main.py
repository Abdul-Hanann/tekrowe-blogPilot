# main.py
import subprocess
import sys
import os


AGENTS = [
    ("topic_generator.py",   "Topic Generator & Selector"),
    ("content_planner.py",   "Content Planner"),
    ("writer_agent.py",      "Writer"),
    ("editor_agent.py",      "Editor"),
    ("seo_optimizer_agent.py", "SEO Optimizer"),
    # ("image_agent.py", "Image & DOCX Generator"),
]

def run_agent(script, label):
    print(f"\nRunning: {label}")
    # Ensure we run the agent script from the `modules/` folder so imports and relative paths behave
    repo_root = os.path.dirname(os.path.abspath(__file__))
    script_path = os.path.join(repo_root, "modules", script)
    result = subprocess.run([sys.executable, script_path], cwd=repo_root)
    if result.returncode != 0:
        print(f"{label} failed. Exiting.")
        sys.exit(1)
    print(f"{label} complete")

if __name__ == "__main__":
    # Ensure output directory exists at the repository root (not inside modules/)
    repo_root = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.join(repo_root, "output")
    os.makedirs(out_dir, exist_ok=True)

    for script, label in AGENTS:
        run_agent(script, label)

    print("\nPipeline finished. Check the 'output/' folder at the repository root for outputs.")
