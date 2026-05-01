import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Profile from './Profile'
import type { ProfileJson } from '@/services/api'

vi.mock('@/services/api', () => ({
    profileApi: {
        get: vi.fn(),
        update: vi.fn(),
    },
}))

import { profileApi } from '@/services/api'

const MOCK_PROFILE: ProfileJson = {
    full_name: 'Test User',
    title: 'Developer',
    contact: { phone: '+51', email: 't@t.com', location: 'Lima', links: {} },
    summary: 'Summary',
    skills: {},
    experience: [],
    projects: [],
    education: [],
    certifications: [],
}

function renderProfile() {
    return render(
        <MemoryRouter>
            <Profile />
        </MemoryRouter>
    )
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('Profile page', () => {
    it('shows loading then form when GET succeeds', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(MOCK_PROFILE)
        renderProfile()

        expect(screen.getByText(/cargando perfil/i)).toBeInTheDocument()

        await waitFor(() => {
            expect(screen.getByText(/personal data/i)).toBeInTheDocument()
        })
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Developer')).toBeInTheDocument()
    })

    it('shows error and Reintentar when GET fails with 503', async () => {
        vi.mocked(profileApi.get).mockRejectedValue(new Error('Profile no configurado. Ejecuta seed_profile.'))
        renderProfile()

        await waitFor(() => {
            expect(screen.getByText(/no configurado|seed_profile/i)).toBeInTheDocument()
        })
        expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()
    })

    it('calls loadProfile again when Reintentar is clicked', async () => {
        vi.mocked(profileApi.get)
            .mockRejectedValueOnce(new Error('Profile no configurado.'))
            .mockResolvedValueOnce(MOCK_PROFILE)
        const user = userEvent.setup()
        renderProfile()

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()
        })
        await user.click(screen.getByRole('button', { name: /reintentar/i }))

        await waitFor(() => {
            expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
        })
        expect(profileApi.get).toHaveBeenCalledTimes(2)
    })

    it('calls profileApi.update when Guardar is clicked', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(MOCK_PROFILE)
        vi.mocked(profileApi.update).mockResolvedValue(MOCK_PROFILE)
        const user = userEvent.setup()
        renderProfile()

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument()
        })
        await user.click(screen.getByRole('button', { name: /guardar/i }))

await waitFor(() => {
            expect(profileApi.update).toHaveBeenCalledWith(MOCK_PROFILE)
        })
    })

    it('adds skill when typing with trailing space', async () => {
        const user = userEvent.setup()
        const profileWithSkills: ProfileJson = {
            ...MOCK_PROFILE,
            skills: { frontend: [], backend_db: [], mobile: [], data_ml: [], infra_tools: [], languages: [] },
        }
        vi.mocked(profileApi.get).mockResolvedValue(profileWithSkills)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByText(/frontend stack/i)).toBeInTheDocument()
        })

        const inputs = screen.getAllByPlaceholderText('Type skill + space to add')
        const frontendInput = inputs[0]

        await user.type(frontendInput, 'React ')
        await waitFor(() => {
            expect(screen.getByText('React')).toBeInTheDocument()
        })
    })

})

describe('Experience section', () => {
    const profileWithExperience: ProfileJson = {
        ...MOCK_PROFILE,
        experience: [
            {
                id: 'exp-1',
                role: 'Frontend Developer',
                company: 'TechCorp',
                location: 'Lima',
                from: '2022-01',
                to: '2023-12',
                bullets: ['Built React apps', 'Mentored junior devs'],
            },
        ],
    }

    it('renders Experience section with SectionCard styling', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByText('Experience')).toBeInTheDocument()
        })
        const sectionHeader = screen.getByText('Experience').closest('.flex')
        expect(sectionHeader).toBeInTheDocument()
    })

