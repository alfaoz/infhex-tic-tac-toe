import type { DehydratedState } from '@tanstack/react-query'
import { renderToString } from 'react-dom/server'
import { createQueryClient } from './query/queryClient'
import { createServerRouter } from './router'
import App from './App'

interface RenderAppOptions {
  url: string
  dehydratedState?: DehydratedState
}

export function renderApp({ url, dehydratedState }: Readonly<RenderAppOptions>) {
  const queryClient = createQueryClient()
  const router = createServerRouter(url)

  return renderToString(
    <App
      router={router}
      queryClient={queryClient}
      dehydratedState={dehydratedState}
    />
  )
}
