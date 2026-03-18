import type { SessionFinishReason } from '@ih3t/shared'

interface WinnerScreenProps {
  reason: SessionFinishReason | null
  onReturnToLobby: () => void
}

function WinnerScreen({ reason, onReturnToLobby }: Readonly<WinnerScreenProps>) {
  const message = reason === 'timeout'
    ? 'The other player failed to place a cell before the timer ran out.'
    : reason === 'six-in-a-row'
      ? 'You completed a six-tile row.'
      : 'The other player disconnected.'

  return (
    <div className="w-full h-full bg-slate-950/40 flex flex-col items-center justify-center p-6 text-white font-sans text-center backdrop-blur-[2px]">
      <div className="w-full max-w-xl rounded-[2rem] border border-emerald-300/25 bg-emerald-500/18 px-8 py-10 shadow-[0_20px_80px_rgba(6,95,70,0.35)]">
        <h1 className="text-6xl mb-4">You've won!</h1>
        <p className="text-xl">{message}</p>
        <button
          onClick={onReturnToLobby}
          className="mt-6 px-6 py-3 bg-white text-emerald-800 border-none rounded cursor-pointer hover:bg-emerald-100"
        >
          Return to Lobby
        </button>
      </div>
    </div>
  )
}

export default WinnerScreen