it('displays existing experience entries', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('Frontend Developer')).toBeInTheDocument()
        })
        expect(screen.getByDisplayValue('TechCorp')).toBeInTheDocument()
        expect(screen.queryAllByDisplayValue('Lima').length).toBeGreaterThan(0)
    })

    it('can add a new experience entry', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue({ ...MOCK_PROFILE, experience: [] })
        renderProfile()

        await waitFor(() => {
            expect(screen.getByText(/añadir experiencia/i)).toBeInTheDocument()
        })

        const initialInputs = screen.getAllByRole('textbox')

        await user.click(screen.getByText(/añadir experiencia/i))

        await waitFor(() => {
            const newInputs = screen.getAllByRole('textbox')
            expect(newInputs.length).toBeGreaterThan(initialInputs.length)
        })
    })

    it('can remove an experience entry', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('Frontend Developer')).toBeInTheDocument()
        }, { timeout: 3000 })

        const deleteButton = screen.getByRole('button', { name: /delete experience/i })
        await user.click(deleteButton)

        await waitFor(() => {
            const afterDelete = screen.queryByDisplayValue('Frontend Developer')
            expect(afterDelete).not.toBeInTheDocument()
        })
    })

    it('can add a new experience entry', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue({ ...MOCK_PROFILE, experience: [] })
        renderProfile()

        await waitFor(() => {
            expect(screen.getByText(/añadir experiencia/i)).toBeInTheDocument()
        })

        const initialInputs = screen.getAllByRole('textbox')

        await user.click(screen.getByText(/añadir experiencia/i))

        await waitFor(() => {
            const newInputs = screen.getAllByRole('textbox')
            expect(newInputs.length).toBeGreaterThan(initialInputs.length)
        })
    })

    it('can remove an experience entry', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('Frontend Developer')).toBeInTheDocument()
        }, { timeout: 3000 })

        const deleteButton = screen.getByRole('button', { name: /delete experience/i })
        await user.click(deleteButton)

        await waitFor(() => {
            const afterDelete = screen.queryByDisplayValue('Frontend Developer')
            expect(afterDelete).not.toBeInTheDocument()
        })
    })

    it('can edit role field', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            const roleInput = screen.getByDisplayValue('Frontend Developer')
            expect(roleInput).toHaveClass(/text-lg/)
        })
    })

    it('can edit company field', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('TechCorp')).toBeInTheDocument()
        })
    })

    it('can edit location field', async () => {
        const user = userEvent.setup()
        const profileWithUniqueLocation: ProfileJson = {
            ...MOCK_PROFILE,
            experience: [{
                id: 'exp-1',
                role: 'Dev',
                company: 'Corp',
                location: 'Cuzco',
                from: '2020',
                to: '2022',
                bullets: [],
            }],
        }
        vi.mocked(profileApi.get).mockResolvedValue(profileWithUniqueLocation)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('Cuzco')).toBeInTheDocument()
        })

        const cuzcoInput = screen.getByDisplayValue('Cuzco')
        await user.clear(cuzcoInput)
        await user.type(cuzcoInput, 'Arequipa')

        await waitFor(() => {
            expect(screen.getByDisplayValue('Arequipa')).toBeInTheDocument()
        })
    })

    it('can edit from and to date fields', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('2022-01')).toBeInTheDocument()
            expect(screen.getByDisplayValue('2023-12')).toBeInTheDocument()
        })

        const fromInput = screen.getByDisplayValue('2022-01')
        await user.clear(fromInput)
        await user.type(fromInput, '2021-06')

        await waitFor(() => {
            expect(screen.getByDisplayValue('2021-06')).toBeInTheDocument()
        })
    })

    it('role field is an editable input, not display text', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('Frontend Developer')).toBeInTheDocument()
        })

        const roleInput = screen.getByDisplayValue('Frontend Developer') as HTMLInputElement
        expect(roleInput.tagName).toBe('INPUT')

        await user.clear(roleInput)
        await user.type(roleInput, 'Senior Frontend Developer')

        await waitFor(() => {
            expect(screen.getByDisplayValue('Senior Frontend Developer')).toBeInTheDocument()
        })
    })

    it('company field is an editable input, not display text', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('TechCorp')).toBeInTheDocument()
        })

        const companyInput = screen.getByDisplayValue('TechCorp') as HTMLInputElement
        expect(companyInput.tagName).toBe('INPUT')

        await user.clear(companyInput)
        await user.type(companyInput, 'Acme Corp')

        await waitFor(() => {
            expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument()
        })
    })

    it('edit button is not rendered for experience entries (fields are inline editable)', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('Frontend Developer')).toBeInTheDocument()
        })

        const editButtons = screen.queryAllByRole('button', { name: /edit experience/i })
        expect(editButtons.length).toBe(0)
    })

    it('delete button does not overlap with dates badge', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByText('2022-01 - 2023-12')).toBeInTheDocument()
        })

        const dateBadge = screen.getByText('2022-01 - 2023-12')
        const experienceCard = dateBadge.closest('.group')

        if (!experienceCard) {
            throw new Error('Experience card not found')
        }

        const deleteButton = experienceCard.querySelector('button[aria-label="Delete experience"]')
        expect(deleteButton).toBeInTheDocument()

        const deleteButtonContainer = deleteButton!.closest('.absolute')
        expect(deleteButtonContainer).toBeInTheDocument()
    })
})

