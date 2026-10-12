import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PageHero({ eyebrow, title, subtitle, buttonLabel, buttonTo, image }) {
  return <header className="page-hero" style={image ? { '--page-hero-image': `url("${image}")` } : undefined}><div className="page-hero-content"><p className="section-eyebrow">{eyebrow}</p><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}{buttonLabel && buttonTo && <Link to={buttonTo} className="button button-primary">{buttonLabel}<ArrowRight size={16} /></Link>}</div></header>
}
