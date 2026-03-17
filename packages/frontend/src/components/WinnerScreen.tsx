interface WinnerScreenProps {
  onReturnToLobby: () => void
}

function WinnerScreen({ onReturnToLobby }: WinnerScreenProps) {
  return (
    <div className="w-screen h-screen bg-emerald-700 flex flex-col items-center justify-center text-white font-sans text-center">
      <h1 className="text-6xl mb-4">You've won!</h1>
      <p className="text-xl">The other player disconnected.</p>
      <button
        onClick={onReturnToLobby}
        className="mt-6 px-6 py-3 bg-white text-emerald-800 border-none rounded cursor-pointer hover:bg-emerald-100"
      >
        Return to Lobby
      </button>
    </div>
  )
}

export default WinnerScreen
