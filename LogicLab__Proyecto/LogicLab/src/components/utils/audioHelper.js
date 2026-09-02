// Utilidad compartida para manejar el desbloqueo y reproducción de audio.
// Los navegadores bloquean audio automático hasta que el usuario interactúa
// con la página. Este helper "desbloquea" el audio en la primera interacción.

let audioDesbloqueado = false

// Se llama una vez al montar cada panel; engancha un listener global
// que desbloquea el audio en el primer clic/tecla del usuario.
export function inicializarAudio() {
  if (audioDesbloqueado) return

  const desbloquear = () => {
    const audio = new Audio("/notificacion.mp3")
    audio.volume = 0 // silencioso, solo para obtener el permiso
    audio.play()
      .then(() => {
        audio.pause()
        audio.currentTime = 0
        audioDesbloqueado = true
      })
      .catch(() => { /* aún no se puede, se reintentará en el próximo clic */ })

    // Una vez desbloqueado, removemos los listeners
    if (audioDesbloqueado) {
      document.removeEventListener("click", desbloquear)
      document.removeEventListener("keydown", desbloquear)
    }
  }

  document.addEventListener("click", desbloquear)
  document.addEventListener("keydown", desbloquear)
}

// Reproduce la notificación a volumen normal.
export function reproducirNotificacion() {
  const audio = new Audio("/notificacion.mp3")
  audio.play().catch(err =>
    console.log("Audio bloqueado (falta interacción del usuario):", err)
  )
}