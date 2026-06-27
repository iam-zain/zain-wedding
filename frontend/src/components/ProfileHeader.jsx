import { useState } from 'react'
import { siteConfig, SITE_URL } from '../config'
import { shareUrl } from '../lib/share'
import { useToast } from './toast-context'
import { ExternalLinkIcon, MoreIcon, ShareIcon, WhatsAppIcon } from './icons'
import { useRecordPlayer } from '../lib/useRecordPlayer'

function Stat({ value, label }) {
  return (
    <div className="text-center">
      <div className="text-base font-semibold leading-tight">{value}</div>
      <div className="text-xs text-ig-muted">{label}</div>
    </div>
  )
}

export default function ProfileHeader() {
  const { profile, menu = [] } = siteConfig
  const [menuOpen, setMenuOpen] = useState(false)
  const toast = useToast()
  const { isPlaying, toggle: toggleMusic } = useRecordPlayer()

  async function onShareProfile() {
    const result = await shareUrl({
      url: SITE_URL,
      title: profile.displayName,
      text: `${profile.displayName} — join the celebration! 🎉`,
    })
    if (result === 'copied') toast('🔗 Link copy ho gaya!')
    else if (result === 'failed') toast('Share nahi ho paaya 😅')
  }

  return (
    <section className="px-4 pt-3">
      {/* Top row: username + ... menu */}
      <div className="relative flex items-center justify-between">
        <span className="text-base font-semibold">{profile.username}</span>
        <button
          type="button"
          aria-label="More options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="-mr-1 rounded-full p-1.5 active:bg-ig-card"
        >
          <MoreIcon size={24} />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div
              role="menu"
              className="absolute right-0 top-9 z-50 w-60 overflow-hidden rounded-xl border border-ig-border bg-ig-card shadow-2xl"
            >
              {menu.length === 0 && (
                <div className="px-4 py-3 text-sm text-ig-muted">No links yet</div>
              )}
              {menu.map((item) => (
                <a
                  key={item.label + item.url}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm active:bg-ig-elevated"
                >
                  <span className="truncate">{item.label}</span>
                  <ExternalLinkIcon size={16} className="shrink-0 text-ig-muted" />
                </a>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Avatar + stats */}
      <div className="mt-4 flex items-center gap-5">
        <button
          type="button"
          aria-label={isPlaying ? 'Pause music' : 'Play music'}
          onClick={toggleMusic}
          className="relative shrink-0 rounded-full focus:outline-none"
        >
          <img
            src={profile.avatarUrl}
            alt={profile.displayName}
            className={`h-[88px] w-[88px] rounded-full object-cover ring-2 ring-ig-border transition-shadow duration-500 ${isPlaying ? 'animate-record-spin ring-purple-500/70 shadow-[0_0_18px_4px_rgba(168,85,247,0.45)]' : ''}`}
          />
          {isPlaying && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/20">
              <span className="text-xl leading-none">🎵</span>
            </span>
          )}
        </button>
        <div className="flex flex-1 justify-around">
          <Stat value={profile.postCount} label="posts" />
          <Stat value={profile.followersCount} label="guests" />
          <Stat value={profile.followingCount} label="families" />
        </div>
      </div>

      {/* Name + bio + link */}
      <div className="mt-3">
        <div className="text-sm font-semibold">{profile.displayName}</div>
        {profile.bio && (
          <p className="mt-0.5 whitespace-pre-line text-sm leading-snug text-ig-text">{profile.bio}</p>
        )}
        {profile.link && (
          <a
            href={profile.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-block text-sm font-semibold text-[#e0f1ff]"
          >
            {profile.linkLabel || profile.link}
          </a>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex gap-2">
        <a
          href={profile.whatsappGroupUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-wa px-3 py-1.5 text-sm font-semibold text-black active:opacity-90"
        >
          <WhatsAppIcon size={18} />
          Connect
        </a>
        <button
          type="button"
          onClick={onShareProfile}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ig-card px-3 py-1.5 text-sm font-semibold text-ig-text active:opacity-90"
        >
          <ShareIcon size={16} />
          Share Profile
        </button>
      </div>
    </section>
  )
}
