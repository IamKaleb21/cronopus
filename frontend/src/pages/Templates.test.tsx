import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Templates from './Templates'
import { jobsApi } from '@/services/api'

// Mock the API module
vi.mock('@/services/api', () => ({
    jobsApi: {
        getTemplate: vi.fn(),
        saveTemplate: vi.fn(),
        compileTemplate: vi.fn(),
    },
}))

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
    default: ({ value, onChange, ...props }: any) => (
        <div data-testid="monaco-editor" {...props}>
            <textarea
                data-testid="monaco-textarea"
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
            />
        </div>
    ),
}))

// Mock resizable panels
vi.mock('@/components/ui/resizable', () => ({
    ResizablePanelGroup: ({ children, ...props }: any) => (
        <div data-testid="resizable-group" {...props}>{children}</div>
    ),
    ResizablePanel: ({ children, ...props }: any) => (
        <div data-testid="resizable-panel" {...props}>{children}</div>
    ),
    ResizableHandle: (props: any) => (
        <div data-testid="resizable-handle" {...props} />
    ),
}))

// Mock PdfPreview to avoid complex rendering in tests
vi.mock('@/components/PdfPreview', () => ({
    PdfPreview: ({ pdfUrl }: any) => (
        <div data-testid="pdf-preview">
            {pdfUrl ? 'PDF Content' : 'No PDF'}
        </div>
    ),
}))

const createTestQueryClient = () => new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})

const renderTemplates = () => {
    const queryClient = createTestQueryClient()
    return render(
        <QueryClientProvider client={queryClient}>
            <Templates />
        </QueryClientProvider>
    )
}

describe('Templates Page', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders the editor, preview, and load button', async () => {
        vi.mocked(jobsApi.getTemplate).mockResolvedValue({ content: 'Initial Template', id: 'tpl-1' })

        renderTemplates()

        // Wait for loading to finish
        expect(await screen.findByText(/editor de template maestro/i)).toBeInTheDocument()

        // Check for Editor
        expect(screen.getByTestId('monaco-editor')).toBeInTheDocument()

        // Check for Preview
        expect(screen.getByTestId('pdf-preview')).toBeInTheDocument()

        // Check for Resizable Layout
        expect(screen.getByTestId('resizable-group')).toBeInTheDocument()
    })

    it('loads template on mount', async () => {
        const mockTemplate = '% Master Template Content'
        vi.mocked(jobsApi.getTemplate).mockResolvedValue({ content: mockTemplate, id: 'tpl-1' })

        renderTemplates()

        await waitFor(() => {
            expect(screen.getByTestId('monaco-textarea')).toHaveValue(mockTemplate)
        })
    })

    it('saves template changes', async () => {
        const initialTemplate = 'Initial'
        const newContent = 'Updated Template'
        const templateId = 'tpl-1'

        vi.mocked(jobsApi.getTemplate).mockResolvedValue({ content: initialTemplate, id: templateId })
        vi.mocked(jobsApi.saveTemplate).mockResolvedValue(undefined)

        const user = userEvent.setup()
        renderTemplates()

        await waitFor(() => {
            expect(screen.getByTestId('monaco-textarea')).toHaveValue(initialTemplate)
        })

        const editor = screen.getByTestId('monaco-textarea')
        await user.clear(editor)
        await user.type(editor, newContent)

        const saveButton = screen.getByRole('button', { name: /guardar template/i })
        await user.click(saveButton)

        expect(jobsApi.saveTemplate).toHaveBeenCalledWith(newContent, templateId)
    })
})
