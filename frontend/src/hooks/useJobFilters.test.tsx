import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useJobFilters } from './useJobFilters'

function TestHarness({ initialEntry = '/' }: { initialEntry?: string }) {
    return (
        <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
                <Route path="/" element={<FilterConsumer />} />
            </Routes>
        </MemoryRouter>
    )
}

function FilterConsumer() {
    const { status, source, setStatus, setSource, clearFilters } = useJobFilters()
    const location = useLocation()

    return (
        <div>
            <span data-testid="status">{status ?? 'null'}</span>
            <span data-testid="source">{source ?? 'null'}</span>
            <span data-testid="search">{location.search}</span>
            <button onClick={() => setStatus('SAVED')} data-testid="set-status-saved">Set SAVED</button>
            <button onClick={() => setStatus(null)} data-testid="set-status-null">Clear status</button>
            <button onClick={() => setSource('COMPUTRABAJO')} data-testid="set-source-ct">Set COMPUTRABAJO</button>
            <button onClick={() => setSource('MANUAL')} data-testid="set-source-manual">Set MANUAL</button>
            <button onClick={() => setSource(null)} data-testid="set-source-null">Clear source</button>
            <button onClick={clearFilters} data-testid="clear-all">Clear all</button>
        </div>
    )
}

describe('useJobFilters', () => {
    it('reads status and source as null when URL has no params', () => {
        render(<TestHarness initialEntry="/" />)
        expect(screen.getByTestId('status')).toHaveTextContent('null')
        expect(screen.getByTestId('source')).toHaveTextContent('null')
    })

    it('reads status from URL when ?status=SAVED', () => {
        render(<TestHarness initialEntry="/?status=SAVED" />)
        expect(screen.getByTestId('status')).toHaveTextContent('SAVED')
        expect(screen.getByTestId('source')).toHaveTextContent('null')
    })

    it('reads source from URL when ?source=COMPUTRABAJO', () => {
        render(<TestHarness initialEntry="/?source=COMPUTRABAJO" />)
        expect(screen.getByTestId('status')).toHaveTextContent('null')
        expect(screen.getByTestId('source')).toHaveTextContent('COMPUTRABAJO')
    })

    it('reads both status and source from URL', () => {
        render(<TestHarness initialEntry="/?status=GENERATED&source=PRACTICAS_PE" />)
        expect(screen.getByTestId('status')).toHaveTextContent('GENERATED')
        expect(screen.getByTestId('source')).toHaveTextContent('PRACTICAS_PE')
    })

    it('ignores invalid status in URL and returns null', () => {
        render(<TestHarness initialEntry="/?status=INVALID" />)
        expect(screen.getByTestId('status')).toHaveTextContent('null')
    })

    it('ignores invalid source in URL and returns null', () => {
        render(<TestHarness initialEntry="/?source=INVALID" />)
        expect(screen.getByTestId('source')).toHaveTextContent('null')
    })

    it('setStatus updates URL with status param', async () => {
        const user = userEvent.setup()
        render(<TestHarness initialEntry="/" />)
        await user.click(screen.getByTestId('set-status-saved'))
        expect(screen.getByTestId('search').textContent).toContain('status=SAVED')
    })

    it('setSource updates URL with source param', async () => {
        const user = userEvent.setup()
        render(<TestHarness initialEntry="/" />)
        await user.click(screen.getByTestId('set-source-ct'))
        expect(screen.getByTestId('search').textContent).toContain('source=COMPUTRABAJO')
    })

    it('setStatus(null) removes status from URL', async () => {
        const user = userEvent.setup()
        render(<TestHarness initialEntry="/?status=SAVED&source=COMPUTRABAJO" />)
        await user.click(screen.getByTestId('set-status-null'))
        const search = screen.getByTestId('search').textContent
        expect(search).not.toContain('status=')
        expect(search).toContain('source=COMPUTRABAJO')
    })

    it('clearFilters removes both status and source from URL', async () => {
        const user = userEvent.setup()
        render(<TestHarness initialEntry="/?status=SAVED&source=COMPUTRABAJO" />)
        await user.click(screen.getByTestId('clear-all'))
        const search = screen.getByTestId('search').textContent
        expect(search).not.toContain('status=')
        expect(search).not.toContain('source=')
    })

    it('reads source MANUAL from URL', () => {
        render(<TestHarness initialEntry="/?source=MANUAL" />)
        expect(screen.getByTestId('source')).toHaveTextContent('MANUAL')
    })

    it('setSource(MANUAL) updates URL with source param', async () => {
        const user = userEvent.setup()
        render(<TestHarness initialEntry="/" />)
        await user.click(screen.getByTestId('set-source-manual'))
        expect(screen.getByTestId('search').textContent).toContain('source=MANUAL')
    })
})
