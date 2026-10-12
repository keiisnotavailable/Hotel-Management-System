import { Moon, ShieldCheck, Utensils, KeyRound, Sparkles, Star } from 'lucide-react'
import PageHero from '../components/PageHero'
import CTA from '../components/CTA'
import useScrollReveal from '../hooks/useScrollReveal'
import aboutCastleInterior from '../images/about-castle-interior.jpg'
import aboutHero from '../images/moonstoria-about-hero.jpeg'
import keeperMaraVesper from '../images/keeper-mara-vesper.jpg'
import keeperBramHollow from '../images/keeper-bram-hollow.jpg'
import keeperElaraThorn from '../images/keeper-elara-thorn.jpg'

const promises = [
  { icon: ShieldCheck, title: 'Total Darkness Guarantee', text: 'Heavy curtains, quiet halls, and carefully guarded windows keep every room restful.' },
  { icon: KeyRound, title: 'Discreet Service', text: 'Our keepers understand privacy and make every arrival, request, and departure effortless.' },
  { icon: Utensils, title: 'Nocturnal Dining', text: 'Seasonal menus and late-night comforts are prepared whenever your appetite wakes.' },
]

const keepers = [
  { name: 'Alyzza Lobaton', role: 'Head Concierge', image: keeperMaraVesper },
  { name: 'Kathlene Fernandez', role: 'Master of the Cellar', image: keeperBramHollow },
  { name: 'Meah Portillo', role: 'Keeper of the Keys', image: keeperElaraThorn },
]

const testimonials = [
  ['“A beautiful retreat with impeccable service. We arrived at dusk and never wanted to leave.”', '— Lady Carmilla'],
  ['“The quiet, the candlelight, the midnight supper—Moonstoria understands the art of a proper escape.”', '— Victor Nightshade'],
  ['“Every detail felt considered, from the welcome at the gate to the soft dawn departure.”', '— The Holloway Family'],
]

function Reveal({ children, className = '' }) {
  const ref = useScrollReveal()
  return <div ref={ref} className={`reveal ${className}`}>{children}</div>
}

export default function AboutPage() {
  return <main className="paper-texture">
    <PageHero eyebrow="The Moonstoria story" title="A sanctuary after sunset" subtitle="A gothic hotel shaped by legend, quiet luxury, and a deep respect for the night." image={aboutHero} />
    <Reveal><section className="about-section about-story"><div className="about-story-image"><img src={aboutCastleInterior} alt="Moonlit interior of Moonstoria Hotel" /><span>Founded in 1824</span></div><div><p className="section-eyebrow">Our story</p><h2 className="about-heading">Built for those who belong to the night</h2><p>Moonstoria began as a small forest keep where weary travelers could find shelter after dark. Over two centuries, its halls became a gathering place for creatures and curious humans seeking a slower, more thoughtful kind of hospitality.</p><p>Today, the castle balances old-world ritual with modern comfort. Every crypt, supper, and whispered welcome is designed to make guests feel entirely at home beneath the moon.</p></div></section></Reveal>
    <Reveal><section className="about-stats" aria-label="Moonstoria statistics">{[['200+', 'Years of hospitality'], ['24', 'Crypts and dens'], ['5.0', 'Guest rating'], ['24/7', 'Dusk to dawn service']].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</section></Reveal>
    <Reveal><section className="about-section about-centered"><p className="section-eyebrow">Our promises</p><h2 className="about-heading">The Moonstoria standard</h2><div className="about-card-grid">{promises.map(({ icon: Icon, title, text }) => <article className="about-card" key={title}><Icon size={24} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>)}</div></section></Reveal>
    <Reveal><section className="about-section about-centered"><p className="section-eyebrow">Meet the keepers</p><h2 className="about-heading">The hands behind the hospitality</h2><div className="keeper-grid">{keepers.map(({ name, role, image }) => <article className="keeper-card" key={name}><div className="keeper-portrait keeper-photo"><img src={image} alt={`${name}, ${role}`} /></div><h3>{name}</h3><p>{role}</p></article>)}</div></section></Reveal>
    <Reveal><section className="about-section about-centered"><p className="section-eyebrow">Guestbook</p><h2 className="about-heading">Kind words from the night</h2><div className="testimonial-grid">{testimonials.map(([quote, author]) => <figure className="testimonial-card" key={author}><div className="testimonial-stars" aria-label="5 out of 5 stars">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={14} fill="currentColor" />)}</div><blockquote>{quote}</blockquote><figcaption>{author}</figcaption></figure>)}</div></section></Reveal>
    <CTA title="Your coffin awaits" text="Leave the ordinary world at the gate and let Moonstoria keep watch over your next unforgettable night." buttonLabel="Explore the crypts" />
  </main>
}
