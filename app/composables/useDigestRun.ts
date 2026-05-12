export type StepState = 'pending' | 'active' | 'done'
export interface DigestStep {
  id: 'fetch' | 'generate' | 'save'
  label: string
  state: StepState
}

const PHASE_TO_STEP: Record<string, DigestStep['id']> = {
  'Fetching sources…':              'fetch',
  'Generating digest with Claude…': 'generate',
  'Saving…':                        'save',
}

export function useDigestRun(options: { onComplete: () => Promise<void> }) {
  const toast = useToast()
  const running = useState('digestRunning', () => false)
  const steps = ref<DigestStep[]>([])
  let es: EventSource | null = null

  function makeSteps(): DigestStep[] {
    return [
      { id: 'fetch',    label: 'Fetching sources',              state: 'pending' },
      { id: 'generate', label: 'Generating digest with Claude', state: 'pending' },
      { id: 'save',     label: 'Saving',                        state: 'pending' },
    ]
  }

  function activateStep(phaseMessage: string) {
    const targetId = PHASE_TO_STEP[phaseMessage]
    if (!targetId) return
    steps.value = steps.value.map((s) => {
      if (s.id === targetId) return { ...s, state: 'active' }
      if (s.state === 'active') return { ...s, state: 'done' }
      return s
    })
  }

  function completeAllSteps() {
    steps.value = steps.value.map((s) => ({ ...s, state: 'done' }))
  }

  function runNow(entryId: string) {
    running.value = true
    steps.value = makeSteps()

    es = new EventSource(`/api/run/stream?entryId=${encodeURIComponent(entryId)}`)
    let completed = false

    es.onmessage = async (e: MessageEvent) => {
      const ev = JSON.parse(e.data)
      if (ev.type === 'phase') {
        activateStep(ev.message)
      } else if (ev.type === 'done') {
        completed = true
        completeAllSteps()
        await new Promise((r) => setTimeout(r, 600))
        es?.close()
        es = null
        running.value = false
        steps.value = []
        toast.add({ title: 'Digest generated', color: 'success' })
        await options.onComplete()
      } else if (ev.type === 'error') {
        es?.close()
        es = null
        running.value = false
        steps.value = []
        toast.add({ title: 'Digest failed', description: ev.message, color: 'error' })
      }
    }

    es.onerror = () => {
      if (completed) return
      es?.close()
      es = null
      running.value = false
      steps.value = []
      toast.add({ title: 'Connection error', description: 'Lost connection to the server.', color: 'error' })
    }
  }

  onBeforeUnmount(() => {
    es?.close()
  })

  return { running, steps, runNow }
}
