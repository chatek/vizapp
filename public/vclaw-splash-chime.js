/* VClaw branded startup chime — an ORIGINAL composition in the vintage NES idiom.
 * v2: "the little fanfare that tries twice" — funnier and longer (~2.4s).
 *
 * Why synthesized: actual Nintendo audio is copyrighted (Nintendo enforces it), so
 * "vintage Nintendo-style" is done the legal way — an original jingle written for the
 * 2A03 sound chip's voice set: two pulse (square) channels, one triangle for bass,
 * and the noise channel for percussion. Web Audio renders it; no audio files ship.
 * CC0 alternatives were evaluated (OpenGameArt CC0 NES packs, Kenney jingles) and
 * remain an option if a recorded feel is preferred later.
 *
 * The composition, beat by beat (110 BPM, eighth = ~273ms):
 *   bar 1  a cheeky two-note "ta-daa?" pickup that lands ON a record-scratch noise
 *          tick — as if the fanfare cleared its throat;
 *   bar 2  the fanfare proper: a rising C-major run (C5 D5 E5 G5) with pulse 2
 *          harmonizing a sixth below, triangle walking C-G-C-G;
 *   bar 3  the punchline: a false ending on G5 that HESITATES (a rest where the
 *          downbeat should be — the "wait for it" beat), then resolves up the
 *          octave to a bright C6 with a full-band hit and a sparkly double-tick.
 * The hesitation is the joke: a startup jingle that forgets its own ending for a
 * quarter of a second, then lands it. Short enough not to delay, long enough to
 * be remembered.
 *
 * The splash overlay is static by design (CSP script-src 'self' forbids inline
 * scripts); this file is self-hosted and merely DEFINES the player. The main
 * process triggers it via executeJavaScript at the member splash moment, so the
 * same authority that drives the scene swap drives the sound.
 */
