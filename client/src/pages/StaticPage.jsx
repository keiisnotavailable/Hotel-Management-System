import { Link } from 'react-router-dom'

export default function StaticPage({ title, eyebrow, children }) {
  return <main className="paper-texture min-h-[70vh] px-5 py-24 sm:px-10"><div className="mx-auto max-w-3xl text-center"><p className="text-[10px] font-bold uppercase tracking-[0.28em] text-ink/60">{eyebrow}</p><h1 className="mt-3 font-display text-4xl uppercase">{title}</h1><div className="mt-6 text-sm leading-7 text-ink/70">{children}</div><Link to="/crypts" className="mt-8 inline-block bg-ink px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-parchment">Explore the crypts</Link></div></main>
}
