import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobsApi } from '@/services/api'
import { toast } from 'sonner' // Assuming sonner or similar toast lib is used, or console

const TEMPLATE_QUERY_KEY = ['template']

export function useTemplate() {
    return useQuery({
        queryKey: TEMPLATE_QUERY_KEY,
        queryFn: jobsApi.getTemplate,
    })
}

export function useSaveTemplate() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ content, templateId }: { content: string; templateId: string }) =>
            jobsApi.saveTemplate(content, templateId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TEMPLATE_QUERY_KEY })
            toast.success('Template guardado existosamente')
        },
        onError: (error) => {
            console.error('Failed to save template:', error)
            toast.error('Error al guardar el template')
        }
    })
}
