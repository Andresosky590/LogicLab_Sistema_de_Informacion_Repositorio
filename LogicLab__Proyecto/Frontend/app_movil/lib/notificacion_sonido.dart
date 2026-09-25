import 'package:audioplayers/audioplayers.dart';

// Helper compartido para el sonido de alerta de la app — mismo
// archivo que usa la web (Frontend/public/notificacion.mp3), para
// que suene igual sin importar dónde se reciba la notificación
// (Mensajes cocina del mesero, Pedidos entrantes del cocinero, etc.)
//
// Se reutiliza un solo AudioPlayer para toda la app en vez de crear
// uno nuevo cada vez: así, si dos alertas llegan casi juntas, la
// segunda corta y reinicia el sonido en vez de sobreponerse.
class NotificacionSonido {
  static final AudioPlayer _player = AudioPlayer();
  static bool _desbloqueado = false;

  // ================================================================
  // BUGFIX: los navegadores (y Flutter Web corre dentro de uno)
  // bloquean cualquier audio que no sea consecuencia DIRECTA de un
  // gesto real del usuario (un toque/clic). Por eso sonaba al tocar
  // "Enviar a cocina" o "Marcar como listo" — esos SÍ son gestos —
  // pero nunca sonaba en las alertas que salen solas por el polling
  // en segundo plano (nadie tocó nada justo antes), como el aviso de
  // "tu pedido está listo" del cliente, que llega mientras solo está
  // mirando la pantalla.
  //
  // La solución: reproducir el sonido en volumen 0 una sola vez,
  // colgado de un botón real que el usuario SÍ toca al entrar (login,
  // "Escanear QR de mi mesa") — eso "desbloquea" el audio del
  // navegador para el resto de la sesión, y las alertas del polling
  // ya pueden sonar solas después sin que nadie haya tocado nada.
  static Future<void> desbloquear() async {
    if (_desbloqueado) return;
    try {
      await _player.setVolume(0);
      await _player.play(AssetSource('sounds/notificacion_mangata.mp3'));
      await _player.stop();
      await _player.setVolume(1);
      _desbloqueado = true;
    } catch (_) {
      // Si falla, se vuelve a intentar en el próximo gesto real
      // (login o escanear QR) — _desbloqueado sigue en false.
    }
  }

  static Future<void> reproducir() async {
    try {
      await _player.stop();
      await _player.play(AssetSource('sounds/notificacion_mangata.mp3'));
    } catch (_) {
      // Si el dispositivo no puede reproducir el sonido (silencio del
      // sistema, error del códec, etc.) la alerta visual y la
      // vibración de HapticFeedback ya cumplieron su función — no
      // vale la pena interrumpir el flujo por esto.
    }
  }
}