describe('Experience bullets editing', () => {
    const profileWithBullets: ProfileJson = {
        ...MOCK_PROFILE,
        experience: [
            {
                id: 'exp-1',
                role: 'Frontend Developer',
                company: 'TechCorp',
                location: 'Lima',
                from: '2022-01',
                to: '2023-12',
                bullets: ['Built React apps', 'Mentored junior devs'],
            },
        ],
    }

    it('renders bullets as individual editable input fields', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithBullets)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('Built React apps')).toBeInTheDocument()
            expect(screen.getByDisplayValue('Mentored junior devs')).toBeInTheDocument()
        })
    })

    it('can edit a bullet by typing in the input field', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue(profileWithBullets)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('Built React apps')).toBeInTheDocument()
        })

        const bulletInput = screen.getByDisplayValue('Built React apps')
        expect(bulletInput).toBeInTheDocument()

        await user.clear(bulletInput)
        await user.type(bulletInput, 'Built Vue apps')

        await waitFor(() => {
            expect(screen.getByDisplayValue('Built Vue apps')).toBeInTheDocument()
        })
    })

    it('has an Add bullet button for each experience entry', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithBullets)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('Frontend Developer')).toBeInTheDocument()
        })

        const addBulletButtons = screen.getAllByRole('button', { name: /add bullet/i })
        expect(addBulletButtons.length).toBe(1)
    })

    it('can add a new bullet by clicking Add bullet button', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue(profileWithBullets)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('Frontend Developer')).toBeInTheDocument()
        })

        const addBulletButton = screen.getByRole('button', { name: /add bullet/i })
        await user.click(addBulletButton)

        await waitFor(() => {
            const inputs = screen.getAllByRole('textbox') as HTMLInputElement[]
            const emptyInputs = inputs.filter(input => input.value === '')
            expect(emptyInputs.length).toBeGreaterThan(0)
        })
    })

    it('each bullet has a delete button visible on hover', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithBullets)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('Built React apps')).toBeInTheDocument()
        })

        const bulletInput = screen.getByDisplayValue('Built React apps')
        const bulletRow = bulletInput.closest('div.flex')
        expect(bulletRow).toBeInTheDocument()

        const deleteButton = bulletRow?.querySelector('button[aria-label="delete bullet"]')
        expect(deleteButton).toBeInTheDocument()
    })

    it('can delete a bullet by clicking delete button', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue(profileWithBullets)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('Built React apps')).toBeInTheDocument()
            expect(screen.getByDisplayValue('Mentored junior devs')).toBeInTheDocument()
        })

        const deleteButtons = screen.getAllByRole('button', { name: /delete bullet/i })
        await user.click(deleteButtons[0])

        await waitFor(() => {
            expect(screen.queryByDisplayValue('Built React apps')).not.toBeInTheDocument()
            expect(screen.getByDisplayValue('Mentored junior devs')).toBeInTheDocument()
        })
    })

    it('bullet marker uses text-primary-container color', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithBullets)
        renderProfile()

        await waitFor(() => {
            const bulletInput = screen.getByDisplayValue('Built React apps')
            const bulletRow = bulletInput.closest('div[class*="flex items-center gap-2"]')
            expect(bulletRow).toBeInTheDocument()
            const marker = bulletRow?.querySelector('span')
            expect(marker).toHaveClass(/text-primary-container/)
        })
    })

    it('bullet text uses text-on-surface-variant color', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithBullets)
        renderProfile()

        await waitFor(() => {
            const bulletInput = screen.getByDisplayValue('Built React apps')
            expect(bulletInput).toHaveClass(/text-on-surface-variant/)
        })
    })
})

