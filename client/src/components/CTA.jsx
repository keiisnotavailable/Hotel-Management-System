import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function CTA({ eyebrow = 'A night worth remembering', title = 'Your coffin awaits', text = 'Step into a quieter kind of luxury and let the castle keep watch.', buttonLabel = 'Explore the crypts', buttonTo = '/crypts' }) {
  return <section className="cta-banner"><p className="section-eyebrow">{eyebrow}</p><h2>{title}</h2><p className="cta-banner-text">{text}</p><Link to={buttonTo} className="button button-primary">{buttonLabel}<ArrowRight size={16} /></Link></section>
}
