import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        const code = (error as { code?: string } | null)?.code
        if (code === '42501' || code === 'PGRST116') return false
        return failureCount < 3
      },
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
})
