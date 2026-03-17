import type { SessionInfo } from '@ih3t/shared'

interface LobbyScreenProps {
  isConnected: boolean
  availableSessions: SessionInfo[]
  onHostGame: () => void
  onJoinGame: (sessionId: string) => void
}

function LobbyScreen({
  isConnected,
  availableSessions,
  onHostGame,
  onJoinGame
}: LobbyScreenProps) {
  return (
    <div className="w-screen h-screen bg-slate-600 flex flex-col items-center justify-center text-white font-sans">
      <h1 className="mb-10 text-5xl text-center">Infinity Hexagonial<br />Tik-Tak-Toe</h1>

      <div className="text-center">
        <div className="mb-7">
          <button
            onClick={onHostGame}
            disabled={!isConnected}
            className={`px-7 py-3.75 text-lg mr-5 border-none rounded cursor-pointer text-white ${isConnected
              ? 'bg-green-500 hover:bg-green-600 cursor-pointer'
              : 'bg-gray-500 cursor-not-allowed'
              }`}
          >
            Host Game
          </button>
        </div>

        <div>
          <h3 className="mb-5">Available Games</h3>
          {availableSessions.length === 0 ? (
            <p>No games available. Host one above!</p>
          ) : (
            <div className="flex flex-col gap-2">
              {availableSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-slate-700 p-3 rounded flex justify-between items-center min-w-75"
                >
                  <div>
                    <div>Game: <strong>{session.id}</strong></div>
                    <div>Players: {session.playerCount}/2</div>
                  </div>
                  <button
                    onClick={() => onJoinGame(session.id)}
                    disabled={!isConnected}
                    className={`px-4 py-2 border-none rounded text-white ${isConnected
                      ? 'bg-blue-500 hover:bg-blue-600 cursor-pointer'
                      : 'bg-gray-500 cursor-not-allowed'
                      }`}
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`mt-10 p-5 rounded ${isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}>
          Connection Status: {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
    </div>
  )
}

export default LobbyScreen
