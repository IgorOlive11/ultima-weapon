import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LuX, LuSkipForward } from 'react-icons/lu'
import { useStore } from '../hooks/useStore'

export default function GlobalRestTimer() {
  const restTimer    = useStore(s => s.restTimer)
  const stopRestTimer = useStore(s => s.stopRestTimer)
  const hasBottomPad = restTimer.running || restTimer.seconds === 0

  const pct = restTimer.preset > 0
    ? Math.max(0, restTimer.seconds / restTimer.preset)
    : 0

  const isDone = restTimer.preset > 0 && restTimer.seconds === 0

  const fmtTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  const barColor = isDone
    ? '#39FF14'
    : pct > 0.5
    ? '#39FF14'
    : pct > 0.2
    ? '#ffaa00'
    : '#ff2d2d'

  return (
    <>
      {/* spacer so content isn't hidden behind the bar */}
      <AnimatePresence>
        {restTimer.running && (
          <motion.div
            key="spacer"
            initial={{ height: 0 }}
            animate={{ height: 72 }}
            exit={{ height: 0 }}
            className="flex-shrink-0"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {restTimer.running && (
          <motion.div
            key="timer-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0,  opacity: 1 }}
            exit={{ y: 80,   opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed bottom-0 left-0 right-0 z-[300] max-w-[430px] mx-auto"
          >
            {/* progress stripe */}
            <div className="h-[3px] bg-border1 relative overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0"
                animate={{ width: `${pct * 100}%` }}
                transition={{ duration: 1, ease: 'linear' }}
                style={{ background: barColor }}
              />
            </div>

            <div className="bg-s1 border-t border-border1 px-4 py-3 flex items-center gap-3">
              {/* time */}
              <motion.div
                key={restTimer.seconds}
                initial={{ scale: 1.15, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`font-display text-3xl leading-none tracking-wider min-w-[72px] ${
                  isDone ? 'text-neon' : 'text-ink'
                }`}
              >
                {isDone ? 'GO!' : fmtTime(restTimer.seconds)}
              </motion.div>

              {/* label */}
              <div className="flex-1">
                <div className="font-mono text-[10px] text-muted tracking-[0.2em] uppercase">
                  {isDone ? 'DESCANSADO — BOA SORTE' : 'DESCANSO'}
                </div>
                <div className="h-1.5 bg-border1 mt-1 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    animate={{ width: `${pct * 100}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                    style={{ background: barColor }}
                  />
                </div>
              </div>

              {/* dismiss */}
              <button
                onClick={stopRestTimer}
                className="p-2 rounded-sm text-muted hover:text-neon hover:bg-neon/10 transition-colors"
              >
                {isDone ? <LuSkipForward size={18} /> : <LuX size={18} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