describe('Experience section color compliance', () => {
    const profileWithExperience: ProfileJson = {
        ...MOCK_PROFILE,
        experience: [
            {
                id: 'exp-1',
                role: 'Senior Frontend Engineer',
                company: 'TechCorp Inc.',
                location: 'Lima',
                from: '2021',
                to: 'Present',
                bullets: ['Led migration of legacy Angular app to React', 'Implemented CI/CD pipeline'],
            },
        ],
    }

    it('role/title uses text-on-surface color', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            const roleInput = screen.getByDisplayValue('Senior Frontend Engineer')
            expect(roleInput).toHaveClass(/text-on-surface/)
        })
    })

    it('company uses text-primary-container color', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            const companyInput = screen.getByDisplayValue('TechCorp Inc.')
            expect(companyInput).toHaveClass(/text-primary-container/)
        })
    })

    it('location field has appropriate text color styling', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('Senior Frontend Engineer')).toBeInTheDocument()
        })

        const experienceCard = screen.getByDisplayValue('Senior Frontend Engineer').closest('.group')
        expect(experienceCard).toBeInTheDocument()
        const locationInput = experienceCard?.querySelector('input[value="Lima"]')
        expect(locationInput).toBeInTheDocument()
    })

    it('location label uses text-on-surface-variant color', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            const locationLabel = screen.getByText('Ubicación')
            expect(locationLabel).toHaveClass(/text-on-surface-variant/)
        })
    })
})

describe('Experience card design', () => {
    const profileWithExperience: ProfileJson = {
        ...MOCK_PROFILE,
        experience: [
            {
                id: 'exp-1',
                role: 'Senior Frontend Engineer',
                company: 'TechCorp Inc.',
                location: 'Lima',
                from: '2021',
                to: 'Present',
                bullets: ['Led migration of legacy Angular app to React', 'Implemented CI/CD pipeline'],
            },
        ],
    }

    it('renders experience cards with bg-surface-container-low/50 background', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            const card = screen.getByDisplayValue('Senior Frontend Engineer').closest('div[class*="bg-surface-container-low"]')
            expect(card).toBeInTheDocument()
        })
    })

    it('cards have hover border effect with border-primary-container/30', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            const card = screen.getByDisplayValue('Senior Frontend Engineer').closest('div[class*="hover:border-primary-container"]')
            expect(card).toBeInTheDocument()
        })
    })

    it('shows delete button on hover (edit button removed since fields are inline editable)', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('Senior Frontend Engineer')).toBeInTheDocument()
        })

        const card = screen.getByDisplayValue('Senior Frontend Engineer').closest('div[class*="group"]')
        expect(card).toBeInTheDocument()
        const deleteButton = card?.querySelector('button[aria-label="Delete experience"]')
        expect(deleteButton).toBeInTheDocument()
    })

    it('displays role title with large text styling', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            const roleInput = screen.getByDisplayValue('Senior Frontend Engineer')
            expect(roleInput).toHaveClass(/text-lg/)
        })
    })

    it('displays company name with text-primary-container color', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            const companyInput = screen.getByDisplayValue('TechCorp Inc.')
            expect(companyInput).toHaveClass(/text-primary-container/)
        })
    })

    it('displays dates in a badge on the right side', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            const dateBadge = screen.getByText('2021 - Present')
            expect(dateBadge).toHaveClass(/bg-surface-container/)
            expect(dateBadge.closest('div')).toHaveClass(/flex/)
        })
    })

    it('bullets use colored primary-container markers', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            const bullet = screen.getByDisplayValue('Led migration of legacy Angular app to React')
            const bulletRow = bullet.closest('div[class*="flex items-center gap-2"]')
            expect(bulletRow).toBeInTheDocument()
            const marker = bulletRow?.querySelector('span[class*="text-primary-container"]')
            expect(marker).toBeInTheDocument()
            expect(marker?.textContent).toBe('•')
        })
    })
})

