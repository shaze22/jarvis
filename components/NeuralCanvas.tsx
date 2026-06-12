'use client'

import { useEffect, useRef } from 'react'

interface Props {
  isThinking?: boolean
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  pulse: number
  pulseSpeed: number
}

const BASE_COLOR = '99,102,241'   // indigo-500
const ACTIVE_COLOR = '139,92,246' // violet-500

export default function NeuralCanvas({ isThinking = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef<number>(0)
  const thinkingRef = useRef(isThinking)

  useEffect(() => { thinkingRef.current = isThinking }, [isThinking])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    function resize() {
      if (!canvas) return
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      init()
    }

    function init() {
      if (!canvas) return
      const count = Math.floor((canvas.width * canvas.height) / 12000)
      particlesRef.current = Array.from({ length: Math.min(count, 80) }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 1.5 + 1,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
      }))
    }

    function draw() {
      if (!canvas) return
      const thinking = thinkingRef.current
      const w = canvas.width
      const h = canvas.height
      const speed = thinking ? 2.5 : 1
      const maxDist = thinking ? 160 : 130
      const color = thinking ? ACTIVE_COLOR : BASE_COLOR

      ctx.clearRect(0, 0, w, h)

      const particles = particlesRef.current

      // Update positions
      for (const p of particles) {
        p.x += p.vx * speed
        p.y += p.vy * speed
        p.pulse += p.pulseSpeed * speed

        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > maxDist) continue

          const alpha = (1 - dist / maxDist) * (thinking ? 0.35 : 0.18)
          ctx.beginPath()
          ctx.strokeStyle = `rgba(${color},${alpha})`
          ctx.lineWidth = thinking ? 0.8 : 0.5
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }

      // Draw nodes
      for (const p of particles) {
        const glowSize = p.radius + Math.sin(p.pulse) * (thinking ? 2.5 : 1.2)
        const alpha = 0.5 + Math.sin(p.pulse) * (thinking ? 0.5 : 0.25)

        // Outer glow
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize * 3)
        grad.addColorStop(0, `rgba(${color},${alpha * 0.6})`)
        grad.addColorStop(1, `rgba(${color},0)`)
        ctx.beginPath()
        ctx.fillStyle = grad
        ctx.arc(p.x, p.y, glowSize * 3, 0, Math.PI * 2)
        ctx.fill()

        // Core dot
        ctx.beginPath()
        ctx.fillStyle = `rgba(${color},${alpha})`
        ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2)
        ctx.fill()
      }

      // Pulse ring from center when thinking
      if (thinking) {
        const cx = w / 2, cy = h / 2
        const t = Date.now() / 1000
        for (let ring = 0; ring < 3; ring++) {
          const r = ((t * 80 + ring * 80) % 260)
          const a = Math.max(0, 0.25 - r / 260)
          ctx.beginPath()
          ctx.strokeStyle = `rgba(${color},${a})`
          ctx.lineWidth = 1.5
          ctx.arc(cx, cy, r, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    draw()

    return () => {
      ro.disconnect()
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.85 }}
    />
  )
}
