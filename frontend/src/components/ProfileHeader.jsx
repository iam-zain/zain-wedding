import { useRef, useState } from 'react'
import { siteConfig, SITE_URL, ACCESS_KEY_PARAM, STAT_EASTER_EGGS, AVATAR_LONGPRESS_MESSAGES } from '../config'
import { shareUrl } from '../lib/share'
import { applyAccessKeyParam, useUnlockedTiers } from '../lib/access'
import { playChime } from '../lib/sound'
import { useToast } from './toast-context'
import EasterEggModal from './EasterEggModal'
import { DownloadIcon, ExternalLinkIcon, KeyIcon, MoreIcon, ShareIcon, WhatsAppIcon } from './icons'
import { useRecordPlayer } from '../lib/useRecordPlayer'

const STAT_TAP_WINDOW_MS = 3000
const STAT_TAPS_REQUIRED = 5
const AVATAR_LONG_PRESS_MS = 600

function Stat({ value, label, onTap, popping }) {
  return (
    <button
      type="button"
      data-testid={`profile-stat-${label}`}
      onClick={onTap}
      className={`text-center transition-transform duration-200 ${popping ? 'scale-125' : 'scale-100'}`}
    >
      <div className="text-base font-semibold leading-tight">{value}</div>
      <div className="text-xs text-ig-muted">{label}</div>
    </button>
  )
}

