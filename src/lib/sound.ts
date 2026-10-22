import type { Soundscape } from '../types'

type NoiseName = 'white' | 'brown' | 'pink'

/**
 * Generates ambient focus noise with WebAudio — no audio files, no network.
 * Everything is created on demand and torn down when the sound stops.
 */
class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private source: AudioBufferSourceNode | null = null
  private current: Soundscape = 'off'
  private volume = 0.35
  private lfo: OscillatorNode | null = null
  private lfoGain: GainNode | null = null

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0
      this.master.connect(this.ctx.destination)
    }
    return this.ctx
  }

  private noiseBuffer(ctx: AudioContext, name: NoiseName): AudioBuffer {
    const seconds = 4
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    if (name === 'white') {
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
      return buffer
    }
    if (name === 'brown') {
      let last = 0
      for (let i = 0; i < data.length; i += 1) {
        const white = Math.random() * 2 - 1
        last = (last + 0.02 * white) / 1.02
        data[i] = last * 3.5
      }
      return buffer
    }
    // Pink noise (Paul Kellet's economy filter)
    let b0 = 0
    let b1 = 0
    let b2 = 0
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1
      b0 = 0.99765 * b0 + white * 0.099046
      b1 = 0.963 * b1 + white * 0.2965164
      b2 = 0.57 * b2 + white * 1.0526913
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.18
    }
    return buffer
  }

  start(scape: Soundscape, volume = this.volume): void {
    this.stop()
    if (scape === 'off') return
    const ctx = this.ensureContext()
    if (!ctx || !this.master) return
    void ctx.resume().catch(() => undefined)
    this.current = scape
    this.volume = volume

    const bufferName: NoiseName = scape === 'rain' ? 'white' : scape === 'brown' ? 'brown' : 'pink'
    const source = ctx.createBufferSource()
    source.buffer = this.noiseBuffer(ctx, bufferName)
    source.loop = true

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = scape === 'rain' ? 7000 : scape === 'brown' ? 620 : 1100
    filter.Q.value = 0.6

    const highpass = ctx.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.value = scape === 'rain' ? 520 : 40

    const bed = ctx.createGain()
    bed.gain.value = scape === 'rain' ? 0.5 : scape === 'brown' ? 1 : 0.8

    source.connect(highpass)
    highpass.connect(filter)
    filter.connect(bed)
    bed.connect(this.master)

    // A very slow swell keeps the loop from feeling static.
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.frequency.value = scape === 'rain' ? 0.12 : 0.07
    lfoGain.gain.value = 0.0035
    lfo.connect(lfoGain)
    lfoGain.connect(this.master.gain)
    lfo.start()

    source.start()
    this.source = source
    this.lfo = lfo
    this.lfoGain = lfoGain

    const target = Math.max(0.0001, this.volume * 0.55)
    this.master.gain.cancelScheduledValues(ctx.currentTime)
    this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), ctx.currentTime)
    this.master.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.9)
  }

  setVolume(volume: number): void {
    this.volume = volume
    if (!this.ctx || !this.master || this.current === 'off') return
    const target = Math.max(0.0001, volume * 0.55)
    this.master.gain.cancelScheduledValues(this.ctx.currentTime)
    this.master.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.25)
  }

  stop(): void {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const gain = this.master.gain
    gain.cancelScheduledValues(ctx.currentTime)
    gain.setValueAtTime(gain.value, ctx.currentTime)
    gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35)
    const source = this.source
    const lfo = this.lfo
    const lfoGain = this.lfoGain
    window.setTimeout(() => {
      try {
        source?.stop()
        lfo?.stop()
        source?.disconnect()
        lfo?.disconnect()
        lfoGain?.disconnect()
      } catch {
        /* already stopped */
      }
    }, 420)
    this.source = null
    this.lfo = null
    this.lfoGain = null
    this.current = 'off'
  }

  chime(kind: 'focus' | 'break' = 'focus'): void {
    const ctx = this.ensureContext()
    if (!ctx || !this.master) return
    void ctx.resume().catch(() => undefined)
    const notes = kind === 'focus' ? [523.25, 659.25, 783.99] : [783.99, 659.25, 523.25]
    const now = ctx.currentTime + 0.05
    notes.forEach((frequency, index) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = frequency
      const startAt = now + index * 0.16
      gain.gain.setValueAtTime(0.0001, startAt)
      gain.gain.exponentialRampToValueAtTime(0.16, startAt + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 1.15)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(startAt)
      osc.stop(startAt + 1.2)
    })
  }
}

export const soundEngine = new SoundEngine()
