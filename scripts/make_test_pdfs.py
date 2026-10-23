"""Generate a realistic test resume PDF + JD PDF to verify PDF parsing."""
from fpdf import FPDF


def make_pdf(title_lines: list[tuple[str, str]], path: str) -> None:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    for style, text in title_lines:
        pdf.set_font("Helvetica", style if style else "", 16 if style == "B" else 10)
        pdf.write(6.5, text + "\n")
    pdf.output(path)


resume_lines = [
    ("B", "Marcus Rodriguez\n"),
    ("", "Data Scientist | marcus.rodriguez@email.com | Austin, TX\n\n"),
    ("B", "EXPERIENCE\n"),
    ("", "Data Scientist @ HealthMetrics (2020-2024)\n"),
    ("", "- Built patient-risk prediction models (XGBoost, scikit-learn) improving early intervention rates 32%\n"),
    ("", "- Designed A/B testing framework used by 5 product teams, reducing experiment setup time 60%\n"),
    ("", "- Productionized ML pipelines on Airflow + SageMaker serving 400k predictions daily\n\n"),
    ("", "Junior Data Analyst @ RetailBoost (2018-2020)\n"),
    ("", "- Automated weekly reporting with Python and SQL, saving 12 analyst hours weekly\n"),
    ("", "- Built customer churn dashboard in Tableau adopted company-wide\n\n"),
    ("B", "SKILLS\n"),
    ("", "Python, R, SQL, PyTorch, XGBoost, Airflow, AWS SageMaker, MLflow, Tableau\n\n"),
    ("B", "EDUCATION\n"),
    ("", "M.S. Statistics, UT Austin, 2018\n"),
    ("", "B.S. Mathematics, Texas A&M, 2016\n"),
]

jd_lines = [
    ("B", "Senior Data Scientist - Growth\n"),
    ("", "Series B SaaS company | Remote (US)\n\n"),
    ("B", "About the role\n"),
    ("", "Own the experimentation and growth modeling roadmap. Partner with product to drive activation and retention through data.\n\n"),
    ("B", "Requirements\n"),
    ("", "- 4+ years in data science with strong Python\n"),
    ("", "- Deep experience with experimentation / A/B testing at scale\n"),
    ("", "- ML production experience (any cloud stack)\n"),
    ("", "- Advanced SQL and data modeling\n"),
    ("", "- Clear communication with executives\n\n"),
    ("B", "Nice to have\n"),
    ("", "- Growth or subscription analytics, Bayesian experimentation\n"),
]

make_pdf(resume_lines, "/tmp/test-resume.pdf")
make_pdf(jd_lines, "/tmp/test-jd.pdf")
print("test PDFs written")