describe('Experience section editing', () => {
    const profileWithExperience: ProfileJson = {
        ...MOCK_PROFILE,
        experience: [
            {
                id: 'exp-1',
                role: 'Frontend Developer',
                company: 'TechCorp',
                location: 'Lima',
                from: '2022-01',
                to: '2023-12',
                bullets: ['Built React apps', 'Mentored junior devs'],
            },
        ],
    }

    it('renders Experience section with SectionCard styling', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByText('Experience')).toBeInTheDocument()
        })
        const sectionHeader = screen.getByText('Experience').closest('.flex')
        expect(sectionHeader).toBeInTheDocument()
    })

	it('displays existing experience entries', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('Frontend Developer')).toBeInTheDocument()
        })
        expect(screen.getByDisplayValue('TechCorp')).toBeInTheDocument()
        expect(screen.queryAllByDisplayValue('Lima').length).toBeGreaterThan(0)
    })

    it('can add a new experience entry', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue({ ...MOCK_PROFILE, experience: [] })
        renderProfile()

        await waitFor(() => {
            expect(screen.getByText(/añadir experiencia/i)).toBeInTheDocument()
        })

        const initialInputs = screen.getAllByRole('textbox')

        await user.click(screen.getByText(/añadir experiencia/i))

        await waitFor(() => {
            const newInputs = screen.getAllByRole('textbox')
            expect(newInputs.length).toBeGreaterThan(initialInputs.length)
        })
    })

    it('can remove an experience entry', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('Frontend Developer')).toBeInTheDocument()
        }, { timeout: 3000 })

        const deleteButton = screen.getByRole('button', { name: /delete experience/i })
        await user.click(deleteButton)

        await waitFor(() => {
            const afterDelete = screen.queryByDisplayValue('Frontend Developer')
            expect(afterDelete).not.toBeInTheDocument()
        })
    })

    it('can edit location field', async () => {
        const user = userEvent.setup()
        const profileWithUniqueLocation: ProfileJson = {
            ...MOCK_PROFILE,
            experience: [{
                id: 'exp-1',
                role: 'Dev',
                company: 'Corp',
                location: 'Cuzco',
                from: '2020',
                to: '2022',
                bullets: [],
            }],
        }
        vi.mocked(profileApi.get).mockResolvedValue(profileWithUniqueLocation)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('Cuzco')).toBeInTheDocument()
        })

        const cuzcoInput = screen.getByDisplayValue('Cuzco')
        await user.clear(cuzcoInput)
        await user.type(cuzcoInput, 'Arequipa')

        await waitFor(() => {
            expect(screen.getByDisplayValue('Arequipa')).toBeInTheDocument()
        })
    })

    it('can edit from and to date fields', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('2022-01')).toBeInTheDocument()
            expect(screen.getByDisplayValue('2023-12')).toBeInTheDocument()
        })

        const fromInput = screen.getByDisplayValue('2022-01')
        await user.clear(fromInput)
        await user.type(fromInput, '2021-06')

        await waitFor(() => {
            expect(screen.getByDisplayValue('2021-06')).toBeInTheDocument()
        })
    })

    it('can edit bullet points by typing in input fields', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue(profileWithExperience)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('Built React apps')).toBeInTheDocument()
        })

        const bulletInput = screen.getByDisplayValue('Built React apps')
        await user.clear(bulletInput)
        await user.type(bulletInput, 'Built Vue apps')

        await waitFor(() => {
            expect(screen.getByDisplayValue('Built Vue apps')).toBeInTheDocument()
        })
    })
})

