import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Plus, Star, Upload, X } from 'lucide-react'
import { getRoomImage } from '../../utils/roomImages'
import ConfirmModal from './ConfirmModal'
import Skeleton from './Skeleton'
import { adminApi, getAdminErrorMessage } from '../lib/adminApi'

const ROOM_TYPES = ['Crypt', 'Den', 'Suite', 'Tower']
const STATUSES = ['available', 'maintenance']
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ACCEPTED_EXTENSIONS = /\.(jpe?g|png|webp)$/i
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024
const CURRENCY = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })

function makeInitialForm(room = {}) {
  return {
    name: room.name || '',
    type: room.type || 'Crypt',
    tagline: room.tagline || '',
    status: room.status || 'available',
    maintenanceNote: room.maintenanceNote || '',
    description: room.description || '',
    sizeSqFt: room.sizeSqFt ?? '',
    bedsLabel: room.bedsLabel || '',
    capacity: room.capacity ?? 1,
    pricePerNight: room.pricePerNight ?? '',
    rating: room.rating ?? 0,
    featured: Boolean(room.featured),
    amenities: room.amenities || [],
    images: (room.images || []).map((value) => ({ id: `saved-${value}-${crypto.randomUUID()}`, value })),
  }
}

function validate(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Enter a name for this crypt.'
  if (!ROOM_TYPES.includes(form.type)) errors.type = 'Choose a valid room type.'
  if (!['', null].includes(form.sizeSqFt) && (!Number.isFinite(Number(form.sizeSqFt)) || Number(form.sizeSqFt) < 0)) errors.sizeSqFt = 'Size must be zero or greater.'
  if (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 1 || Number(form.capacity) > 20) errors.capacity = 'Capacity must be a whole number from 1 to 20.'
  if (!Number.isFinite(Number(form.pricePerNight)) || Number(form.pricePerNight) <= 0) errors.pricePerNight = 'Price per night must be greater than zero.'
  if (!STATUSES.includes(form.status)) errors.status = 'Choose a valid status.'
  if (!Array.isArray(form.amenities) || form.amenities.some((item) => typeof item !== 'string')) errors.amenities = 'Amenities must be text values.'
  return errors
}

function fieldError(errors, name) {
  return errors[name] ? <span className="admin-form-error" role="alert">{errors[name]}</span> : null
}

function resolveImage(value) {
  return getRoomImage({ images: [value] })
}

