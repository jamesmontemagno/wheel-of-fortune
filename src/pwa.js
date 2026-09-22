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
    const applyButton = document.createElement('button')
    applyButton.className = 'button button-primary'
    applyButton.textContent = action.label
    applyButton.onclick = () => { toast.remove(); action.run() }
    actions.append(applyButton)
  }
  const dismiss = document.createElement('button')
  dismiss.className = 'text-button'
  dismiss.textContent = action ? 'Later' : 'Got it'
  dismiss.onclick = () => toast.remove()
  actions.append(dismiss)
  document.body.append(toast)
  if (!action) setTimeout(() => toast.remove(), 6000)
}

export async function setupPWA() {
  if (window.HybridWebView || !('serviceWorker' in navigator)) return
  const { registerSW } = await import('virtual:pwa-register')
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
