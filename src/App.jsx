import { useState } from 'react'
import {
  ChevronDown,
  Clock3,
  Heart,
  Menu,
  Moon,
  Star,
  X,
} from 'lucide-react'
import hotelHomepage from './images/hotel-homepage.jpeg'
import logo from './images/logo.png'

const roomData = [
  {
    title: 'Werewolf Pups Family Den',
    subtitle: '150 SQ FT / NOISELESS',
    detail: '12 Cozy Beds',
    price: '$250 / NIGHT',
    className: 'den',
    rating: '★★★★☆',
  },
  {
    title: 'The Haunted Tower Crypt',
    subtitle: '100% SUNLIGHT-PROOF / GOTHIC',
    detail: '1 Stained-Glass Crypt',
    price: '$150 / NIGHT',
    className: 'tower',
    rating: '★★★★★',
  },
  {
    title: 'Royal Coffin Penthouse',
    subtitle: 'SPOIL-SOLID / IMPORTED ROMA',
    detail: '2 VIP Coffins',
    price: '$430 / NIGHT',
    className: 'penthouse',
    rating: '★★★★☆',
  },
]

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [monsterCount, setMonsterCount] = useState('Pups count')

  return (
    <div className="min-h-screen bg-parchment text-ink">
      <Hero menuOpen={menuOpen} setMenuOpen={setMenuOpen} monsterCount={monsterCount} setMonsterCount={setMonsterCount} />
      <main>
        <section id="rooms" className="paper-texture relative px-5 pb-20 pt-24 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-6xl">
            <SectionIntro />
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {roomData.map((room) => <RoomCard key={room.title} room={room} />)}
            </div>
            <div className="mt-7 flex justify-center gap-2">
              <span className="h-2 w-2 rounded-full bg-ink" />
              <span className="h-2 w-2 rounded-full border border-ink" />
              <span className="h-2 w-2 rounded-full border border-ink" />
            </div>
          </div>
        </section>
        <section className="paper-texture border-t border-ink/20 px-5 py-20 sm:px-10 lg:px-16">
          <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
            <CastleIllustration />
            <div className="max-w-md">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-ink/60">Luxury hotel and resort</p>
              <h2 className="mt-3 font-display text-3xl uppercase leading-tight">The best gothic sanctuary in Transylvania</h2>
              <p className="mt-4 text-sm leading-6 text-ink/70">
                A moonlit retreat for vampires, werewolves, mummies, and every beloved creature of the night.
                Come for the crypts, stay for the legendary hospitality.
              </p>
              <div className="mt-6 flex gap-10 border-y border-ink/25 py-4">
                <div><strong className="block font-display text-3xl">250+</strong><span className="text-[10px]">Crypts &amp; Dens</span></div>
                <div><strong className="block font-display text-3xl">4.9</strong><span className="text-[10px]">Guest Scream Ratings</span></div>
              </div>
              <button className="mt-5 bg-ink px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-parchment hover:bg-crimson">Explore the castle</button>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-charcoal px-5 py-8 text-center text-[10px] uppercase tracking-[0.2em] text-parchment/60">
        Hotel Transylvania · A safe haven after dark
      </footer>
    </div>
  )
}

function Hero({ menuOpen, setMenuOpen, monsterCount, setMonsterCount }) {
  return (
    <header
      className="hero relative min-h-[580px] text-parchment"
      style={{ '--hero-image': `url("${hotelHomepage}")` }}
    >
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between border-b border-parchment/15 px-5 py-4 sm:px-10 lg:px-14">
        <a href="/" aria-label="Hotel Transylvania home">
          <img src={logo} alt="Hotel Transylvania" className="h-12 w-auto object-contain" />
        </a>
        <div className="hidden items-center gap-5 text-[9px] font-bold uppercase tracking-widest text-parchment/80 md:flex">
          <a href="/" className="text-parchment">Home</a>
          <a href="#rooms">About</a>
          <a href="#rooms">Crypts <ChevronDown size={10} className="inline" /></a>
          <a href="#rooms">Services <ChevronDown size={10} className="inline" /></a>
          <a href="#rooms">Blog</a>
          <a href="#rooms">Contact</a>
        </div>
        <button className="hidden border border-gold/70 bg-wine px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-gold md:block">Summon Dracula / Book</button>
        <button className="rounded border border-parchment/30 p-2 md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          {menuOpen ? <X size={17} /> : <Menu size={17} />}
        </button>
      </nav>
      {menuOpen && <div className="relative z-20 border-b border-parchment/20 bg-charcoal px-5 py-4 text-xs uppercase tracking-widest md:hidden"><a href="#rooms">Explore the crypts</a></div>}
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-5 pt-24 text-center sm:pt-28">
        <div className="flex items-center gap-1 text-gold" aria-label="Five stars">
          {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={13} fill="currentColor" />)}
        </div>
        <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.28em]">Luxury for the undead &amp; monster kind</p>
        <h1 className="mt-4 font-display text-4xl uppercase leading-tight text-gold sm:text-6xl">The best human-free hotel<br />in Transylvania</h1>
        <button className="mt-6 border border-gold bg-wine px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-parchment">Enter if you dare</button>
      </div>
      <BookingBar monsterCount={monsterCount} setMonsterCount={setMonsterCount} />
    </header>
  )
}