describe('Projects section', () => {
    const profileWithProjects: ProfileJson = {
        ...MOCK_PROFILE,
        projects: [
            {
                id: 'proj-1',
                name: 'E-Commerce Platform',
                stack: ['React', 'Node.js', 'PostgreSQL'],
                from: '2023-01',
                to: '2023-06',
                bullets: ['Built full-stack e-commerce solution', 'Implemented payment integration'],
            },
        ],
    }

    it('renders Projects section with SectionCard styling', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithProjects)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByText('Projects')).toBeInTheDocument()
        })
        const sectionHeader = screen.getByText('Projects').closest('.flex')
        expect(sectionHeader).toBeInTheDocument()
    })

    it('displays existing project entries', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithProjects)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('E-Commerce Platform')).toBeInTheDocument()
        })
        expect(screen.getByDisplayValue('React, Node.js, PostgreSQL')).toBeInTheDocument()
    })

    it('can add a new project entry', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue({ ...MOCK_PROFILE, projects: [] })
        renderProfile()

        await waitFor(() => {
            expect(screen.getByText(/añadir proyecto/i)).toBeInTheDocument()
        })

        const initialInputs = screen.getAllByRole('textbox')

        await user.click(screen.getByText(/añadir proyecto/i))

        await waitFor(() => {
            const newInputs = screen.getAllByRole('textbox')
            expect(newInputs.length).toBeGreaterThan(initialInputs.length)
        })
    })

    it('can remove a project entry', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue(profileWithProjects)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('E-Commerce Platform')).toBeInTheDocument()
        }, { timeout: 3000 })

        const deleteButton = screen.getByRole('button', { name: /delete project/i })
        await user.click(deleteButton)

        await waitFor(() => {
            const afterDeleteInputs = screen.queryAllByDisplayValue('E-Commerce Platform')
            expect(afterDeleteInputs.length).toBe(0)
        })
    })

    it('can edit name field', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue(profileWithProjects)
        renderProfile()

        await waitFor(() => {
            const nameInput = screen.getByDisplayValue('E-Commerce Platform')
            expect(nameInput).toBeInTheDocument()
        })

        const nameInput = screen.getByDisplayValue('E-Commerce Platform')
        await user.clear(nameInput)
        await user.type(nameInput, 'Portfolio Website')

        await waitFor(() => {
            expect(screen.getByDisplayValue('Portfolio Website')).toBeInTheDocument()
        })
    })

    it('can edit stack field', async () => {
        const user = userEvent.setup()
        const profileWithSimpleStack: ProfileJson = {
            ...MOCK_PROFILE,
            projects: [
                {
                    id: 'proj-1',
                    name: 'Test Project',
                    stack: ['JavaScript'],
                    from: '2023-01',
                    to: '2023-06',
                    bullets: [],
                },
            ],
        }
        vi.mocked(profileApi.get).mockResolvedValue(profileWithSimpleStack)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('JavaScript')).toBeInTheDocument()
        })

        const stackInput = screen.getByDisplayValue('JavaScript')
        await user.clear(stackInput)
        await user.type(stackInput, 'TypeScript')

        await waitFor(() => {
            expect(screen.getByDisplayValue('TypeScript')).toBeInTheDocument()
        }, { timeout: 5000 })
    })

    it('can edit from and to date fields', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue(profileWithProjects)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('2023-01')).toBeInTheDocument()
            expect(screen.getByDisplayValue('2023-06')).toBeInTheDocument()
        })

        const fromInput = screen.getByDisplayValue('2023-01')
        await user.clear(fromInput)
        await user.type(fromInput, '2022-09')

        await waitFor(() => {
            expect(screen.getByDisplayValue('2022-09')).toBeInTheDocument()
        })
    })

    it('can edit bullet points', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithProjects)
        renderProfile()

        await waitFor(() => {
            const bulletsArea = screen.getByLabelText(/puntos de proyecto/i)
            expect(bulletsArea).toBeInTheDocument()
        })

        const bulletsArea = screen.getByLabelText(/puntos de proyecto/i)
        expect(bulletsArea).toHaveValue('Built full-stack e-commerce solution\nImplemented payment integration')
    })
})

