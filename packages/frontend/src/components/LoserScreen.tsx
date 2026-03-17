import type { SessionFinishReason } from '@ih3t/shared'

interface LoserScreenProps {
  reason: SessionFinishReason | null
  onReturnToLobby: () => void
}

function LoserScreen({ reason, onReturnToLobby }: LoserScreenProps) {
  const message = reason === 'timeout'
    ? 'You failed to place a cell before the timer ran out.'
    : reason === 'five-in-a-row'
      ? 'The other player completed a five-tile row.'
      : 'You left the match before it finished.'

  return (
    <div className="w-full h-full bg-slate-950/46 flex flex-col items-center justify-center p-6 text-white font-sans text-center backdrop-blur-[2px]">
      <div className="w-full max-w-xl rounded-[2rem] border border-rose-300/20 bg-rose-500/16 px-8 py-10 shadow-[0_20px_80px_rgba(136,19,55,0.35)]">
        <h1 className="text-6xl mb-4">You lost</h1>
        <p className="text-xl">{message}</p>
        <button
          onClick={onReturnToLobby}
          className="mt-6 px-6 py-3 bg-white text-rose-900 border-none rounded cursor-pointer hover:bg-rose-100"
        >
          Return to Lobby
        </button>
      </div>
    </div>
  )
}

export default LoserScreen
