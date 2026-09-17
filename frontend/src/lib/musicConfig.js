// Playlist for the avatar's record player. Add an entry to extend it.
//
// The tracks are instrumental, so the labels are ours to choose — they run in
// the rough order of the wedding itself, from the first glance to the life
// after it, so a guest cycling through them walks the whole arc.
//
// `src` is the identity, not the label: played tracks are recorded by src, so
// renaming a track never costs a guest their "Poora DJ" progress.
export const MUSIC_TRACKS = [
  { src: '/audio/music/music-1.mp3', label: 'Pehli Nazar' },
  { src: '/audio/music/music-2.mp3', label: 'Rishta' },
  { src: '/audio/music/music-3.mp3', label: 'Shehnai' },
  { src: '/audio/music/music-4.mp3', label: 'Haldi ki Dhoop' },
  { src: '/audio/music/music-5.mp3', label: 'Mehendi Raat' },
  { src: '/audio/music/music-6.mp3', label: 'Baraat' },
  { src: '/audio/music/music-7.mp3', label: 'Qubool Hai' },
  { src: '/audio/music/music-8.mp3', label: 'Dua' },
  { src: '/audio/music/music-9.mp3', label: 'Rukhsati' },
  { src: '/audio/music/music-10.mp3', label: 'Walime ki Shaam' },
  { src: '/audio/music/music-11.mp3', label: 'Hamesha' },
]

/** Label for a src, or a gentle fallback if the path is no longer listed. */
export function trackLabel(src) {
  return MUSIC_TRACKS.find((t) => t.src === src)?.label || 'Shaadi ki dhun'
}
