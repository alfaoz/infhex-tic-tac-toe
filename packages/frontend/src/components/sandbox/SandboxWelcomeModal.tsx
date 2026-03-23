interface SandboxWelcomeModalProps {
  isOpen: boolean
  onClose: () => void
}

function SandboxWelcomeModal({ isOpen, onClose }: Readonly<SandboxWelcomeModalProps>) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center px-4">
      <div className="pointer-events-auto w-full max-w-lg rounded-[1.75rem] border border-emerald-300/25 bg-slate-900/95 px-6 py-6 text-center shadow-[0_30px_120px_rgba(15,23,42,0.58)] backdrop-blur sm:px-8 sm:py-8">
        <div className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] text-emerald-100">
          Sandbox Mode
        </div>
        <h1 className="mt-5 text-3xl font-black uppercase tracking-[0.08em] text-white sm:text-4xl">
          Local Free Play
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-200 sm:text-base">
          Sandbox mode is a local pass-and-play board with no clock. You control both players, can try lines freely,
          and can reset the board any time.
        </p>
        <div className="mt-6">
          <button
            onClick={onClose}
            className="rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-300"
          >
            Start Exploring
          </button>
        </div>
      </div>
    </div>
  )
}

export default SandboxWelcomeModal
