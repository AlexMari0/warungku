export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  const { isDemo } = useDemoMode()
  const path = to.path.replace(/\/$/, '') || '/'

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password']

  const isAuthenticated = computed(() => !!user.value || isDemo.value)

  const isPublicRoute = publicRoutes.includes(path) || path.startsWith('/store')

  // If user is not logged in and trying to access a private route, redirect to login
  if (!isAuthenticated.value && !isPublicRoute) {
    return navigateTo('/login')
  }

  // If user is logged in and trying to access an auth route, redirect to home
  if (isAuthenticated.value && publicRoutes.includes(path)) {
    return navigateTo('/')
  }
})
