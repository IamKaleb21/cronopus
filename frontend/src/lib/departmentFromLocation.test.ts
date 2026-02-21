import { describe, it, expect } from 'vitest'
import { getDepartmentFromLocation } from './departmentFromLocation'

describe('getDepartmentFromLocation', () => {
    it('returns Lima when location contains lima', () => {
        expect(getDepartmentFromLocation('Lima')).toBe('Lima')
        expect(getDepartmentFromLocation('Lima - San Isidro')).toBe('Lima')
    })
    it('returns Remoto when location contains remoto (priority over Lima)', () => {
        expect(getDepartmentFromLocation('Lima, Remoto')).toBe('Remoto')
        expect(getDepartmentFromLocation('Remoto')).toBe('Remoto')
    })
    it('returns Trujillo when location contains trujillo', () => {
        expect(getDepartmentFromLocation('Trujillo')).toBe('Trujillo')
        expect(getDepartmentFromLocation('Trujillo, La Libertad')).toBe('Trujillo')
    })
    it('returns Otros for unknown locations', () => {
        expect(getDepartmentFromLocation('Arequipa')).toBe('Otros')
        expect(getDepartmentFromLocation('')).toBe('Otros')
        expect(getDepartmentFromLocation('   ')).toBe('Otros')
    })
})
