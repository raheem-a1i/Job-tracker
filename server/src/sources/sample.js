// Offline sample source — a small realistic dataset so the whole pipeline
// (scrape → extract → analytics → dashboard) runs with zero network access.
import { makeId, truncate } from './util.js';

export const name = 'sample';

const RAW = [
  {
    title: 'Senior Frontend Engineer',
    company: 'Northwind Labs',
    location: 'Remote (US)',
    postedAt: '2026-06-15',
    salaryRaw: '$150,000 - $185,000',
    tags: ['react', 'typescript'],
    description:
      'We are hiring a Senior Frontend Engineer to build our design system in React and TypeScript. You will work with Next.js, GraphQL, and Tailwind CSS. 6+ years of experience required. Salary $150,000-$185,000.',
  },
  {
    title: 'Backend Engineer (Go)',
    company: 'Cobalt Systems',
    location: 'Remote (EU)',
    postedAt: '2026-06-14',
    salaryRaw: '€80k-€110k',
    tags: ['golang', 'kubernetes'],
    description:
      'Backend Engineer to design microservices in Go. Experience with Kubernetes, PostgreSQL, gRPC and AWS required. We value clean APIs and observability. Compensation €80,000-€110,000.',
  },
  {
    title: 'Machine Learning Engineer',
    company: 'Vertex AI Co',
    location: 'Remote',
    postedAt: '2026-06-13',
    salaryRaw: '$170,000 - $210,000',
    tags: ['python', 'pytorch', 'llm'],
    description:
      'ML Engineer to ship LLM-powered features. Strong Python, PyTorch, and experience with vector databases and RAG pipelines. Familiarity with AWS SageMaker and MLOps a plus. $170k-$210k.',
  },
  {
    title: 'DevOps Engineer',
    company: 'Pipeline Cloud',
    location: 'Remote (Global)',
    postedAt: '2026-06-12',
    salaryRaw: '',
    tags: ['terraform', 'aws'],
    description:
      'DevOps Engineer with Terraform, AWS, Docker and CI/CD (GitHub Actions). You will own infrastructure as code and improve our Kubernetes platform. 4+ years experience.',
  },
  {
    title: 'Full Stack Developer',
    company: 'Brightside',
    location: 'Remote (US)',
    postedAt: '2026-06-11',
    salaryRaw: '$120,000 - $150,000',
    tags: ['node', 'react'],
    description:
      'Full Stack Developer fluent in Node.js, React, and PostgreSQL. Bonus for TypeScript and Docker. Mid-level role, 3-5 years experience. $120k-$150k.',
  },
  {
    title: 'Data Engineer',
    company: 'Streamline Data',
    location: 'Remote (EU)',
    postedAt: '2026-06-10',
    salaryRaw: '$130,000 - $160,000',
    tags: ['python', 'spark'],
    description:
      'Data Engineer to build ETL pipelines with Python, Apache Spark, Airflow and Snowflake. SQL mastery required. Experience with dbt and Kafka preferred. $130k-$160k.',
  },
  {
    title: 'Junior Software Engineer',
    company: 'Acorn Tech',
    location: 'Remote (US)',
    postedAt: '2026-06-09',
    salaryRaw: '$85,000 - $105,000',
    tags: ['javascript', 'react'],
    description:
      'Junior Software Engineer — entry level. Learn JavaScript, React, and Node.js with mentorship. Some exposure to Git and REST APIs expected. $85k-$105k.',
  },
  {
    title: 'Staff Platform Engineer',
    company: 'Meridian',
    location: 'Remote (Global)',
    postedAt: '2026-06-08',
    salaryRaw: '$200,000 - $250,000',
    tags: ['kubernetes', 'go'],
    description:
      'Staff Platform Engineer to lead our internal developer platform. Deep Kubernetes, Go, Terraform and AWS experience. 10+ years. $200k-$250k.',
  },
  {
    title: 'Product Designer',
    company: 'Hue Studio',
    location: 'Remote (US)',
    postedAt: '2026-06-07',
    salaryRaw: '$110,000 - $140,000',
    tags: ['figma', 'design'],
    description:
      'Product Designer skilled in Figma, design systems and user research. You will partner with engineering on UX. 5 years experience. $110k-$140k.',
  },
  {
    title: 'Senior Data Scientist',
    company: 'Quanta',
    location: 'Remote',
    postedAt: '2026-06-06',
    salaryRaw: '$160,000 - $195,000',
    tags: ['python', 'ml'],
    description:
      'Senior Data Scientist with Python, pandas, scikit-learn and SQL. Experience deploying models and with LLMs is a strong plus. $160k-$195k.',
  },
  {
    title: 'Backend Engineer (Python)',
    company: 'Ledger Works',
    location: 'Remote (US)',
    postedAt: '2026-06-05',
    salaryRaw: '$135,000 - $165,000',
    tags: ['python', 'django'],
    description:
      'Backend Engineer using Python, Django, PostgreSQL and Redis. REST and GraphQL APIs. Docker and AWS deployment. 4+ years. $135k-$165k.',
  },
  {
    title: 'Cloud Security Engineer',
    company: 'Aegis',
    location: 'Remote (Global)',
    postedAt: '2026-06-04',
    salaryRaw: '$155,000 - $190,000',
    tags: ['security', 'aws'],
    description:
      'Cloud Security Engineer with AWS, Terraform, and Kubernetes hardening experience. Knowledge of SIEM, IAM and compliance. Python scripting. $155k-$190k.',
  },
];

export async function fetchJobs(limit = 80) {
  return RAW.slice(0, limit).map((j, i) => ({
    id: makeId(name, i + 1),
    source: name,
    title: j.title,
    company: j.company,
    location: j.location,
    url: '',
    postedAt: new Date(j.postedAt).toISOString(),
    salaryRaw: j.salaryRaw,
    tags: j.tags,
    description: truncate(j.description),
  }));
}
