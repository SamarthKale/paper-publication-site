import { useEffect, useState } from 'react'
import { getPapers, submitPaper, uploadFile } from './api.js'

const CATEGORIES = ['Machine Learning', 'Data Science', 'Computer Vision', 'NLP', 'Systems', 'Other']
const MAX_MB = 20

function useHashRoute() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || '/')
  useEffect(() => {
    const on = () => setRoute(window.location.hash.slice(1) || '/')
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

const fmtSize = (b) => (b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1e3) + ' KB')

export default function App() {
  const route = useHashRoute()
  const [papers, setPapers] = useState(null)

  const refresh = () => getPapers().then(setPapers)
  useEffect(() => { refresh() }, [])

  let page
  if (route === '/submit') page = <Submit onDone={refresh} />
  else if (route.startsWith('/paper/')) page = <Paper paper={papers?.find((p) => p.id === route.slice(7))} />
  else page = <Home papers={papers} />

  return (
    <>
      <header className="nav">
        <a href="#/" className="brand">OpenPapers</a>
        <nav>
          <a href="#/" className={route === '/' ? 'active' : ''}>Browse</a>
          <a href="#/submit" className="btn">Submit Paper</a>
        </nav>
      </header>
      <main>{page}</main>
      <footer>© {new Date().getFullYear()} OpenPapers · Demo mode (data stored in your browser)</footer>
    </>
  )
}

function Home({ papers }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')
  if (!papers) return <p className="muted">Loading…</p>

  const list = papers.filter(
    (p) =>
      (cat === 'All' || p.category === cat) &&
      (p.title + p.authors + p.keywords).toLowerCase().includes(q.toLowerCase())
  )

  return (
    <>
      <section className="hero">
        <h1>Publish your research.</h1>
        <p>Open, fast, peer-reviewed paper publication.</p>
        <a href="#/submit" className="btn big">Submit a paper</a>
      </section>
      <div className="filters">
        <input placeholder="Search title, author, keyword…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option>All</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="grid">
        {list.map((p) => (
          <a key={p.id} href={`#/paper/${p.id}`} className="card">
            <div className="row">
              <span className="tag">{p.category}</span>
              <span className={`status ${p.status === 'Published' ? 'ok' : ''}`}>{p.status}</span>
            </div>
            <h3>{p.title}</h3>
            <p className="muted">{p.authors}</p>
            <p className="abs">{p.abstract}</p>
            <small className="muted">{p.date}</small>
          </a>
        ))}
        {list.length === 0 && <p className="muted">No papers found.</p>}
      </div>
    </>
  )
}

function Paper({ paper }) {
  if (!paper) return <p className="muted">Paper not found. <a href="#/">Back</a></p>
  return (
    <article className="paper">
      <a href="#/" className="muted">← Back</a>
      <span className="tag">{paper.category}</span>
      <h1>{paper.title}</h1>
      <p><strong>{paper.authors}</strong> · {paper.date} · <span className="status">{paper.status}</span></p>
      <h3>Abstract</h3>
      <p>{paper.abstract}</p>
      {paper.keywords && <p className="muted">Keywords: {paper.keywords}</p>}
      <div className="file">📄 {paper.fileName} ({fmtSize(paper.fileSize)})</div>
    </article>
  )
}

const empty = { title: '', authors: '', email: '', category: CATEGORIES[0], keywords: '', abstract: '' }

function Submit({ onDone }) {
  const [form, setForm] = useState(empty)
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [errors, setErrors] = useState({})
  const [state, setState] = useState('idle') // idle | uploading | submitting | done
  const [result, setResult] = useState(null)
  const [drag, setDrag] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const pickFile = (f) => {
    if (!f) return
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf'))
      return setErrors({ ...errors, file: 'Only PDF files are allowed.' })
    if (f.size > MAX_MB * 1e6) return setErrors({ ...errors, file: `Max ${MAX_MB} MB.` })
    setErrors({ ...errors, file: null })
    setFile(f)
  }

  const validate = () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Required'
    if (!form.authors.trim()) e.authors = 'Required'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Valid email required'
    if (form.abstract.trim().length < 50) e.abstract = 'At least 50 characters'
    if (!file) e.file = 'Please upload your manuscript (PDF)'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setState('uploading')
    const uploaded = await uploadFile(file, setProgress)
    setState('submitting')
    const paper = await submitPaper({ ...form, ...uploaded })
    setResult(paper)
    setState('done')
    onDone()
  }

  const reset = () => { setForm(empty); setFile(null); setProgress(0); setErrors({}); setState('idle') }

  if (state === 'done')
    return (
      <div className="success">
        <h2>✅ Submission received</h2>
        <p>Your paper <strong>{result.title}</strong> is now <em>Under Review</em>.</p>
        <p className="muted">Submission ID: {result.id}</p>
        <div className="row gap">
          <a className="btn" href={`#/paper/${result.id}`}>View paper</a>
          <button className="btn ghost" onClick={reset}>Submit another</button>
        </div>
      </div>
    )

  const busy = state !== 'idle'
  return (
    <form className="form" onSubmit={submit} noValidate>
      <h1>Submit a Paper</h1>
      <Field label="Title *" error={errors.title}><input value={form.title} onChange={set('title')} /></Field>
      <div className="two">
        <Field label="Authors *" error={errors.authors}><input placeholder="Comma separated" value={form.authors} onChange={set('authors')} /></Field>
        <Field label="Corresponding email *" error={errors.email}><input type="email" value={form.email} onChange={set('email')} /></Field>
      </div>
      <div className="two">
        <Field label="Category">
          <select value={form.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
        <Field label="Keywords"><input placeholder="e.g. deep learning, vision" value={form.keywords} onChange={set('keywords')} /></Field>
      </div>
      <Field label={`Abstract * (${form.abstract.length} chars)`} error={errors.abstract}>
        <textarea rows={6} value={form.abstract} onChange={set('abstract')} />
      </Field>

      <Field label="Manuscript (PDF) *" error={errors.file}>
        <label
          className={`drop ${drag ? 'drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files[0]) }}
        >
          <input type="file" accept="application/pdf,.pdf" hidden onChange={(e) => pickFile(e.target.files[0])} />
          {file
            ? <span>📄 {file.name} ({fmtSize(file.size)})</span>
            : <span>Drag &amp; drop PDF here or <u>browse</u> (max {MAX_MB} MB)</span>}
        </label>
      </Field>

      {busy && (
        <div className="progress">
          <div style={{ width: progress + '%' }} />
          <span>{state === 'uploading' ? `Uploading ${progress}%` : 'Submitting…'}</span>
        </div>
      )}
      <button className="btn big" disabled={busy}>{busy ? 'Please wait…' : 'Submit for review'}</button>
    </form>
  )
}

function Field({ label, error, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {error && <span className="err">{error}</span>}
    </div>
  )
}
