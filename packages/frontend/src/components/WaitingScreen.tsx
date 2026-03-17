interface WaitingScreenProps {
  sessionId: string
  playerCount: number
  onCancel: () => void
}

function WaitingScreen({ sessionId, playerCount, onCancel }: WaitingScreenProps) {
  return (
    <div className="text-center">
      <h2>Waiting for another player...</h2>
      <p>Session ID: <strong>{sessionId}</strong></p>
      <p>Players: {playerCount}/2</p>
      <button
        onClick={onCancel}
        className="mt-5 px-5 py-2 bg-red-500 text-white border-none rounded cursor-pointer hover:bg-red-600"
      >
        Cancel
      </button>
    </div>
  )
}

export default WaitingScreen
