import React, { useState, useRef, useCallback } from 'react'
import {
  LuZap, LuCircleX, LuPlay, LuRotateCcw,
  LuCircleCheck, LuArrowDownToLine,
} from 'react-icons/lu'
import DoomFace from './DoomFace'
import { fmtKg, calcLoads } from '../utils/loads'
import { GER_CONFIG } from '../data/protocol'

const MAX_BLOCKS = 12

export default function MuscleRoundCard({ exercise, weekIdx, dayIdx, exIdx, onSave, savedLog, isFirst }) {
  const [open, setOpen]         = useState(false)
  const [topKg, setTopKg]       = useState(savedLog?.kg || '')
  const [blocksCompleted, setBlocksCompleted] = useState(savedLog?.blocks || 0)
  const [failed, setFailed]     = useState(false)
  const [failedBlock, setFailedBlock] = useState(savedLog?.failedBlock || null)
  const [timerSecs, setTimerSecs] = useState(10)
  const [timerRunning, setTimerRunning] = useState(false)
  const [obs, setObs]           = useState(savedLog?.obs || '')
  const [saved, setSaved]       = useState(false)
  const intervalRef             = useRef(null)

  const loads = calcLoads(parseFloat(topKg))
  const gerConf = GER_CONFIG[11]

  const startTimer = useCallback(() => {
    clearInterval(intervalRef.current)
    setTimerSecs(10)
    setTimerRunning(true)
    intervalRef.current = setInterval(() => {
      setTimerSecs((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current)
          setTimerRunning(false)
          if (navigator.vibrate) navigator.vibrate([80, 40, 80])
          return 0
        }
        return s - 1
      })
    }, 1000)
  }, [])

  const handleBlockDone = () => {
    if (failed) return
    const next = blocksCompleted + 1
    setBlocksCompleted(next)
    if (next < MAX_BLOCKS) startTimer()
  }

  const handleFail = () => {
    clearInterval(intervalRef.current)
    setTimerRunning(false)
    setFailed(true)
    setFailedBlock(blocksCompleted)
  }

  const resetBlocks = () => {
    clearInterval(intervalRef.current)
    setTimerRunning(false)
    setFailed(false)
    setFailedBlock(null)
    setBlocksCompleted(0)
    setTimerSecs(10)
  }

  const handleSave = () => {
    if (!topKg) return
    onSave({ kg: topKg, blocks: blocksCompleted, failedBlock, obs })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const timerColor = timerSecs <= 3 ? '#ff2d2d' : '#39FF14'

  return (
    <div
      className={`bg-s1 border mb-1.5 overflow-hidden transition-all duration-200
        ${open ? 'border-[#ff2d2d]' : 'border-border1'}`}
      style={{ borderLeftWidth: 3, borderLeftColor: open ? '#ff2d2d' : '#2a2a2a' }}
    >
      {/* Header row */}
      <button
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <DoomFace ger={11} size={30} />
        <div className="flex-1 min-w-0">
          <div className="font-body font-bold text-sm text-ink leading-tight truncate">
            {exercise.name}
          </div>
          <div className="font-mono text-[10px] text-muted mt-0.5">
            muscle round · blocos de 4 reps · <span className="text-[#ff2d2d]">GER 11</span>
          </div>
        </div>
        {savedLog?.kg && (
          <LuCircleCheck size={14} className="text-neon flex-shrink-0" />
        )}
        <span
          className="font-mono text-[10px] font-bold text-[#ff2d2d] flex-shrink-0"
        >GER11</span>
        <LuZap
          size={14}
          className={`flex-shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Body */}
      {open && (
        <div className="px-3 pb-3 animate-slide-down">
          {/* Type chip */}
          <div className="inline-flex items-center gap-2 border border-[#ff2d2d] bg-[#ff2d2d]/5 px-2.5 py-1 mb-3">
            <DoomFace ger={11} size={16} />
            <span className="font-mono text-[10px] text-[#ff2d2d] font-bold tracking-widest">
              MUSCLE ROUND
            </span>
          </div>

          {/* GER info */}
          <div className="flex items-center gap-2.5 bg-s2 border border-border1 p-2.5 mb-3">
            <DoomFace ger={11} size={36} />
            <div>
              <div className="font-display text-[13px] text-[#ff2d2d] tracking-wider">
                GER 11 — {gerConf.title}
              </div>
              <div className="font-mono text-[10px] text-muted2 mt-0.5 leading-relaxed">
                4 reps → 10s → 4 reps → 10s → ... até falhar 1x
              </div>
            </div>
          </div>

          {/* Previous log */}
          {savedLog?.kg && (
            <div className="flex items-center justify-between bg-neon/5 border border-neon/15 px-2.5 py-1.5 mb-3">
              <span className="font-mono text-[9px] text-muted tracking-widest">ÚLTIMO</span>
              <span className="font-display text-sm text-neon tracking-wider">
                {savedLog.kg}KG · {savedLog.blocks} BLOCOS
              </span>
            </div>
          )}

          {/* Carga input */}
          <div className="section-label">CARGA (pra falhar em 10-12 reps numa série normal)</div>
          <div className="flex items-center gap-2 mb-3">
            <input
              className="input-base flex-1"
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              placeholder="—"
              value={topKg}
              onChange={(e) => setTopKg(e.target.value)}
            />
            <span className="font-mono text-[10px] text-muted w-6">kg</span>
          </div>

          {/* Feeder set */}
          {isFirst && loads && (
            <>
              <div className="section-label">
                <LuArrowDownToLine size={10} />
                FEEDER SET
              </div>
              <div className="set-row mb-3">
                <span className="font-mono text-[10px] text-muted w-4">F</span>
                <span className="font-mono text-[10px] text-muted2 flex-1">4-8 reps · 70% · GER 7</span>
                <span className={`calc-chip ${loads ? 'calc-chip-dim' : 'calc-chip-dim'}`}>
                  {loads ? fmtKg(loads.feeder1) : '—'}
                </span>
              </div>
            </>
          )}

          {/* Block tracker */}
          <div className="section-label">
            <LuZap size={10} />
            BLOCOS (4 REPS CADA)
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {Array.from({ length: MAX_BLOCKS }, (_, i) => {
              const isDone    = i < blocksCompleted
              const isCurrent = i === blocksCompleted && !failed
              const isFailed  = failed && i === failedBlock

              return (
                <div
                  key={i}
                  className={`w-9 h-9 flex items-center justify-center font-display text-sm
                    border cursor-pointer transition-all duration-150
                    ${isDone    ? 'bg-neon border-neon text-bg'                     : ''}
                    ${isCurrent ? 'border-neon text-neon animate-pulse-border'       : ''}
                    ${isFailed  ? 'bg-danger border-danger text-white'               : ''}
                    ${!isDone && !isCurrent && !isFailed ? 'bg-s2 border-border2 text-muted' : ''}
                  `}
                  onClick={() => {
                    if (!failed) {
                      setBlocksCompleted(i)
                      setFailed(false)
                    }
                  }}
                >
                  {isFailed ? <LuCircleX size={14} /> : i + 1}
                </div>
              )
            })}
          </div>

          {/* 10s timer */}
          <div className="bg-s2 border border-border1 p-3 mb-3 text-center">
            <div className="font-mono text-[9px] text-muted tracking-[0.25em] mb-1">
              DESCANSO ENTRE BLOCOS
            </div>
            <div
              className="font-display text-5xl leading-none tracking-widest transition-colors"
              style={{ color: timerRunning ? timerColor : '#555' }}
            >
              0:{String(timerSecs).padStart(2, '0')}
            </div>
            <div className="flex gap-2 mt-3">
              <button
                className="flex-1 flex items-center justify-center gap-2
                  bg-neon text-bg font-display text-base tracking-widest py-2.5
                  transition-all active:opacity-80"
                onClick={timerRunning ? () => {
                  clearInterval(intervalRef.current)
                  setTimerRunning(false)
                } : handleBlockDone}
              >
                {timerRunning
                  ? <><LuRotateCcw size={14} /> PAUSAR</>
                  : <><LuPlay size={14} /> BLOCO FEITO → 10s</>
                }
              </button>
              <button
                className="flex items-center justify-center gap-1.5 px-3
                  bg-danger/10 border border-danger text-danger
                  font-display text-base tracking-wider py-2.5
                  transition-all active:opacity-80"
                onClick={handleFail}
              >
                <LuCircleX size={14} />
                FALHEI
              </button>
              <button
                className="px-3 bg-s3 border border-border2 text-muted
                  font-display text-base tracking-wider py-2.5
                  transition-all active:opacity-80"
                onClick={resetBlocks}
              >
                <LuRotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* Result */}
          {(failed || blocksCompleted > 0) && (
            <div className="flex items-center justify-between bg-neon/5 border border-neon/15 px-3 py-2 mb-3">
              <span className="font-mono text-[10px] text-muted tracking-widest">RESULTADO</span>
              <span className="font-display text-base text-neon tracking-wider">
                {blocksCompleted} BLOCOS COMPLETOS
                {failed && ` · FALHOU NO ${failedBlock + 1}º`}
              </span>
            </div>
          )}

          {/* Obs */}
          <div className="section-label">OBSERVAÇÕES</div>
          <input
            className="input-base mb-3 text-sm font-body font-semibold tracking-wide"
            type="text"
            placeholder="notas..."
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            style={{ fontSize: 14 }}
          />

          <button
            className={`btn-primary ${saved ? 'saved' : ''}`}
            onClick={handleSave}
          >
            {saved ? '✓ SALVO!' : 'REGISTRAR'}
          </button>
        </div>
      )}
    </div>
  )
}
