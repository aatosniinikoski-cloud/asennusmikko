const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
if (!reduceMotion) document.documentElement.classList.add('motion-ready')

const menuButton = document.querySelector('.menu-toggle')
const menu = document.querySelector('.main-nav')

function setMenu(open) {
  menu?.classList.toggle('is-open', open)
  menuButton?.setAttribute('aria-expanded', String(open))
  menuButton?.setAttribute('aria-label', open ? 'Sulje valikko' : 'Avaa valikko')
  const icon = menuButton?.querySelector('.menu-icon')
  if (icon) icon.textContent = open ? '×' : '☰'
}

menuButton?.addEventListener('click', () => setMenu(!menu?.classList.contains('is-open')))
menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)))
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu?.classList.contains('is-open')) {
    setMenu(false)
    menuButton?.focus()
  }
})

document.querySelectorAll('.faq-item button').forEach(button => button.addEventListener('click', () => {
  const item = button.closest('.faq-item')
  const wasOpen = item.classList.contains('is-open')
  document.querySelectorAll('.faq-item').forEach(other => {
    other.classList.remove('is-open')
    other.querySelector('button')?.setAttribute('aria-expanded', 'false')
  })
  if (!wasOpen) {
    item.classList.add('is-open')
    button.setAttribute('aria-expanded', 'true')
  }
}))

const counters = document.querySelectorAll('[data-count]')

function renderCounter(element, value) {
  element.textContent = new Intl.NumberFormat('fi-FI').format(value)
}

function runCounter(element) {
  const target = Number(element.dataset.count)
  if (!Number.isFinite(target)) return
  if (reduceMotion) {
    renderCounter(element, target)
    return
  }
  const duration = 500
  const start = performance.now()
  const tick = now => {
    const progress = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 4)
    renderCounter(element, Math.round(target * eased))
    if (progress < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

if ('IntersectionObserver' in window && !reduceMotion) {
  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return
      runCounter(entry.target)
      counterObserver.unobserve(entry.target)
    })
  }, { threshold: 0.6 })
  counters.forEach(counter => counterObserver.observe(counter))
} else {
  counters.forEach(runCounter)
}

const reviewTrack = document.querySelector('.review-track')
const reviewCards = [...document.querySelectorAll('.review-card')]
const reviewPrev = document.querySelector('.review-prev')
const reviewNext = document.querySelector('.review-next')
let reviewIndex = 0

function visibleReviewCount() {
  return matchMedia('(min-width: 60rem)').matches ? 2 : 1
}

function updateReviewCarousel() {
  if (!reviewTrack || !reviewCards.length) return
  const visible = visibleReviewCount()
  const maxIndex = Math.max(0, reviewCards.length - visible)
  reviewIndex = Math.min(reviewIndex, maxIndex)
  const styles = getComputedStyle(reviewTrack)
  const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0
  const cardWidth = reviewCards[0].getBoundingClientRect().width
  reviewTrack.style.transform = `translateX(${-reviewIndex * (cardWidth + gap)}px)`
  if (reviewPrev) reviewPrev.disabled = reviewIndex === 0
  if (reviewNext) reviewNext.disabled = reviewIndex === maxIndex
}

reviewPrev?.addEventListener('click', () => {
  reviewIndex = Math.max(0, reviewIndex - 1)
  updateReviewCarousel()
})

reviewNext?.addEventListener('click', () => {
  reviewIndex += 1
  updateReviewCarousel()
})

let resizeFrame
addEventListener('resize', () => {
  cancelAnimationFrame(resizeFrame)
  resizeFrame = requestAnimationFrame(updateReviewCarousel)
}, { passive: true })
updateReviewCarousel()

const form = document.querySelector('#quote-form')
const success = document.querySelector('#success-panel')
const formError = document.querySelector('#form-error')
const messages = {
  name: 'Kirjoita nimesi.',
  phone: 'Kirjoita puhelinnumerosi.',
  email: 'Kirjoita toimiva sähköpostiosoite.',
  preferredContact: 'Valitse toivottu yhteydenottotapa.',
  odometer: 'Kirjoita mittarilukema positiivisena kokonaislukuna.',
  message: 'Kuvaile huolto- tai korjaustarve.',
  consent: 'Hyväksy yhteydenotto ennen lähettämistä.'
}

function clearErrors() {
  form?.querySelectorAll('[aria-invalid="true"]').forEach(element => element.removeAttribute('aria-invalid'))
  form?.querySelectorAll('[data-error]').forEach(element => { element.textContent = '' })
  if (formError) {
    formError.textContent = ''
    formError.hidden = true
  }
}

function showFieldErrors(invalid) {
  invalid.forEach(name => {
    const control = form.elements.namedItem(name)
    const firstControl = control?.setAttribute ? control : control?.[0]
    firstControl?.setAttribute('aria-invalid', 'true')
    const error = form.querySelector(`[data-error="${name}"]`)
    if (error) error.textContent = messages[name]
  })
  const firstInvalid = form.elements.namedItem(invalid[0])
  const focusTarget = firstInvalid?.focus ? firstInvalid : firstInvalid?.[0]
  focusTarget?.focus({ preventScroll: false })
}

