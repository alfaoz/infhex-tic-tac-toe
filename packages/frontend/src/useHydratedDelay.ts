import { useEffect, useState } from 'react'
import { clearInitialHydrationUiDelay, shouldDelayClientOnlyUi } from './ssrState'

export function useHydratedDelay(delayMs: number) {
  const [isReady, setIsReady] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return !shouldDelayClientOnlyUi()
  })

  useEffect(() => {
    if (isReady) {
      return
    }

    if (!shouldDelayClientOnlyUi()) {
      setIsReady(true)
      return
    }

    const timeout = window.setTimeout(() => {
      clearInitialHydrationUiDelay()
      setIsReady(true)
    }, delayMs)

    return () => window.clearTimeout(timeout)
  }, [delayMs, isReady])

  return isReady
}