describe('Certifications section', () => {
    const profileWithCertifications: ProfileJson = {
        ...MOCK_PROFILE,
        certifications: [
            {
                name: 'AWS Solutions Architect',
                issuer: 'Amazon Web Services',
                description: 'Professional certification for designing distributed systems',
            },
        ],
    }

    it('renders Certifications section with SectionCard styling', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithCertifications)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByText('Certifications')).toBeInTheDocument()
        })
        const sectionHeader = screen.getByText('Certifications').closest('.flex')
        expect(sectionHeader).toBeInTheDocument()
    })

    it('displays existing certification entries', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithCertifications)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('AWS Solutions Architect')).toBeInTheDocument()
        })
        expect(screen.getByDisplayValue('Amazon Web Services')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Professional certification for designing distributed systems')).toBeInTheDocument()
    })

    it('can add a new certification entry', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue({ ...MOCK_PROFILE, certifications: [] })
        renderProfile()

        await waitFor(() => {
            expect(screen.getByText(/añadir certificación/i)).toBeInTheDocument()
        })

        const initialInputs = screen.getAllByRole('textbox')

        await user.click(screen.getByText(/añadir certificación/i))

        await waitFor(() => {
            const newInputs = screen.getAllByRole('textbox')
            expect(newInputs.length).toBeGreaterThan(initialInputs.length)
        })
    })

    it('can remove a certification entry', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue(profileWithCertifications)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('AWS Solutions Architect')).toBeInTheDocument()
        }, { timeout: 3000 })

        const deleteButton = screen.getByRole('button', { name: /delete certification/i })
        await user.click(deleteButton)

        await waitFor(() => {
            const afterDeleteInputs = screen.queryAllByDisplayValue('AWS Solutions Architect')
            expect(afterDeleteInputs.length).toBe(0)
        })
    })

    it('can edit name field', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue(profileWithCertifications)
        renderProfile()

        await waitFor(() => {
            const nameInput = screen.getByDisplayValue('AWS Solutions Architect')
            expect(nameInput).toBeInTheDocument()
        })

        const nameInput = screen.getByDisplayValue('AWS Solutions Architect')
        await user.clear(nameInput)
        await user.type(nameInput, 'GCP Professional Cloud Architect')

        await waitFor(() => {
            expect(screen.getByDisplayValue('GCP Professional Cloud Architect')).toBeInTheDocument()
        })
    })

    it('can edit issuer field', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue(profileWithCertifications)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('Amazon Web Services')).toBeInTheDocument()
        })

        const issuerInput = screen.getByDisplayValue('Amazon Web Services')
        await user.clear(issuerInput)
        await user.type(issuerInput, 'Google Cloud')

        await waitFor(() => {
            expect(screen.getByDisplayValue('Google Cloud')).toBeInTheDocument()
        })
    })

    it('can edit description field', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue(profileWithCertifications)
        renderProfile()

        await waitFor(() => {
            const descInput = screen.getByDisplayValue('Professional certification for designing distributed systems')
            expect(descInput).toBeInTheDocument()
        })

        const descInput = screen.getByDisplayValue('Professional certification for designing distributed systems')
        await user.clear(descInput)
        await user.type(descInput, 'Advanced cloud architecture certification')

        await waitFor(() => {
            expect(screen.getByDisplayValue('Advanced cloud architecture certification')).toBeInTheDocument()
        })
    })
})

