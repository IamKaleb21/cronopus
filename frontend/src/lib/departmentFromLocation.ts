export type Department = 'Lima' | 'Trujillo' | 'Remoto' | 'Otros'

export function getDepartmentFromLocation(location: string): Department {
    const lower = (location ?? '').trim().toLowerCase()
    if (!lower) return 'Otros'
    if (lower.includes('remoto')) return 'Remoto'
    if (lower.includes('lima')) return 'Lima'
    if (lower.includes('trujillo')) return 'Trujillo'
    return 'Otros'
}
