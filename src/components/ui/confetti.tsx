import ReactConfetti from 'react-confetti'

interface ConfettiHookResult {
  showConfetti: boolean
  confettiOpacity: number
  confettiPieces: number
}

interface ConfettiProps {
  confetti: ConfettiHookResult
  gravity?: number
  fadeDuration?: number
}

export default function Confetti({ confetti, gravity = 0.3, fadeDuration = 1000 }: ConfettiProps) {
  if (!confetti.showConfetti) return null

  return (
    <div
      style={{
        opacity: confetti.confettiOpacity,
        transition: `opacity ${fadeDuration}ms ease-out`,
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      <ReactConfetti
        width={window.innerWidth}
        height={window.innerHeight}
        recycle={false}
        numberOfPieces={confetti.confettiPieces}
        gravity={gravity}
      />
    </div>
  )
}
