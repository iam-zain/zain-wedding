import { useEffect, useRef } from 'react'

/**
 * Decorative ambient gradient behind the profile/countdown section. Drifts
 * slightly slower than the page on scroll (parallax) and fades out once
 * scrolled past. Pure DOM writes (no React state) so scrolling stays cheap;
 * absolutely positioned + first in the DOM, so every opaque card painted
 * after it in normal flow simply covers it — no z-index needed.
 */
export default function HeroGlow() {
  const layerRef = useRef(null)

  useEffect(() => {
    let raf = null

    function apply() {
      raf = null
      const y = window.scrollY
      const el = layerRef.current
      if (!el) return
      el.style.transform = `translateY(${y * 0.15}px)`
      el.style.opacity = String(Math.max(0, 1 - y / 500))
    }

    function onScroll() {
      if (raf) return
      raf = requestAnimationFrame(apply)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[560px] overflow-hidden">
      <div
        ref={layerRef}
        className="absolute inset-x-0 top-0 h-full"
        style={{
          background:
            'radial-gradient(circle at 20% 8%, rgba(237,73,86,0.28), transparent 45%), ' +
            'radial-gradient(circle at 85% 22%, rgba(0,149,246,0.22), transparent 45%), ' +
            'radial-gradient(circle at 50% 52%, rgba(254,218,117,0.16), transparent 50%)',
          filter: 'blur(40px)',
        }}
      />
    </div>
  )
}
