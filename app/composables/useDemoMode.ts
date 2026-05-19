export const useDemoMode = () => {
  const demoCookie = useCookie('demo_mode')

  const isDemo = computed({
    get: () => demoCookie.value === 'true',
    set: (val) => {
      demoCookie.value = val ? 'true' : 'false'
    }
  })

  const enableDemo = () => {
    demoCookie.value = 'true'
  }

  const disableDemo = () => {
    demoCookie.value = 'false'
  }

  return {
    isDemo,
    enableDemo,
    disableDemo
  }
}
