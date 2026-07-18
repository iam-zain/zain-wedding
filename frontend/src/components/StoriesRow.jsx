import { useState } from 'react'
import { useViewedStories } from '../lib/storage'
import StoryViewer from './StoryViewer'

export default function StoriesRow({ stories }) {
  const { has: isViewed, add: markViewed } = useViewedStories()
  const [openAt, setOpenAt] = useState(null)

  if (!stories || stories.length === 0) return null

  return (
    <>
      <div data-testid="stories-row" className="no-scrollbar flex gap-4 overflow-x-auto px-4 py-4">
        {stories.map((story, i) => {
          const viewed = isViewed(story.id)
          return (
            <button
              key={story.id}
              type="button"
              data-testid={`story-item-${story.id}`}
              onClick={() => setOpenAt(i)}
              className="flex w-16 shrink-0 flex-col items-center gap-1"
            >
              <span
                className={`rounded-full p-[2px] ${viewed ? 'bg-ig-border' : 'story-ring'}`}
              >
                <span className="block rounded-full bg-ig-black p-[2px]">
                  <img
                    src={story.imageUrl}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover"
                    draggable={false}
                  />
                </span>
              </span>
              <span className="w-16 truncate text-center text-[11px] text-ig-muted">
                {story.label || 'update'}
              </span>
            </button>
          )
        })}
      </div>

      {openAt != null && (
        <StoryViewer
          stories={stories}
          startIndex={openAt}
          onClose={() => setOpenAt(null)}
          onViewed={markViewed}
        />
      )}
    </>
  )
}