function RoomCardPreview({ form }) {
  const image = form.images[0]?.preview || resolveImage(form.images[0]?.value)
  const rating = Math.max(0, Math.min(5, Number(form.rating) || 0))
  return <aside className="admin-room-preview">
    <div className="admin-room-preview-sticky">
      <p className="admin-kicker">Live preview</p>
      <article className="admin-room-preview-card">
        <div className="admin-room-preview-image">
          {image ? <img src={image} alt="" /> : <span aria-hidden="true">☾</span>}
          <span className="admin-room-preview-price">{CURRENCY.format(Number(form.pricePerNight) || 0)} / NIGHT</span>
          {form.featured && <span className="admin-room-preview-featured"><Star size={12} fill="currentColor" /> FEATURED</span>}
        </div>
        <div className="admin-room-preview-body">
          <p>{form.type} room</p>
          <h2>{form.name || 'Crypt name'}</h2>
          <span className="admin-room-preview-tagline">{form.sizeSqFt ? `${form.sizeSqFt} SQ FT / ` : ''}{form.tagline || 'NOISELESS'}</span>
          <p className="admin-room-preview-description">{form.description || 'A description of this crypt will appear here.'}</p>
          <div className="admin-room-preview-amenities">{form.amenities.slice(0, 3).map((amenity) => <span key={amenity}>{amenity}</span>)}</div>
          <div className="admin-room-preview-footer"><span>{form.bedsLabel || `Up to ${form.capacity || 1} guests`}</span><span aria-label={`${rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={12} fill={star <= rating ? 'currentColor' : 'none'} />)}</span></div>
        </div>
      </article>
      <p className="admin-room-preview-note">Preview of how this crypt appears to guests.</p>
    </div>
  </aside>
}

function ImagePicker({ images, busy, onUpload, onRemove, onMove }) {
  const fileInputRef = useRef(null)

  function acceptFiles(fileList) {
    onUpload(Array.from(fileList || []))
  }

  return <div className="admin-image-picker">
    <button type="button" className={`admin-image-dropzone ${busy ? 'is-busy' : ''}`} disabled={busy} onClick={() => fileInputRef.current?.click()}>
      <Upload size={23} aria-hidden="true" />
      <strong>{busy ? 'Uploading image…' : images.length ? 'Add or change images' : 'Choose room images'}</strong>
      <span>Click to browse files. JPG, PNG, or WebP, up to 5 MB each.</span>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple hidden onClick={(event) => event.stopPropagation()} onChange={(event) => { acceptFiles(event.target.files); event.target.value = '' }} />
    </button>
    {images.length > 0 && <div className="admin-selected-images">
      <h3>Selected images <span>First image is the cover</span></h3>
      <div className="admin-selected-image-list">
        {images.map((image, index) => <div className="admin-selected-image" key={image.id} draggable={!image.uploading} onDragStart={(event) => { event.dataTransfer.setData('text/plain', String(index)); event.dataTransfer.effectAllowed = 'move' }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); onMove(Number(event.dataTransfer.getData('text/plain')), index) }}>
          <img src={image.preview || resolveImage(image.value)} alt="" />
          <div className="admin-selected-image-overlay">
            {index === 0 ? <span className="admin-image-cover"><Star size={11} fill="currentColor" /> Cover</span> : <span className="admin-image-order">Image {index + 1}</span>}
            {image.uploading && <span className="admin-image-uploading">Uploading…</span>}
            <div>
              <button type="button" aria-label={`Move image ${index + 1} earlier`} disabled={index === 0 || image.uploading} onClick={() => onMove(index, index - 1)}><ArrowUp size={14} /></button>
              <button type="button" aria-label={`Move image ${index + 1} later`} disabled={index === images.length - 1 || image.uploading} onClick={() => onMove(index, index + 1)}><ArrowDown size={14} /></button>
              <button type="button" aria-label={`Remove image ${index + 1}`} disabled={image.uploading} onClick={() => onRemove(index)}><X size={14} /></button>
            </div>
          </div>
        </div>)}
      </div>
    </div>}
  </div>
}

export default function RoomForm({ mode }) {
  const editing = mode === 'edit'
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState(() => makeInitialForm())
  const [initialValue, setInitialValue] = useState('')
  const [amenitySuggestions, setAmenitySuggestions] = useState([])
  const [amenityInput, setAmenityInput] = useState('')
  const [errors, setErrors] = useState({})
  const [pageError, setPageError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState('')

  const formJson = JSON.stringify(form)
  const dirty = initialValue !== '' && formJson !== initialValue
  const returnTo = `/admin/rooms${location.search}`

  useEffect(() => {
    const beforeUnload = (event) => {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    const confirmLinkNavigation = (event) => {
      if (!dirty || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = event.target.closest?.('a[href]')
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return
      const target = new URL(link.href, window.location.href)
      if (target.origin !== window.location.origin || `${target.pathname}${target.search}${target.hash}` === `${location.pathname}${location.search}${location.hash}`) return
      event.preventDefault()
      event.stopPropagation()
      setPendingNavigation(`${target.pathname}${target.search}${target.hash}`)
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', confirmLinkNavigation, true)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('click', confirmLinkNavigation, true)
    }
  }, [dirty, location])

  useEffect(() => {
    let alive = true
    async function loadFormData() {
      setLoading(true)
      setPageError('')
      try {
        const requests = [adminApi.get('/rooms?limit=100&page=1')]
        if (editing) requests.push(adminApi.get(`/rooms/${id}`))
        const responses = await Promise.all(requests)
        if (!alive) return
        const roomsResponse = responses[0].data.items || []
        setAmenitySuggestions([...new Set(roomsResponse.flatMap((room) => room.amenities || []))].sort((a, b) => a.localeCompare(b)))
        const room = editing ? responses[1].data.room : undefined
        const nextForm = makeInitialForm(room)
        setForm(nextForm)
        setInitialValue(JSON.stringify(nextForm))
      } catch (requestError) {
        if (alive) setPageError(getAdminErrorMessage(requestError, 'Could not load the room form.'))
      } finally {
        if (alive) setLoading(false)
      }
    }
    loadFormData()
    return () => { alive = false }
  }, [editing, id])

  const updateField = useCallback((name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }, [])

  const images = form.images
  const updateImages = useCallback((nextImages) => {
    setForm((current) => ({ ...current, images: typeof nextImages === 'function' ? nextImages(current.images) : nextImages }))
    setErrors((current) => ({ ...current, images: '' }))
  }, [])

  async function uploadFiles(files) {
    if (!files.length) return
    setPageError('')
    const accepted = []
    for (const file of files) {
      if ((!ACCEPTED_MIME_TYPES.includes(file.type) && !ACCEPTED_EXTENSIONS.test(file.name)) || file.size > MAX_UPLOAD_SIZE) {
        setPageError(`${file.name}: choose a JPG, PNG, or WebP image no larger than 5 MB.`)
        continue
      }
      accepted.push(file)
    }
    if (!accepted.length) return

    setUploading(true)
    try {
      for (const file of accepted) {
        const body = new FormData()
        body.append('image', file)
        const { data } = await adminApi.post('/uploads', body)
        updateImages((current) => [...current, { id: `upload-${crypto.randomUUID()}`, value: data.image }])
      }
    } catch (requestError) {
      setPageError(getAdminErrorMessage(requestError, 'The image could not be uploaded.'))
    } finally {
      setUploading(false)
    }
  }

  function moveImage(from, to) {
    if (from < 0 || to < 0 || from >= images.length || to >= images.length || from === to) return
    const next = [...images]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    updateImages(next)
  }

  function addAmenity(value = amenityInput) {
    const amenity = value.trim().replace(/,$/, '').trim()
    if (!amenity || form.amenities.some((item) => item.toLowerCase() === amenity.toLowerCase())) {
      setAmenityInput('')
      return
    }
    updateField('amenities', [...form.amenities, amenity])
    setAmenityInput('')
  }

  function removeAmenity(amenity) {
    updateField('amenities', form.amenities.filter((item) => item !== amenity))
  }

  function cancel() {
    if (dirty) setPendingNavigation(returnTo)
    else navigate(returnTo)
  }

  async function save(event) {
    event.preventDefault()
    const validationErrors = validate(form)
    setErrors(validationErrors)
    setPageError('')
    if (Object.values(validationErrors).some(Boolean) || uploading || form.images.some((image) => image.uploading)) {
      if (uploading) setPageError('Wait for all images to finish uploading before saving.')
      return
    }
    const payload = {
      name: form.name.trim(),
      type: form.type,
      tagline: form.tagline.trim(),
      status: form.status,
      ...(form.status === 'maintenance' ? { maintenanceNote: form.maintenanceNote.trim() } : {}),
      description: form.description.trim(),
      sizeSqFt: form.sizeSqFt === '' ? null : Number(form.sizeSqFt),
      bedsLabel: form.bedsLabel.trim(),
      capacity: Number(form.capacity),
      pricePerNight: Number(form.pricePerNight),
      featured: form.featured,
      amenities: form.amenities,
      images: form.images.map(({ value }) => value),
    }

    setSaving(true)
    try {
      if (editing) await adminApi.put(`/rooms/${id}`, payload)
      else await adminApi.post('/rooms', payload)
      navigate(returnTo, { replace: true, state: { roomToast: `“${payload.name}” was ${editing ? 'updated' : 'created'} successfully.` } })
    } catch (requestError) {
      const message = getAdminErrorMessage(requestError, 'The room could not be saved.')
      if (requestError.response?.status === 409 && /name/i.test(message)) {
        setErrors((current) => ({ ...current, name: 'A crypt with this name already exists. Choose a unique name.' }))
      } else {
        setPageError(message)
      }
    } finally {
      setSaving(false)
    }
  }

  const filteredSuggestions = useMemo(() => amenitySuggestions.filter((item) =>
    !form.amenities.some((selected) => selected.toLowerCase() === item.toLowerCase())
    && (!amenityInput || item.toLowerCase().includes(amenityInput.toLowerCase()))
  ).slice(0, 8), [amenitySuggestions, form.amenities, amenityInput])

  if (loading) return <section className="admin-page admin-room-form-page"><p className="admin-kicker">Moonstoria Administration</p><h1>{editing ? 'Edit crypt' : 'New crypt'}</h1><div className="admin-room-form-loading"><Skeleton rows={8} /></div></section>
  if (pageError && editing && !initialValue) return <section className="admin-page admin-room-form-page"><p className="admin-kicker">Moonstoria Administration</p><h1>Edit crypt</h1><div className="admin-dashboard-error admin-room-form-fatal" role="alert"><span>{pageError}</span><button type="button" onClick={() => window.location.reload()}>Retry</button></div><button className="admin-room-form-button secondary" type="button" onClick={() => navigate(returnTo)}>Back to crypts</button></section>

  return <section className="admin-page admin-room-form-page">
    <div className="admin-room-form-heading">
      <div>
        <p className="admin-kicker">Moonstoria Administration</p>
        <h1>{editing ? 'Edit crypt' : 'New crypt'}</h1>
        <p className="admin-page-subtitle">{editing ? `Update ${form.name || 'this crypt'} and its guest-facing details.` : 'Add a new crypt to the castle.'}</p>
      </div>
    </div>
    {pageError && <div className="admin-dashboard-error admin-room-form-error" role="alert">{pageError}</div>}
    <div className="admin-room-form-layout">
      <form className="admin-room-form" onSubmit={save} noValidate>
        <fieldset className="admin-room-form-fields" disabled={saving || uploading}>
        <section className="admin-room-form-section">
          <div className="admin-form-section-heading"><span>01</span><div><h2>Basics</h2><p>Give this crypt its identity.</p></div></div>
          <div className="admin-form-grid">
            <label className="admin-form-field span-2"><span>Name <b>*</b></span><input value={form.name} maxLength={120} onChange={(event) => updateField('name', event.target.value)} aria-invalid={Boolean(errors.name)} />{fieldError(errors, 'name')}</label>
            <label className="admin-form-field"><span>Type <b>*</b></span><select value={form.type} onChange={(event) => updateField('type', event.target.value)}>{ROOM_TYPES.map((type) => <option key={type}>{type}</option>)}</select>{fieldError(errors, 'type')}</label>
            <label className="admin-form-field"><span>Tags</span><input value={form.tagline} maxLength={120} onChange={(event) => updateField('tagline', event.target.value)} /></label>
            <label className="admin-form-field"><span>Status</span><select value={form.status} onChange={(event) => updateField('status', event.target.value)}><option value="available">Available</option><option value="maintenance">Maintenance</option></select>{fieldError(errors, 'status')}</label>
            {form.status === 'maintenance' && <label className="admin-form-field span-2"><span>Maintenance note</span><textarea rows="2" maxLength="500" value={form.maintenanceNote} onChange={(event) => updateField('maintenanceNote', event.target.value)} /></label>}
          </div>
        </section>

        <section className="admin-room-form-section">
          <div className="admin-form-section-heading"><span>02</span><div><h2>Details</h2><p>Describe the stay and set its capacity and nightly rate.</p></div></div>
          <div className="admin-form-grid">
            <label className="admin-form-field span-2"><span>Description</span><textarea rows="5" maxLength={5000} value={form.description} onChange={(event) => updateField('description', event.target.value)} /></label>
            <label className="admin-form-field"><span>Size (sq ft)</span><input type="number" min="0" step="1" value={form.sizeSqFt} onChange={(event) => updateField('sizeSqFt', event.target.value)} aria-invalid={Boolean(errors.sizeSqFt)} />{fieldError(errors, 'sizeSqFt')}</label>
            <label className="admin-form-field"><span>Beds label</span><input value={form.bedsLabel} maxLength={100} onChange={(event) => updateField('bedsLabel', event.target.value)} /></label>
            <label className="admin-form-field"><span>Capacity <b>*</b></span><input type="number" min="1" max="20" step="1" value={form.capacity} onChange={(event) => updateField('capacity', event.target.value)} aria-invalid={Boolean(errors.capacity)} />{fieldError(errors, 'capacity')}</label>
            <label className="admin-form-field"><span>Price per night (PHP) <b>*</b></span><input type="number" min="0.01" step="1" value={form.pricePerNight} onChange={(event) => updateField('pricePerNight', event.target.value)} aria-invalid={Boolean(errors.pricePerNight)} />{fieldError(errors, 'pricePerNight')}</label>
            <label className="admin-form-featured"><input type="checkbox" checked={form.featured} onChange={(event) => updateField('featured', event.target.checked)} /><span>Feature on homepage</span></label>
          </div>
        </section>

        <section className="admin-room-form-section">
          <div className="admin-form-section-heading"><span>03</span><div><h2>Amenities</h2><p>Add amenities guests will find in this crypt.</p></div></div>
          <div className="admin-amenity-input-row">
            <input value={amenityInput} maxLength={80} placeholder="Type an amenity and press Enter" aria-label="Add amenity" onChange={(event) => setAmenityInput(event.target.value)} onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addAmenity() }
            }} />
            <button type="button" onClick={() => addAmenity()} disabled={!amenityInput.trim()}><Plus size={15} /> Add</button>
          </div>
          {filteredSuggestions.length > 0 && <div className="admin-amenity-suggestions"><span>Suggestions</span>{filteredSuggestions.map((amenity) => <button type="button" key={amenity} onClick={() => addAmenity(amenity)}>{amenity}</button>)}</div>}
          {form.amenities.length > 0 ? <div className="admin-amenity-chips">{form.amenities.map((amenity) => <span key={amenity}>{amenity}<button type="button" aria-label={`Remove ${amenity}`} onClick={() => removeAmenity(amenity)}><X size={13} /></button></span>)}</div> : <p className="admin-form-hint">No amenities added yet.</p>}
          {fieldError(errors, 'amenities')}
        </section>

        <section className="admin-room-form-section">
          <div className="admin-form-section-heading"><span>04</span><div><h2>Images</h2><p>Choose images from your files. Drag to reorder; the first is the cover.</p></div></div>
          <ImagePicker images={images} busy={uploading} onUpload={uploadFiles} onRemove={(index) => updateImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} onMove={moveImage} />
        </section>
        </fieldset>

        <div className="admin-room-form-actions">
          <button type="button" className="admin-room-form-button secondary" onClick={cancel} disabled={saving || uploading}>Cancel</button>
          <button type="submit" className="admin-room-form-button primary" disabled={saving || uploading}>{saving ? 'Saving…' : uploading ? 'Uploading…' : editing ? 'Save changes' : 'Create crypt'}</button>
        </div>
      </form>
      <RoomCardPreview form={form} />
    </div>
    <ConfirmModal open={Boolean(pendingNavigation)} title="Discard unsaved changes?" description="Your changes to this crypt have not been saved. Leave without saving?" confirmLabel="Discard changes" onConfirm={() => { const destination = pendingNavigation; setPendingNavigation(''); navigate(destination) }} onClose={() => setPendingNavigation('')} />
  </section>
}