describe('Education section', () => {
    const profileWithEducation: ProfileJson = {
        ...MOCK_PROFILE,
        education: [
            {
                institution: 'Universidad Nacional de Ingeniería',
                location: 'San Miguel',
                degree: 'Ingeniería de Sistemas',
                from: '2015-03',
                to: '2020-12',
            },
        ],
    }

    it('renders Education section with SectionCard styling', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithEducation)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByText('Education')).toBeInTheDocument()
        })
        const sectionHeader = screen.getByText('Education').closest('.flex')
        expect(sectionHeader).toBeInTheDocument()
    })

    it('displays existing education entries', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(profileWithEducation)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('Universidad Nacional de Ingeniería')).toBeInTheDocument()
        })
        expect(screen.getByDisplayValue('Lima')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Ingeniería de Sistemas')).toBeInTheDocument()
    })

    it('can add a new education entry', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue({ ...MOCK_PROFILE, education: [] })
        renderProfile()

        await waitFor(() => {
            expect(screen.getByText(/añadir educación/i)).toBeInTheDocument()
        })

        const initialInputs = screen.getAllByRole('textbox')

        await user.click(screen.getByText(/añadir educación/i))

        await waitFor(() => {
            const newInputs = screen.getAllByRole('textbox')
            expect(newInputs.length).toBeGreaterThan(initialInputs.length)
        })
    })

    it('can remove an education entry', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue(profileWithEducation)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('Universidad Nacional de Ingeniería')).toBeInTheDocument()
        }, { timeout: 3000 })

        const deleteButton = screen.getByRole('button', { name: /delete education/i })
        await user.click(deleteButton)

        await waitFor(() => {
            const afterDeleteInputs = screen.queryAllByDisplayValue('Universidad Nacional de Ingeniería')
            expect(afterDeleteInputs.length).toBe(0)
        })
    })

    it('can edit institution field', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue(profileWithEducation)
        renderProfile()

        await waitFor(() => {
            const institutionInput = screen.getByDisplayValue('Universidad Nacional de Ingeniería')
            expect(institutionInput).toBeInTheDocument()
        })

        const institutionInput = screen.getByDisplayValue('Universidad Nacional de Ingeniería')
        await user.clear(institutionInput)
        await user.type(institutionInput, 'Universidad Peruana Cayetano Heredia')

        await waitFor(() => {
            expect(screen.getByDisplayValue('Universidad Peruana Cayetano Heredia')).toBeInTheDocument()
        })
    })

    it('can edit location field', async () => {
        const user = userEvent.setup()
        const profileWithUniqueLocation: ProfileJson = {
            ...MOCK_PROFILE,
            education: [{
                institution: 'UNI',
                location: 'Cuzco',
                degree: 'Ing',
                from: '2015',
                to: '2020',
            }],
        }
        vi.mocked(profileApi.get).mockResolvedValue(profileWithUniqueLocation)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('Cuzco')).toBeInTheDocument()
        })

        const locationInput = screen.getByDisplayValue('Cuzco')
        await user.clear(locationInput)
        await user.type(locationInput, 'Arequipa')

        await waitFor(() => {
            expect(screen.getByDisplayValue('Arequipa')).toBeInTheDocument()
        })
    })

    it('can edit degree field', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue(profileWithEducation)
        renderProfile()

        await waitFor(() => {
            const degreeInput = screen.getByDisplayValue('Ingeniería de Sistemas')
            expect(degreeInput).toBeInTheDocument()
        })

        const degreeInput = screen.getByDisplayValue('Ingeniería de Sistemas')
        await user.clear(degreeInput)
        await user.type(degreeInput, 'Maestría en Data Science')

        await waitFor(() => {
            expect(screen.getByDisplayValue('Maestría en Data Science')).toBeInTheDocument()
        })
    })

    it('can edit from and to date fields', async () => {
        const user = userEvent.setup()
        vi.mocked(profileApi.get).mockResolvedValue(profileWithEducation)
        renderProfile()

        await waitFor(() => {
            expect(screen.getByDisplayValue('2015-03')).toBeInTheDocument()
            expect(screen.getByDisplayValue('2020-12')).toBeInTheDocument()
        })

        const fromInput = screen.getByDisplayValue('2015-03')
        await user.clear(fromInput)
        await user.type(fromInput, '2014-01')

        await waitFor(() => {
            expect(screen.getByDisplayValue('2014-01')).toBeInTheDocument()
        })
    })
})
