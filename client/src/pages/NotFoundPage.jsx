import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return <main className="paper-texture not-found-page"><p className="section-eyebrow">A wrong turn in the catacombs</p><h1>Lost in the catacombs</h1><p>The passage you seek has vanished into the mist.</p><Link to="/" className="button button-primary">Return home</Link></main>
}
