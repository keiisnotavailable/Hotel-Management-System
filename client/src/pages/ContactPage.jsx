import { Clock3, Mail, MapPin, Phone, Plus, Send } from 'lucide-react'
import { useState } from 'react'
import axios from 'axios'
import CTA from '../components/CTA'
import SelectControl from '../components/SelectControl'
import { API_BASE, getErrorMessage } from '../lib/api'
import locationPhoto from '../images/moonstoria-makiling-location.jpeg'

const initialForm = { name: '', email: '', subject: 'Reservation', phone: '', message: '' }
const faqs = [
  ['What are check-in and check-out times?', 'Check-in begins at dusk, while check-out follows after dawn. Your confirmation includes the exact times for your stay.'],
  ['Can the castle accommodate accessibility needs?', 'Yes. Tell us what would make your stay comfortable and our keepers will prepare an appropriate room and arrival plan.'],
  ['Are pets or familiars welcome?', 'Well-behaved familiars are welcome in selected rooms. Mention yours in your message so we can make suitable arrangements.'],
  ['What is your cancellation policy?', 'Cancellation terms depend on the room and dates. Our concierge will explain the policy before your reservation is finalized.'],
  ['Can you accommodate dietary needs?', 'Our nocturnal kitchen can prepare vegetarian, vegan, and allergy-aware meals with advance notice.'],
  ['What if I arrive late?', 'The castle remains awake from dusk until dawn. Contact us with your arrival time and we will leave the lanterns lit.'],
]

function Field({ id, label, error, children }) {
  return <div className="contact-field"><label htmlFor={id}>{label}</label>{children}{error && <p className="contact-field-error">{error}</p>}</div>
}

export default function ContactPage() {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  function validate() {
    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Please tell us your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = 'Please enter a valid email.'
    if (form.message.trim().length < 20) nextErrors.message = 'Please include at least 20 characters.'
    return nextErrors
  }

  async function submit(event) {
    event.preventDefault()
    setStatus('')
    const nextErrors = validate()
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }
    setSubmitting(true)
    try {
      await axios.post(`${API_BASE}/contact`, form)
      setStatus('Your message has taken flight.')
      setForm(initialForm)
      setErrors({})
    } catch (requestError) {
      setErrors({ form: getErrorMessage(requestError, 'The ravens could not deliver your message.') })
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="paper-texture contact-page"><div className="contact-intro"><section><p className="section-eyebrow">The castle correspondence</p><h1 className="contact-heading">Contact Moonstoria</h1><p>Whether you are planning a moonlit escape, arranging a gathering, or simply curious about life inside the castle, our keepers are ready to hear from you.</p><p>Send a message about reservations, accessibility, celebrations, or special requests. The concierge reviews every note and will reply through the email address you provide.</p><div className="contact-info-list"><p><MapPin size={18} /> <span>Mount Makiling, Laguna, Philippines</span></p><p><Mail size={18} /> <span>hello@moonstoria.ph</span></p><p><Phone size={18} /> <span>+63 966 566 6195</span></p><p><Clock3 size={18} /> <span>Open dusk until dawn</span></p></div><div className="contact-location"><img src={locationPhoto} alt="Moonstoria Hotel location near Mount Makiling, Laguna" /><span>At the edge of Mount Makiling forest, Laguna</span></div></section><form onSubmit={submit} className="contact-form" noValidate><Field id="contact-name" label="Name" error={errors.name}><input id="contact-name" className="contact-input" placeholder="Your name" value={form.name} onChange={(event) => update('name', event.target.value)} /></Field><Field id="contact-email" label="Email" error={errors.email}><input id="contact-email" className="contact-input" type="email" placeholder="you@example.com" value={form.email} onChange={(event) => update('email', event.target.value)} /></Field><div className="contact-form-row"><Field id="contact-subject" label="Subject"><SelectControl id="contact-subject" className="contact-input" value={form.subject} onChange={(event) => update('subject', event.target.value)}><option>Reservation</option><option>Accessibility</option><option>Celebration</option><option>Other</option></SelectControl></Field><Field id="contact-phone" label="Phone (optional)"><input id="contact-phone" className="contact-input" type="tel" placeholder="+63 917 000 0000" value={form.phone} onChange={(event) => update('phone', event.target.value)} /></Field></div><Field id="contact-message" label="Message" error={errors.message}><textarea id="contact-message" className="contact-input contact-textarea" rows="7" placeholder="How may the castle assist you?" value={form.message} onChange={(event) => update('message', event.target.value)} /></Field>{errors.form && <p className="contact-field-error" role="alert">{errors.form}</p>}<button type="submit" className="button button-primary" disabled={submitting}><Send size={15} />{submitting ? 'Sending...' : 'Send message'}</button>{status && <p className="contact-success" role="status">{status}</p>}</form></div><section className="faq-section"><p className="section-eyebrow">Frequently asked</p><h2 className="contact-heading">Questions from the night</h2><div className="faq-list">{faqs.map(([question, answer], index) => <div className="faq-item" key={question}><button type="button" aria-expanded={openFaq === index} aria-controls={`faq-answer-${index}`} onClick={() => setOpenFaq(openFaq === index ? null : index)}><span>{question}</span><Plus size={18} aria-hidden="true" /></button>{openFaq === index && <p id={`faq-answer-${index}`}>{answer}</p>}</div>)}</div></section><CTA title="Your coffin awaits" text="Leave the ordinary world at the gate and let Moonstoria keep watch over your next unforgettable night." buttonLabel="Explore the crypts" /></main>
}
