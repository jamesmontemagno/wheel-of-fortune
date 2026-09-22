import { registerSW } from 'virtual:pwa-register'

// Look for a newer deploy once an hour and whenever the game comes back to the foreground.
const UPDATE_INTERVAL = 60 * 60 * 1000

function showToast(message, action) {
  document.querySelector('.pwa-toast')?.remove()
  const toast = document.createElement('div')
  toast.className = 'pwa-toast'
  toast.role = 'status'
  toast.innerHTML = `<p></p><div class="pwa-toast-actions"></div>`
  toast.querySelector('p').textContent = message
  const actions = toast.querySelector('.pwa-toast-actions')
  if (action) {
    const confirm = document.createElement('button')
    confirm.className = 'button button-primary'
    confirm.textContent = action.label
    confirm.onclick = () => { toast.remove(); action.run() }
    actions.append(confirm)
  }
  const dismiss = document.createElement('button')
  dismiss.className = 'text-button'
  dismiss.textContent = action ? 'Later' : 'Got it'
  dismiss.onclick = () => toast.remove()
  actions.append(dismiss)
  document.body.append(toast)
  if (!action) setTimeout(() => toast.remove(), 6000)
}

export function setupPWA() {
  if (!('serviceWorker' in navigator)) return
  const updateSW = registerSW({
    onNeedRefresh() {
      showToast('A new version of Wheel of Wisdom is ready.', {
        label: 'Reload',
        run: () => updateSW(true),
      })
    },
    onOfflineReady() {
      showToast('Installed! Wheel of Wisdom now works offline.')
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => {
        if (navigator.onLine === false) return
        registration.update().catch(() => {})
      }
      setInterval(check, UPDATE_INTERVAL)
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) check()
      })
    },
  })
}
