import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { toast } from 'react-toastify'
import { broadcastAdminMessage, cancelShutdownSchedule, scheduleShutdown } from '../adminClient'
import AdminControlsScreen from '../components/AdminControlsScreen'
import { useLiveGameStore } from '../liveGameStore'
import { useQueryAccount } from '../queryHooks'

function showSuccessToast(message: string) {
  toast.success(message, {
    toastId: `success:${message}`
  })
}

function showErrorToast(message: string) {
  toast.error(message, {
    toastId: `error:${message}`
  })
}

function AdminControlsRoute() {
  const navigate = useNavigate()
  const shutdown = useLiveGameStore(state => state.shutdown)
  const accountQuery = useQueryAccount({ enabled: true })
  const isAdmin = accountQuery.data?.user?.role === 'admin'
  const [delayMinutes, setDelayMinutes] = useState('10')
  const [messageDraft, setMessageDraft] = useState('')
  const [isScheduling, setIsScheduling] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)

  const handleSchedule = async () => {
    const parsedMinutes = Number(delayMinutes)
    if (!Number.isFinite(parsedMinutes) || parsedMinutes < 1 || parsedMinutes > 1440) {
      showErrorToast('Enter a shutdown delay between 1 and 1440 minutes.')
      return
    }

    setIsScheduling(true)
    try {
      const response = await scheduleShutdown(Math.floor(parsedMinutes))
      const scheduledMinutes = response.shutdown
        ? Math.max(1, Math.round((response.shutdown.shutdownAt - response.shutdown.scheduledAt) / 60_000))
        : Math.floor(parsedMinutes)
      showSuccessToast(`Shutdown scheduled in ${scheduledMinutes} minute${scheduledMinutes === 1 ? '' : 's'}.`)
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Failed to schedule shutdown.')
    } finally {
      setIsScheduling(false)
    }
  }

  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      await cancelShutdownSchedule()
      showSuccessToast('Scheduled shutdown cancelled.')
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Failed to cancel shutdown.')
    } finally {
      setIsCancelling(false)
    }
  }

  const handleSendMessage = async () => {
    const trimmedMessage = messageDraft.trim()
    if (!trimmedMessage) {
      showErrorToast('Enter a message before sending it.')
      return
    }

    setIsSendingMessage(true)
    try {
      await broadcastAdminMessage(trimmedMessage)
      setMessageDraft('')
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Failed to send global message.')
    } finally {
      setIsSendingMessage(false)
    }
  }

  if (accountQuery.isLoading) {
    return (
      <AdminControlsScreen
        isAuthorizing
        shutdown={shutdown}
        delayMinutes={delayMinutes}
        messageDraft={messageDraft}
        isScheduling={isScheduling}
        isCancelling={isCancelling}
        isSendingMessage={isSendingMessage}
        onDelayMinutesChange={setDelayMinutes}
        onMessageDraftChange={setMessageDraft}
        onSchedule={() => void handleSchedule()}
        onCancel={() => void handleCancel()}
        onSendMessage={() => void handleSendMessage()}
        onBack={() => void navigate('/')}
        onOpenStats={() => void navigate('/admin/stats')}
      />
    )
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return (
    <AdminControlsScreen
      isAuthorizing={false}
      shutdown={shutdown}
      delayMinutes={delayMinutes}
      messageDraft={messageDraft}
      isScheduling={isScheduling}
      isCancelling={isCancelling}
      isSendingMessage={isSendingMessage}
      onDelayMinutesChange={setDelayMinutes}
      onMessageDraftChange={setMessageDraft}
      onSchedule={() => void handleSchedule()}
      onCancel={() => void handleCancel()}
      onSendMessage={() => void handleSendMessage()}
      onBack={() => void navigate('/')}
      onOpenStats={() => void navigate('/admin/stats')}
    />
  )
}

export default AdminControlsRoute