(function () {
  'use strict'

  // Note frequencies (Hz)
  var N = {
    G3: 196.0, A3: 220.0, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0,
    C6: 1046.5
  }

  // Total musical length in eighths (the last note ends at beat 17). The tempo
  // scales so the piece fills exactly the logo overlay's hold time.
  var TOTAL_EIGHTHS = 17
  var DEFAULT_EIGHTH = 60 / 110 / 2 // ~0.2727s

  // One chip voice note: oscillator + envelope. 'square' = NES pulse, 'triangle'
  // = NES triangle. Hard attack, quick decay to sustain, hard release — the 2A03
  // envelope shape.
  function note(context, destination, type, freq, start, duration, peak, sustain) {
    var osc = context.createOscillator()
    var gain = context.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(peak, start + 0.006)
    gain.gain.linearRampToValueAtTime(peak * sustain, start + 0.05)
    gain.gain.setValueAtTime(peak * sustain, start + duration - 0.02)
    gain.gain.linearRampToValueAtTime(0.0001, start + duration)
    osc.connect(gain).connect(destination)
    osc.start(start)
    osc.stop(start + duration + 0.02)
  }

  // A pitch-bent "wobble" note — pulse with a small downward glide, the classic
  // chip-tune "boing" used for the pickup's cheeky landing.
  function boing(context, destination, freq, start, duration, peak) {
    var osc = context.createOscillator()
    var gain = context.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(freq, start)
    osc.frequency.exponentialRampToValueAtTime(freq * 0.94, start + duration)
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(peak, start + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
    osc.connect(gain).connect(destination)
    osc.start(start)
    osc.stop(start + duration + 0.02)
  }

  // The noise channel. kind 'tick' = short band-passed click (console on);
  // 'scratch' = a longer, lower sweep (the throat-clear); 'hit' = the full-band
  // landing hit.
  function noise(context, destination, kind, start) {
    var seconds = kind === 'scratch' ? 0.16 : kind === 'hit' ? 0.12 : 0.045
    var buffer = context.createBuffer(1, Math.max(1, context.sampleRate * seconds | 0), context.sampleRate)
    var data = buffer.getChannelData(0)
    for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    var src = context.createBufferSource()
    src.buffer = buffer
    var filter = context.createBiquadFilter()
    var gain = context.createGain()
    if (kind === 'scratch') {
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(1800, start)
      filter.frequency.exponentialRampToValueAtTime(500, start + seconds)
      filter.Q.value = 1.0
      gain.gain.setValueAtTime(0.16, start)
    } else if (kind === 'hit') {
      filter.type = 'lowpass'
      filter.frequency.value = 3200
      gain.gain.setValueAtTime(0.2, start)
    } else {
      filter.type = 'bandpass'
      filter.frequency.value = 2400
      filter.Q.value = 1.2
      gain.gain.setValueAtTime(0.15, start)
    }
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds)
    src.connect(filter).connect(gain).connect(destination)
    src.start(start)
  }

  function play(durationMs) {
    // Diagnostic stamp (read by the splash sync measurement): when the piece actually began.
    try { window.__vclawChimeStartedAt = performance.now() } catch (e) { /* no perf */ }
    try {
      var Ctor = window.AudioContext || window.webkitAudioContext
      if (!Ctor) return false
      var context = new Ctor()
      var master = context.createGain()
      master.gain.value = 0.5 // a greeting, not an interruption
      master.connect(context.destination)
      var t = context.currentTime + 0.02
      // SYNC (operator 2026-11-07): the music ALWAYS plays at its natural pitch and
      // tempo (110 BPM, ~4.64s) — never stretched. The LOGO overlay's hold is timed
      // to THIS length (see splash.holdMs), so the two end together. durationMs is
      // accepted for call-compatibility and used only as a sanity floor for the
      // watchdog, never to rescale the music.
      var EIGHTH = DEFAULT_EIGHTH
      var e = function (beats) { return t + beats * EIGHTH }

      // SYNC WATCHDOG: the overlay can leave EARLIER than the hold (renderer
      // initialized and faded it, or no scene existed). The music follows the
      // logo, not the clock: the moment the overlay hides or swaps to a scene,
      // the master gain ramps out and the piece ends with the logo.
      var stopWatchdog = null
      var overlay = document.getElementById('vclaw-splash')
      if (overlay) {
        stopWatchdog = setInterval(function () {
          var el = document.getElementById('vclaw-splash')
          if (!el || el.classList.contains('vclaw-splash--hidden') || el.classList.contains('vclaw-splash--scene')) {
            clearInterval(stopWatchdog)
            var now = context.currentTime
            master.gain.cancelScheduledValues(now)
            master.gain.setValueAtTime(master.gain.value, now)
            master.gain.linearRampToValueAtTime(0.0001, now + 0.35)
          }
        }, 150)
      }

      // ── bar 1: the cheeky pickup ("ta-daa?") ────────────────────────────────
      noise(context, master, 'tick', e(0))
      note(context, master, 'square', N.C5, e(0), EIGHTH * 0.9, 0.15, 0.55)
      note(context, master, 'square', N.G5, e(1), EIGHTH * 1.8, 0.16, 0.5)
      note(context, master, 'triangle', N.C4, e(0), EIGHTH * 3, 0.2, 0.8)
      // ...and the record-scratch: the fanfare clears its throat.
      noise(context, master, 'scratch', e(3))
      boing(context, master, N.E5, e(3.2), EIGHTH * 1.4, 0.13)

      // ── bar 2: the fanfare proper — rising C-major run ─────────────────────
      note(context, master, 'square', N.C5, e(5), EIGHTH * 0.9, 0.16, 0.55)
      note(context, master, 'square', N.D5, e(6), EIGHTH * 0.9, 0.16, 0.55)
      note(context, master, 'square', N.E5, e(7), EIGHTH * 0.9, 0.16, 0.55)
      note(context, master, 'square', N.G5, e(8), EIGHTH * 1.7, 0.17, 0.55)
      // pulse 2 harmonizes a sixth below:
      note(context, master, 'square', N.E4, e(5), EIGHTH * 0.9, 0.08, 0.5)
      note(context, master, 'square', N.F5, e(6), EIGHTH * 0.9, 0.08, 0.5) // E4's partner, cheeky passing tone
      note(context, master, 'square', N.G4, e(7), EIGHTH * 0.9, 0.08, 0.5)
      note(context, master, 'square', N.B4, e(8), EIGHTH * 1.7, 0.09, 0.5)
      // triangle walks the bass:
      note(context, master, 'triangle', N.C4, e(5), EIGHTH * 0.85, 0.2, 0.8)
      note(context, master, 'triangle', N.G3, e(6), EIGHTH * 0.85, 0.2, 0.8)
      note(context, master, 'triangle', N.A3, e(7), EIGHTH * 0.85, 0.2, 0.8)
      note(context, master, 'triangle', N.B3, e(8), EIGHTH * 1.7, 0.22, 0.8)
      noise(context, master, 'tick', e(6))
      noise(context, master, 'tick', e(8))

      // ── bar 3: the false ending and the punchline ───────────────────────────
      // The fanfare lands on G5 as if finished...
      note(context, master, 'square', N.G5, e(10), EIGHTH * 1.6, 0.17, 0.6)
      note(context, master, 'triangle', N.G3, e(10), EIGHTH * 1.6, 0.2, 0.8)
      // ...then HESITATES — the rest where the downbeat should be. Wait for it...
      // (nothing on beats 12–13; that IS the joke)
      // ...and resolves up the octave with the full-band hit:
      noise(context, master, 'hit', e(13.6))
      note(context, master, 'square', N.C6, e(13.6), EIGHTH * 3.4, 0.18, 0.6)
      note(context, master, 'square', N.E5, e(13.6), EIGHTH * 3.4, 0.1, 0.55)
      note(context, master, 'square', N.G5, e(14.1), EIGHTH * 2.9, 0.1, 0.55)
      note(context, master, 'triangle', N.C4, e(13.6), EIGHTH * 3.6, 0.24, 0.8)
      // the sparkly double-tick as the dust settles:
      noise(context, master, 'tick', e(15))
      noise(context, master, 'tick', e(15.5))

      // Let the context close itself once the tail is done — scaled to the
      // piece's actual length, watchdog cleared either way.
      var tailMs = Math.ceil(TOTAL_EIGHTHS * EIGHTH * 1000) + 1200
      setTimeout(function () {
        if (stopWatchdog) clearInterval(stopWatchdog)
        context.close().catch(function () {})
      }, tailMs)
      return true
    } catch (error) {
      return false
    }
  }

  window.__vclawSplashChime = play
})()
