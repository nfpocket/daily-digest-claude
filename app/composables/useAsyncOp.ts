export function useAsyncOp() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    loading.value = true
    error.value = null
    try {
      return await fn()
    } catch (e: any) {
      error.value = e?.data?.message ?? e?.message ?? 'Something went wrong'
      return null
    } finally {
      loading.value = false
    }
  }

  return reactive({ loading, error, run })
}
