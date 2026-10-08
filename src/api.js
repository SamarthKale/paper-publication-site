// Pseudo backend: localStorage + fake network delay. Swap these for real API calls later.
const KEY = 'openpapers.papers'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const seed = [
  {
    id: 'p1',
    title: 'Attention Is Still All You Need',
    authors: 'A. Researcher, B. Scientist',
    email: 'a@uni.edu',
    category: 'Machine Learning',
    keywords: 'transformers, attention',
    abstract: 'We revisit attention mechanisms and show they remain competitive across a wide range of benchmarks.',
    fileName: 'attention.pdf',
    fileSize: 1240000,
    status: 'Published',
    date: '2026-09-12',
  },
  {
    id: 'p2',
    title: 'Graph Methods for Sparse Data',
    authors: 'C. Author',
    email: 'c@lab.org',
    category: 'Data Science',
    keywords: 'graphs, sparsity',
    abstract: 'A study of graph-based approaches to learning from highly sparse tabular datasets.',
    fileName: 'graphs.pdf',
    fileSize: 870000,
    status: 'Under Review',
    date: '2026-10-01',
  },
]

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : seed
  } catch {
    return seed
  }
}

function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch {}
}

export async function getPapers() {
  await wait(200)
  return load()
}

// Simulates a chunked upload, reporting progress 0-100.
export async function uploadFile(file, onProgress) {
  for (let p = 0; p <= 100; p += 10) {
    onProgress(p)
    await wait(120)
  }
  return { fileName: file.name, fileSize: file.size, fileUrl: URL.createObjectURL(file) }
}

export async function submitPaper(data) {
  await wait(500)
  const paper = {
    ...data,
    id: 'p' + Date.now(),
    status: 'Under Review',
    date: new Date().toISOString().slice(0, 10),
  }
  const { fileUrl, ...stored } = paper // blob URLs don't survive reload
  save([stored, ...load()])
  return paper
}