export default function ProfileHeader() {
  const { profile, menu = [] } = siteConfig
  const [menuOpen, setMenuOpen] = useState(false)
  const [accessSheetOpen, setAccessSheetOpen] = useState(false)
  const [accessInput, setAccessInput] = useState('')
  const toast = useToast()
  const { isPlaying, toggle: toggleMusic } = useRecordPlayer()
  const [poppingStat, setPoppingStat] = useState(null)
  const [egg, setEgg] = useState(null)
  const statTapTimesRef = useRef({})
  const avatarPressTimerRef = useRef(null)
  const unlockedTiers = useUnlockedTiers()
  const tierLetters = 'ABCDE'
  const versionStr = unlockedTiers
    .filter((t) => t >= 1 && t <= 5)
    .map((t) => tierLetters[t - 1])
    .join('.')

  function onAccessLinkSubmit() {
    let keyParam = accessInput.trim()
    // Accept a full URL or a raw key param value
    try {
      const parsed = new URL(keyParam)
      keyParam = parsed.searchParams.get(ACCESS_KEY_PARAM) || keyParam
    } catch {
      // not a URL — treat the input as the raw key value
    }
    const count = applyAccessKeyParam(keyParam)
    if (count > 0) {
      toast('🔓 Content unlock ho gaya!')
    } else {
      toast('Link kaam nahi kiya 😕')
    }
    setAccessInput('')
    setAccessSheetOpen(false)
  }

  function handleStatTap(label) {
    const now = Date.now()
    const recent = (statTapTimesRef.current[label] || []).filter((ts) => now - ts < STAT_TAP_WINDOW_MS)
    recent.push(now)
    statTapTimesRef.current[label] = recent

    if (recent.length < STAT_TAPS_REQUIRED) return
    statTapTimesRef.current[label] = []

    const messages = STAT_EASTER_EGGS[label]
    if (messages?.length) setEgg({ message: messages[Math.floor(Math.random() * messages.length)], icon: '🎊' })
    playChime()
    setPoppingStat(label)
    setTimeout(() => setPoppingStat(null), 400)
  }

  function handleAvatarPressStart() {
    clearTimeout(avatarPressTimerRef.current)
    avatarPressTimerRef.current = setTimeout(() => {
      const msg = AVATAR_LONGPRESS_MESSAGES[Math.floor(Math.random() * AVATAR_LONGPRESS_MESSAGES.length)]
      setEgg({ message: msg, icon: '🤍' })
      playChime()
    }, AVATAR_LONG_PRESS_MS)
  }

  function handleAvatarPressEnd() {
    clearTimeout(avatarPressTimerRef.current)
  }

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
    <>
      <section data-testid="profile-header" className="px-4 pt-3">
      {/* Top row: username + ... menu */}
      <div className="relative flex items-center justify-between">
        <span data-testid="profile-username" className="text-base font-semibold">{profile.username}</span>
        <button
          type="button"
          aria-label="More options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          data-testid="profile-more-button"
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
              data-testid="profile-menu"
              className="absolute right-0 top-9 z-50 w-60 overflow-hidden rounded-xl border border-ig-border bg-ig-card shadow-2xl"
            >
              <a
                href="/docs/wedding-invite.pdf"
                target="_blank"
                rel="noopener noreferrer"
                download="Zain-Wedding-Invite.pdf"
                role="menuitem"
                data-testid="profile-menu-download-invite"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm active:bg-ig-elevated border-b border-ig-border"
              >
                <span className="truncate">Download Wedding Invite</span>
                <DownloadIcon size={16} className="shrink-0 text-ig-muted" />
              </a>
              {menu.length > 0 && menu.map((item, i) => (
                <a
                  key={item.label + item.url}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="menuitem"
                  data-testid={`profile-menu-item-${i}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm active:bg-ig-elevated border-b border-ig-border"
                >
                  <span className="truncate">{item.label}</span>
                  <ExternalLinkIcon size={16} className="shrink-0 text-ig-muted" />
                </a>
              ))}
              <button
                type="button"
                role="menuitem"
                data-testid="profile-menu-access-link"
                onClick={() => { setMenuOpen(false); setAccessSheetOpen(true) }}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm active:bg-ig-elevated"
              >
                <span className="truncate">Enter access link</span>
                <KeyIcon size={16} className="shrink-0 text-ig-muted" />
              </button>
              <div className="border-t border-ig-border px-4 py-2 text-[10px] text-ig-faint">
                {versionStr ? `Version: ${versionStr}` : 'Version: –'}
              </div>
            </div>
          </>
        )}

        {/* Access link bottom sheet */}
        {accessSheetOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60"
              onClick={() => setAccessSheetOpen(false)}
            />
            <div
              data-testid="access-sheet"
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-ig-border bg-ig-elevated px-4 pb-10 pt-5"
            >
              <div className="mb-1 text-center text-base font-semibold">Access link</div>
              <p className="mb-4 text-center text-sm text-ig-muted">
                Paste your invite URL to unlock exclusive content
              </p>
              <input
                type="url"
                value={accessInput}
                onChange={(e) => setAccessInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onAccessLinkSubmit()}
                placeholder="https://zain-wedding.pages.dev?key=…"
                autoFocus
                data-testid="access-sheet-input"
                className="w-full rounded-xl border border-ig-border bg-ig-card px-3 py-2.5 text-sm text-ig-text placeholder:text-ig-faint outline-none focus:border-ig-muted"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  data-testid="access-sheet-cancel"
                  onClick={() => setAccessSheetOpen(false)}
                  className="flex-1 rounded-xl bg-ig-card py-2.5 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="access-sheet-unlock"
                  onClick={onAccessLinkSubmit}
                  className="flex-1 rounded-xl bg-ig-blue py-2.5 text-sm font-semibold text-white"
                >
                  Unlock
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Avatar + stats */}
      <div className="mt-4 flex items-center gap-5">
        <button
          type="button"
          aria-label={isPlaying ? 'Pause music' : 'Play music'}
          data-testid="profile-avatar-button"
          onClick={toggleMusic}
          onPointerDown={handleAvatarPressStart}
          onPointerUp={handleAvatarPressEnd}
          onPointerLeave={handleAvatarPressEnd}
          className="relative shrink-0 rounded-full focus:outline-none"
        >
          <img
            src={profile.avatarUrl}
            alt={profile.displayName}
            data-testid="profile-avatar-image"
            className={`h-[88px] w-[88px] rounded-full object-cover ring-2 ring-ig-border transition-shadow duration-500 ${isPlaying ? 'animate-record-spin ring-purple-500/70 shadow-[0_0_18px_4px_rgba(168,85,247,0.45)]' : ''}`}
          />
          {isPlaying && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/20">
              <span className="text-xl leading-none">🎵</span>
            </span>
          )}
        </button>
        <div className="flex flex-1 justify-around">
          <Stat
            value={profile.postCount}
            label="posts"
            onTap={() => handleStatTap('posts')}
            popping={poppingStat === 'posts'}
          />
          <Stat
            value={profile.followersCount}
            label="guests"
            onTap={() => handleStatTap('guests')}
            popping={poppingStat === 'guests'}
          />
          <Stat
            value={profile.followingCount}
            label="families"
            onTap={() => handleStatTap('families')}
            popping={poppingStat === 'families'}
          />
        </div>
      </div>

      {/* Name + bio + link */}
      <div className="mt-3">
        <div data-testid="profile-display-name" className="text-sm font-semibold">{profile.displayName}</div>
        {profile.bio && (
          <p data-testid="profile-bio" className="mt-0.5 whitespace-pre-line text-sm leading-snug text-ig-text">{profile.bio}</p>
        )}
        {profile.link && (
          <a
            href={profile.link}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="profile-link"
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
          data-testid="profile-whatsapp-link"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-wa px-3 py-1.5 text-sm font-semibold text-black active:opacity-90"
        >
          <WhatsAppIcon size={18} />
          Connect
        </a>
        <button
          type="button"
          data-testid="profile-share-button"
          onClick={onShareProfile}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ig-card px-3 py-1.5 text-sm font-semibold text-ig-text active:opacity-90"
        >
          <ShareIcon size={16} />
          Share Profile
        </button>
      </div>
      </section>
      {egg && (
        <EasterEggModal
          message={egg.message}
          icon={egg.icon}
          onClose={() => setEgg(null)}
          testId="profile-egg"
        />
      )}
    </>
  )
}
