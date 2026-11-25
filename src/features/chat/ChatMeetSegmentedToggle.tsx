import { MessageSquare, Video } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useRef } from 'react'

export interface ChatMeetSegmentedToggleProps {
  view: 'chat' | 'meet'
  onViewChange: (view: 'chat' | 'meet') => void
  isMeetingActive?: boolean
  fullWidth?: boolean
}

export function ChatMeetSegmentedToggle({
  view,
  onViewChange,
  isMeetingActive = false,
  fullWidth = false,
}: ChatMeetSegmentedToggleProps) {
  const chatRef = useRef<HTMLButtonElement>(null)
  const meetRef = useRef<HTMLButtonElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      onViewChange('meet')
      meetRef.current?.focus()
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      onViewChange('chat')
      chatRef.current?.focus()
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Chat and Meet views"
      onKeyDown={onKeyDown}
      className={`relative grid grid-cols-2 p-[3px] h-9 rounded-full bg-black/[0.06] dark:bg-black/40 border border-border/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] backdrop-blur-md select-none ${
        fullWidth ? 'w-full' : 'w-[160px]'
      }`}
    >
      {/* Chat Tab */}
      <button
        ref={chatRef}
        type="button"
        role="tab"
        id="tab-chat"
        aria-selected={view === 'chat'}
        aria-controls="panel-chat"
        tabIndex={view === 'chat' ? 0 : -1}
        onClick={() => onViewChange('chat')}
        className={`group/segment relative flex items-center justify-center rounded-full text-xs cursor-pointer transition-transform duration-100 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface motion-reduce:transform-none before:absolute before:inset-x-0 before:-top-1 before:-bottom-1 before:content-[''] ${
          view === 'chat'
            ? 'font-semibold text-text'
            : 'font-medium text-text-secondary hover:text-text'
        }`}
      >
        {view === 'chat' && (
          <motion.div
            layoutId="chatMeetSegmentedThumb"
            className="absolute inset-0 rounded-full bg-white dark:bg-white/[0.14] border border-black/[0.08] dark:border-white/[0.12] shadow-[0_1px_3px_rgba(0,0,0,0.25)] pointer-events-none z-0"
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    duration: 0.28,
                    ease: [0.22, 1, 0.36, 1],
                  }
            }
          />
        )}
        <span className="relative z-10 flex items-center justify-center gap-1.5 min-w-0">
          <MessageSquare
            className={`size-4 stroke-[1.85] shrink-0 transition-colors ${
              view === 'chat'
                ? 'text-primary-ink'
                : 'text-text-secondary group-hover/segment:text-text'
            }`}
            aria-hidden="true"
          />
          <span className="truncate">Chat</span>
        </span>
      </button>

      {/* Meet Tab */}
      <button
        ref={meetRef}
        type="button"
        role="tab"
        id="tab-meet"
        aria-selected={view === 'meet'}
        aria-controls="panel-meet"
        tabIndex={view === 'meet' ? 0 : -1}
        onClick={() => onViewChange('meet')}
        className={`group/segment relative flex items-center justify-center rounded-full text-xs cursor-pointer transition-transform duration-100 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface motion-reduce:transform-none before:absolute before:inset-x-0 before:-top-1 before:-bottom-1 before:content-[''] ${
          view === 'meet'
            ? 'font-semibold text-text'
            : 'font-medium text-text-secondary hover:text-text'
        }`}
      >
        {view === 'meet' && (
          <motion.div
            layoutId="chatMeetSegmentedThumb"
            className="absolute inset-0 rounded-full bg-white dark:bg-white/[0.14] border border-black/[0.08] dark:border-white/[0.12] shadow-[0_1px_3px_rgba(0,0,0,0.25)] pointer-events-none z-0"
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    duration: 0.28,
                    ease: [0.22, 1, 0.36, 1],
                  }
            }
          />
        )}
        <span className="relative z-10 flex items-center justify-center gap-1.5 min-w-0">
          <Video
            className={`size-4 stroke-[1.85] shrink-0 transition-colors ${
              view === 'meet'
                ? 'text-primary-ink'
                : 'text-text-secondary group-hover/segment:text-text'
            }`}
            aria-hidden="true"
          />
          <span className="truncate">Meet</span>
          {isMeetingActive && (
            <span className="relative flex size-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            </span>
          )}
        </span>
      </button>
    </div>
  )
}
