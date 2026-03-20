import type {
  AdminBroadcastMessageRequest,
  AdminBroadcastMessageResponse,
  AdminShutdownControlResponse,
  AdminScheduleShutdownRequest
} from '@ih3t/shared'
import { fetchJson } from './apiClient'

export async function scheduleShutdown(delayMinutes: number) {
  return await fetchJson<AdminShutdownControlResponse>('/api/admin/shutdown', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ delayMinutes } satisfies AdminScheduleShutdownRequest)
  })
}

export async function cancelShutdownSchedule() {
  return await fetchJson<AdminShutdownControlResponse>('/api/admin/shutdown', {
    method: 'DELETE'
  })
}

export async function broadcastAdminMessage(message: string) {
  return await fetchJson<AdminBroadcastMessageResponse>('/api/admin/broadcast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message } satisfies AdminBroadcastMessageRequest)
  })
}
