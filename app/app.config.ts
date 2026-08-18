export default defineAppConfig({
  ui: {
    colors: {
      primary: 'green',
      neutral: 'zinc'
    },
    modal: {
      slots: {
        overlay: 'bg-zinc-950/40 backdrop-blur-sm dark:bg-zinc-950/60'
      }
    }
  }
})