function BookingBar({ monsterCount, setMonsterCount }) {
  return (
    <div className="absolute bottom-[-36px] left-1/2 z-20 w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 border border-[#8f4b73] bg-[#17131d] p-2 shadow-lg">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <BookingField label="Check-in" value="(Dusk)" />
        <BookingField label="Check-out" value="(Dawn)" />
        <BookingSelect label="Crypts" value="Crypts & Dens" options={['Crypts & Dens', 'Tower Rooms']} />
        <BookingSelect label="Monsters" value={monsterCount} options={['Pups count', 'Vampire count', 'Full pack']} onChange={setMonsterCount} />
        <button className="min-h-12 bg-crimson px-4 text-[10px] font-bold uppercase tracking-widest text-parchment hover:bg-[#831225]">Book now</button>
      </div>
    </div>
  )
}

function BookingField({ label, value }) {
  return <button className="min-h-12 border border-parchment/20 bg-[#0e0c12] px-3 text-left"><span className="block text-[8px] uppercase tracking-widest text-parchment/50">{label}</span><span className="mt-1 flex items-center justify-between text-xs">{value}<Clock3 size={12} /></span></button>
}

function BookingSelect({ label, value, options, onChange }) {
  return <label className="min-h-12 border border-parchment/20 bg-[#0e0c12] px-3 py-2"><span className="block text-[8px] uppercase tracking-widest text-parchment/50">{label}</span><span className="relative mt-1 flex items-center"><select value={value} onChange={(event) => onChange?.(event.target.value)} className="w-full appearance-none bg-transparent text-xs outline-none"><option>{options[0]}</option>{options.slice(1).map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={12} className="pointer-events-none absolute right-0" /></span></label>
}

function SectionIntro() {
  return (
    <div className="mx-auto max-w-xl text-center">
      <div className="bat-mark mx-auto mb-4"><Moon size={23} fill="currentColor" /></div>
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-ink/70">Dracula&apos;s crypts &amp; suites</p>
      <h2 className="mt-2 font-display text-3xl uppercase leading-tight sm:text-4xl">Hand-tailored for monsters</h2>
      <p className="mx-auto mt-3 max-w-md text-xs leading-5 text-ink/70">Hand-tailored for monster comforts and nocturnal habits.<br />Strictly no humans allowed since 1895.</p>
    </div>
  )
}

function RoomCard({ room }) {
  return (
    <article className="room-card overflow-hidden border border-ink/50 bg-[#211a20] text-parchment">
      <div className={`room-illustration ${room.className}`}>
        <span className="absolute right-2 top-2 bg-[#211a20] px-2 py-1 text-[8px] font-bold">{room.price}</span>
        <Heart size={14} className="absolute left-3 top-3" />
      </div>
      <div className="p-3">
        <p className="text-[8px] uppercase tracking-widest text-parchment/60">Luxury room</p>
        <h3 className="mt-1 font-display text-lg leading-tight">{room.title}</h3>
        <p className="mt-1 text-[8px] uppercase text-parchment/60">{room.subtitle}</p>
        <div className="mt-4 flex items-center justify-between border-t border-parchment/20 pt-2 text-[9px]"><span>{room.detail}</span><span className="text-gold">{room.rating}</span></div>
      </div>
    </article>
  )
}

function CastleIllustration() {
  return (
    <div className="sanctuary-image relative mx-auto h-80 w-full max-w-sm">
      <div className="absolute inset-3 border border-parchment/50" />
      <div className="absolute left-1/2 top-1/2 h-44 w-56 -translate-x-1/2 -translate-y-1/2 rounded-t-[5rem] border-8 border-[#6e5b55] bg-[#18151b]">
        <div className="absolute left-1/2 top-8 h-16 w-16 -translate-x-1/2 rounded-full border-2 border-gold/70" />
      </div>
      <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.25em] text-parchment/70">The royal resting chamber</span>
    </div>
  )
}

export default App
