'use client'

import { useEffect, useRef } from 'react'

interface Props {
  isThinking?: boolean
}

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  r: number          // base radius
  isHub: boolean     // hub nodes are bigger + brighter
  phase: number      // pulse phase
  phaseSpeed: number
}

export default function NeuralCanvas({ isThinking = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<Node[]>([])
  const rafRef = useRef<number>(0)
  const thinkingRef = useRef(isThinking)

  useEffect(() => { thinkingRef.current = isThinking }, [isThinking])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      buildNodes()
    }

    const buildNodes = () => {
      const w = canvas.width, h = canvas.height
      const total = Math.min(Math.floor(w * h / 8000) + 20, 90)
      const hubCount = Math.floor(total * 0.15)

      nodesRef.current = Array.from({ length: total }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: i < hubCount ? Math.random() * 3 + 3 : Math.random() * 1.5 + 1,
        isHub: i < hubCount,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: Math.random() * 0.025 + 0.01,
      }))
    }

    const draw = () => {
      if (!canvas) return
      const thinking = thinkingRef.current
      const w = canvas.width, h = canvas.height
      const speed = thinking ? 2.2 : 1
      const maxDist = thinking ? 180 : 150
      const t = Date.now() / 1000

      ctx.clearRect(0, 0, w, h)

      const nodes = nodesRef.current

      // Move nodes
      for (const n of nodes) {
        n.x += n.vx * speed
        n.y += n.vy * speed
        n.phase += n.phaseSpeed * speed
        if (n.x < 0 || n.x > w) n.vx *= -1
        if (n.y < 0 || n.y > h) n.vy *= -1
        n.x = Math.max(0, Math.min(w, n.x))
        n.y = Math.max(0, Math.min(h, n.y))
      }

      // Draw edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j]
          const dx = a.x - b.x, dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > maxDist) continue

          const strength = 1 - dist / maxDist
          const boost = (a.isHub || b.isHub) ? 2 : 1
          const alpha = strength * 0.55 * boost * (thinking ? 1.4 : 1)

          // Gradient line
          const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
          grad.addColorStop(0, `rgba(129,140,248,${alpha})`)   // indigo-400
          grad.addColorStop(0.5, `rgba(167,139,250,${alpha * 1.2})`) // violet-400
          grad.addColorStop(1, `rgba(129,140,248,${alpha})`)

          ctx.beginPath()
          ctx.strokeStyle = grad
          ctx.lineWidth = strength * (a.isHub || b.isHub ? 1.2 : 0.7)
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }

      // Draw nodes
      for (const n of nodes) {
        const pulse = Math.sin(n.phase) * 0.5 + 0.5  // 0..1
        const r = n.r + pulse * (n.isHub ? 2.5 : 1.2)
        const alpha = 0.55 + pulse * 0.45
        const color = n.isHub ? '167,139,250' : '129,140,248'  // violet / indigo

        // Outer glow
        const glowR = r * (n.isHub ? 5 : 3.5)
        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR)
        glow.addColorStop(0, `rgba(${color},${alpha * 0.5})`)
        glow.addColorStop(0.4, `rgba(${color},${alpha * 0.2})`)
        glow.addColorStop(1, `rgba(${color},0)`)
        ctx.beginPath()
        ctx.fillStyle = glow
        ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2)
        ctx.fill()

        // Core
        ctx.beginPath()
        ctx.fillStyle = `rgba(${color},${alpha})`
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
        ctx.fill()

        // Bright center
        ctx.beginPath()
        ctx.fillStyle = `rgba(224,231,255,${alpha * 0.8})`
        ctx.arc(n.x, n.y, r * 0.4, 0, Math.PI * 2)
        ctx.fill()
      }

      // Thinking: expanding rings from center
      if (thinking) {
        const cx = w / 2, cy = h / 2
        for (let i = 0; i < 4; i++) {
          const r = ((t * 90 + i * 70) % 320)
          const a = Math.max(0, 0.4 - r / 320)
          ctx.beginPath()
          ctx.strokeStyle = `rgba(167,139,250,${a})`
          ctx.lineWidth = 1.5
          ctx.arc(cx, cy, r, 0, Math.PI * 2)
          ctx.stroke()
        }
        // Electric arc between 2 random nodes occasionally
        if (nodes.length > 10) {
          const i = Math.floor(t * 3) % nodes.length
          const j = (i + 7) % nodes.length
          const a = nodes[i], b = nodes[j]
          ctx.beginPath()
          ctx.strokeStyle = 'rgba(224,231,255,0.4)'
          ctx.lineWidth = 1
          ctx.setLineDash([4, 6])
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
          ctx.setLineDash([])
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
    />
  )
}
