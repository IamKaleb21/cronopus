import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

// Mock Monaco Editor (heavy dependency, not suitable for jsdom)
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

// Mock resizable panels (uses ResizeObserver which isn't in jsdom)
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

// Mock the API module
vi.mock('@/services/api', () => ({
    jobsApi: {
        getAll: vi.fn(),
        updateStatus: vi.fn(),
        compileLatex: vi.fn(),
    },
}))

import EditorPage from './EditorPage'

const createTestQueryClient = () => new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})

const renderEditor = () => {
    const queryClient = createTestQueryClient()
    return render(
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <EditorPage />
            </BrowserRouter>
        </QueryClientProvider>
    )
}

describe('EditorPage', () => {
    it('renders the split layout with editor and preview panels', () => {
        renderEditor()

        // Editor panel
        expect(screen.getByText(/editor latex/i)).toBeInTheDocument()

        // Preview panel
        expect(screen.getByText(/vista previa pdf/i)).toBeInTheDocument()
    })

    it('renders the Monaco editor', () => {
        renderEditor()
        expect(screen.getByTestId('monaco-editor')).toBeInTheDocument()
    })

    it('renders compile button', () => {
        renderEditor()
        expect(screen.getByRole('button', { name: /compilar/i })).toBeInTheDocument()
    })

    it('renders save button', () => {
        renderEditor()
        expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument()
    })

    it('renders download button', () => {
        renderEditor()
        expect(screen.getByRole('button', { name: /descargar/i })).toBeInTheDocument()
    })

    it('shows placeholder when no PDF is available', () => {
        renderEditor()
        expect(screen.getByText(/compila el latex/i)).toBeInTheDocument()
    })

    it('renders resizable split panels', () => {
        renderEditor()
        expect(screen.getByTestId('resizable-group')).toBeInTheDocument()
        expect(screen.getAllByTestId('resizable-panel')).toHaveLength(2)
        expect(screen.getByTestId('resizable-handle')).toBeInTheDocument()
    })
})