function setSubmitting(isSubmitting) {
  const button = form?.querySelector('[type="submit"]')
  if (!button) return
  button.disabled = isSubmitting
  button.setAttribute('aria-busy', String(isSubmitting))
  const label = button.querySelector('.submit-label')
  if (label) label.textContent = isSubmitting ? 'LÄHETETÄÄN…' : 'PYYDÄ HINTA-ARVIO'
}

const emailInput = form?.elements.email
const emailOptional = document.querySelector('#email-optional')
const contactRadios = form?.querySelectorAll('[name="preferredContact"]') ?? []

function updateEmailRequirement() {
  const selected = form?.querySelector('[name="preferredContact"]:checked')?.value
  const emailRequired = selected === 'Sähköpostitse'
  if (emailInput) {
    emailInput.required = emailRequired
    emailInput.setAttribute('aria-required', String(emailRequired))
  }
  if (emailOptional) emailOptional.hidden = emailRequired
  if (!emailRequired && !emailInput?.value.trim() && emailInput?.getAttribute('aria-invalid') === 'true') {
    emailInput.removeAttribute('aria-invalid')
    const emailError = form.querySelector('[data-error="email"]')
    if (emailError) emailError.textContent = ''
  }
}

contactRadios.forEach(radio => radio.addEventListener('change', () => {
  updateEmailRequirement()
  contactRadios[0]?.removeAttribute('aria-invalid')
  const contactError = form.querySelector('[data-error="preferredContact"]')
  if (contactError) contactError.textContent = ''
}))

emailInput?.addEventListener('input', () => {
  if (emailInput.validity.valid && (!emailInput.required || emailInput.value.trim())) {
    emailInput.removeAttribute('aria-invalid')
    const emailError = form.querySelector('[data-error="email"]')
    if (emailError) emailError.textContent = ''
  }
})
updateEmailRequirement()

form?.addEventListener('submit', async event => {
  event.preventDefault()
  clearErrors()
  const data = new FormData(form)
  const invalid = []
  ;['name', 'phone', 'message'].forEach(name => {
    if (!String(data.get(name) || '').trim()) invalid.push(name)
  })
  const preferredContact = String(data.get('preferredContact') || '')
  if (!preferredContact) invalid.push('preferredContact')
  const email = String(data.get('email') || '').trim()
  if ((preferredContact === 'Sähköpostitse' && !email) || (email && !form.elements.email.validity.valid)) invalid.push('email')
  const odometer = String(data.get('odometer') || '').trim()
  if (odometer && !form.elements.odometer.validity.valid) invalid.push('odometer')
  if (!data.get('consent')) invalid.push('consent')
  if (invalid.length) {
    showFieldErrors(invalid)
    return
  }

  const endpoint = form.dataset.endpoint?.trim()
  if (!endpoint) {
    formError.textContent = 'Lähetyspalvelua ei ole vielä määritetty. Soita numeroon 045 638 8598 tai yritä myöhemmin uudelleen.'
    formError.hidden = false
    return
  }

  setSubmitting(true)
  try {
    const outboundData = new FormData()
    ;[
      ['Nimi', 'name'],
      ['Puhelinnumero', 'phone'],
      ['Sähköposti', 'email'],
      ['Toivottu yhteydenottotapa', 'preferredContact'],
      ['Rekisterinumero', 'registrationNumber'],
      ['Auton merkki ja malli', 'vehicle'],
      ['Mittarilukema (km)', 'odometer'],
      ['Mitä autolle pitäisi tehdä?', 'message'],
      ['Toivottu ajankohta', 'preferredTime'],
      ['Tietosuostumus', 'consent']
    ].forEach(([label, name]) => outboundData.append(label, String(data.get(name) || '')))
    const response = await fetch(endpoint, {
      method: 'POST',
      body: outboundData,
      headers: { Accept: 'application/json' }
    })
    if (!response.ok) throw new Error(`Form submission failed: ${response.status}`)
    form.hidden = true
    success.hidden = false
    window.dataLayer?.push({ event: 'contact_form_success', form_name: 'hinta_arvio' })
    window.dispatchEvent(new CustomEvent('asennusmikko:form-submit-success'))
  } catch (error) {
    console.error(error)
    formError.textContent = 'Pyyntöä ei voitu lähettää. Yritä hetken kuluttua uudelleen tai soita numeroon 045 638 8598.'
    formError.hidden = false
    window.dataLayer?.push({ event: 'contact_form_error', form_name: 'hinta_arvio' })
  } finally {
    setSubmitting(false)
  }
})

document.querySelector('#reset-form')?.addEventListener('click', () => {
  form.reset()
  updateEmailRequirement()
  clearErrors()
  success.hidden = true
  form.hidden = false
  form.querySelector('input')?.focus()
})

if (!reduceMotion && typeof Element.prototype.animate === 'function') {
  const sequence = [
    ['.hero-kicker', [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], 80],
    ['.hero-title .line', [{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }], 130],
    ['.hero-copy', [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], 280],
    ['.hero-actions', [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], 360],
    ['.hero-media', [{ opacity: 0 }, { opacity: 1 }], 260]
  ]
  sequence.forEach(([selector, frames, delay]) => {
    document.querySelectorAll(selector).forEach((element, index) => {
      element.animate(frames, {
        duration: 420,
        delay: delay + index * 55,
        fill: 'both',
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
      })
    })
  })
}
