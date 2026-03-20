import { useEffect, useState } from 'react'
import type { ShutdownState } from '@ih3t/shared'

interface AdminControlsScreenProps {
  isAuthorizing: boolean
  shutdown: ShutdownState | null
  delayMinutes: string
  messageDraft: string
  isScheduling: boolean
  isCancelling: boolean
  isSendingMessage: boolean
  onDelayMinutesChange: (value: string) => void
  onMessageDraftChange: (value: string) => void
  onSchedule: () => void
  onCancel: () => void
  onSendMessage: () => void
  onBack: () => void
  onOpenStats: () => void
}

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(timestamp)
}

function formatRemainingTime(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const hours = Math.floor(totalSeconds / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
  }

  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

function ShutdownSummary({ shutdown }: { shutdown: ShutdownState | null }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!shutdown) {
      return
    }

    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 1_000)

    return () => window.clearInterval(interval)
  }, [shutdown])

  if (!shutdown) {
    return (
      <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-slate-950/35 px-5 py-5 text-sm text-slate-400">
        No shutdown is currently scheduled.
      </div>
    )
  }

  return (
    <div className="rounded-[1.35rem] border border-amber-300/25 bg-amber-300/10 px-5 py-5">
      <div className="text-xs uppercase tracking-[0.24em] text-amber-100">Scheduled Restart</div>
      <div className="mt-2 text-2xl font-black text-white">
        {formatRemainingTime(Math.max(0, shutdown.shutdownAt - now))}
      </div>
      <div className="mt-3 text-sm text-amber-50/90">
        Goes down at {formatDateTime(shutdown.shutdownAt)}
      </div>
      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-amber-100/75">
        Scheduled {formatDateTime(shutdown.scheduledAt)}
      </div>
    </div>
  )
}

function AdminControlsScreen({
  isAuthorizing,
  shutdown,
  delayMinutes,
  messageDraft,
  isScheduling,
  isCancelling,
  isSendingMessage,
  onDelayMinutesChange,
  onMessageDraftChange,
  onSchedule,
  onCancel,
  onSendMessage,
  onBack,
  onOpenStats
}: AdminControlsScreenProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_28%),radial-gradient(circle_at_right,_rgba(251,191,36,0.14),_transparent_24%),linear-gradient(145deg,_#0f172a,_#111827_42%,_#1f2937)] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        <section className="rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.45)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-sky-300/30 bg-sky-400/10 px-4 py-1 text-xs uppercase tracking-[0.32em] text-sky-100">
                Admin
              </div>
              <h1 className="mt-5 text-3xl font-black uppercase tracking-[0.08em] text-white sm:text-5xl">
                Admin Controls
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Schedule or cancel a graceful shutdown and broadcast a global toast message to every connected player.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={onOpenStats}
                className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-900 transition hover:-translate-y-0.5 hover:bg-amber-200"
              >
                View Stats
              </button>
              <button
                onClick={onBack}
                className="rounded-full border border-white/15 bg-white/8 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white/14"
              >
                Back To Lobby
              </button>
            </div>
          </div>
        </section>

        {isAuthorizing ? (
          <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/6 px-6 py-10 text-center text-slate-300">
            Loading admin tools...
          </div>
        ) : (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr,1.35fr]">
            <section className="rounded-[1.75rem] border border-white/10 bg-white/6 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.35)]">
              <div className="text-xs uppercase tracking-[0.3em] text-amber-200/80">Shutdown</div>
              <h2 className="mt-3 text-2xl font-black uppercase tracking-[0.08em] text-white">Server Restart</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Scheduling a shutdown disables new matches immediately and closes remaining games when the timer ends.
              </p>

              <div className="mt-5">
                <ShutdownSummary shutdown={shutdown} />
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="block flex-1">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Grace Timeout</div>
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    value={delayMinutes}
                    onChange={(event) => onDelayMinutesChange(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-base text-white outline-none transition focus:border-sky-300/50"
                  />
                </label>
                <button
                  onClick={onSchedule}
                  disabled={isScheduling}
                  className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-900 transition hover:-translate-y-0.5 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isScheduling ? 'Scheduling...' : 'Schedule'}
                </button>
                <button
                  onClick={onCancel}
                  disabled={!shutdown || isCancelling}
                  className="rounded-full border border-rose-300/25 bg-rose-500/10 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCancelling ? 'Cancelling...' : 'Cancel'}
                </button>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-white/10 bg-white/6 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.35)]">
              <div className="text-xs uppercase tracking-[0.3em] text-sky-200/80">Broadcast</div>
              <h2 className="mt-3 text-2xl font-black uppercase tracking-[0.08em] text-white">Global Message</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Send a short announcement that appears as a toast for everyone currently connected to the server.
              </p>

              <label className="mt-5 block">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Message</div>
                <textarea
                  value={messageDraft}
                  onChange={(event) => onMessageDraftChange(event.target.value)}
                  maxLength={280}
                  rows={6}
                  className="mt-2 min-h-40 w-full rounded-[1.4rem] border border-white/10 bg-slate-900/80 px-4 py-4 text-base text-white outline-none transition focus:border-sky-300/50"
                  placeholder="Server maintenance starts soon. Please finish your current turn."
                />
              </label>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-sm text-slate-400">{messageDraft.trim().length}/280 characters</div>
                <button
                  onClick={onSendMessage}
                  disabled={isSendingMessage || messageDraft.trim().length === 0}
                  className="rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSendingMessage ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminControlsScreen
