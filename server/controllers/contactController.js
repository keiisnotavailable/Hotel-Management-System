import Contact from '../models/Contact.js'

export async function createContact(req, res) {
  const { name, email, message } = req.body
  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Name, email, and message are required.' })
  }
  const contact = await Contact.create({ name, email, message })
  return res.status(201).json({ message: 'Your message has been received.', contact: { id: contact._id, name: contact.name, email: contact.email, message: contact.message, createdAt: contact.createdAt } })
}
