import { describe, it, expect } from 'vitest'
import {
    parseJobDescription,
    parsePracticasDescription,
} from './parseJobDescription'

describe('parseJobDescription', () => {
    it('returns null when source is not PRACTICAS_PE', () => {
        expect(
            parseJobDescription('Some description', 'COMPUTRABAJO')
        ).toBeNull()
    })

    it('returns parsed result when source is PRACTICAS_PE', () => {
        const result = parseJobDescription('Requisitos Foo Condiciones del contrato Bar', 'PRACTICAS_PE')
        expect(result).not.toBeNull()
        expect(result?.sections.length).toBeGreaterThan(0)
    })
})

describe('parsePracticasDescription', () => {
    it('returns empty sections for empty string', () => {
        expect(parsePracticasDescription('')).toEqual({ sections: [] })
    })

    it('splits by known sections and excludes Te sugerimos from result', () => {
        const text =
            'Requisitos Número de vacantes: 01 Condiciones del contrato Lugar: Lima Como postular POSTULA AQUÍ Recomendaciones para postular Revisa las bases. Resultados Descargue las bases. Te sugerimos: Revisa otras convocatorias.'
        const result = parsePracticasDescription(text)
        expect(result.sections.length).toBe(5)
        expect(result.sections[0].title).toBe('Requisitos')
        expect(result.sections[1].title).toBe('Condiciones del contrato')
        expect(result.sections[2].title).toBe('Como postular')
        expect(result.sections[3].title).toBe('Recomendaciones para postular')
        expect(result.sections[4].title).toBe('Resultados')
        expect(result.sections.map((s) => s.title)).not.toContain('Te sugerimos:')
    })

    it('preserves content between sections', () => {
        const text = 'Requisitos Modalidad: Profesional Condiciones del contrato Lugar: Trujillo'
        const result = parsePracticasDescription(text)
        expect(result.sections[0].body).toContain('Modalidad: Profesional')
        expect(result.sections[1].body).toContain('Lugar: Trujillo')
    })

    it('treats text without recognized sections as single section without title', () => {
        const text = 'Random text with no section headers here.'
        const result = parsePracticasDescription(text)
        expect(result.sections.length).toBe(1)
        expect(result.sections[0].title).toBe('')
        expect(result.sections[0].body).toBe(text)
    })

    it('inserts line breaks before sub-section labels (Modalidad de prácticas, Formación académica, etc.)', () => {
        const text =
            'Requisitos Número de vacantes: 01 Modalidad de prácticas: Profesional Formación académica: Egresado universitario Condiciones del contrato Lugar de prácticas: Lima'
        const result = parsePracticasDescription(text)
        expect(result.sections[0].body).toContain('Modalidad de prácticas: Profesional')
        expect(result.sections[0].body).toContain('Formación académica: Egresado universitario')
        expect(result.sections[0].body).toMatch(/\n.*Modalidad de prácticas:/)
        expect(result.sections[1].body).toContain('Lugar de prácticas: Lima')
    })

    it('inserts line breaks before numbered and lettered list items (1. 2. a) b))', () => {
        const text =
            'Como postular Pasos: 1. Completar el formulario 2. Descargar anexos a) Solicitud b) Formato'
        const result = parsePracticasDescription(text)
        const body = result.sections[0]?.body ?? result.sections.find((s) => s.title === '')?.body ?? ''
        expect(body).toMatch(/\n.*1\. Completar/)
        expect(body).toMatch(/\n.*2\. Descargar/)
        expect(body).toMatch(/\n.*a\) Solicitud/)
        expect(body).toMatch(/\n.*b\) Formato/)
    })

    it('handles values with colon (e.g. Horario: 08:00 a.m. - 05:00 p.m.) without breaking', () => {
        const text =
            'Como postular Plazo para postular: El 10 de Febrero del 2026 (Horario: 08:00 a.m. - 05:00 p.m.)'
        const result = parsePracticasDescription(text)
        expect(result.sections[0].body).toContain('08:00 a.m. - 05:00 p.m.')
        expect(result.sections[0].body).toContain('Horario: 08:00')
    })

    it('handles chained sublabels (COMO POSTULAR: REGISTRO DE POSTULANTE: ...)', () => {
        const text =
            'Como postular COMO POSTULAR: REGISTRO DE POSTULANTE: La recepción se realizará a través del formulario.'
        const result = parsePracticasDescription(text)
        expect(result.sections[0].body).toContain('COMO POSTULAR:')
        expect(result.sections[0].body).toContain('REGISTRO DE POSTULANTE:')
        expect(result.sections[0].body).toContain('La recepción se realizará')
    })

    it('does not show leading colon after sub-label Requisitos (preserves Requisitos: MS Office...)', () => {
        const text =
            'Requisitos Modalidad de prácticas: Profesional Formación académica: Egresado Requisitos: MS Office a nivel intermedio. Power BI a nivel intermedio. Condiciones del contrato Lugar: Lima'
        const result = parsePracticasDescription(text)
        const reqBody = result.sections.find((s) => s.title === 'Requisitos')?.body ?? ''
        expect(reqBody).toContain('Requisitos: MS Office')
        expect(reqBody).not.toMatch(/^: MS Office|^\n: MS Office/)
    })

    it('splits implicit list items in Requisitos sub-label (period + uppercase, short phrases)', () => {
        const text =
            'Requisitos Formación académica: Egresado Requisitos: MS Office a nivel intermedio. Power BI a nivel intermedio. Manejo de SAP (deseable). Condiciones del contrato Lugar: Lima'
        const result = parsePracticasDescription(text)
        const reqBody = result.sections.find((s) => s.title === 'Requisitos')?.body ?? ''
        expect(reqBody).toMatch(/\n.*Power BI a nivel intermedio/)
        expect(reqBody).toMatch(/\n.*Manejo de SAP/)
    })

    it('splits implicit list items in Funciones sub-label', () => {
        const text =
            'Condiciones del contrato Funciones: Brindar soporte en desarrollo. Apoyar en diseño. Realizar pruebas. Lugar de prácticas: Lima'
        const result = parsePracticasDescription(text)
        const body = result.sections.find((s) => s.title === 'Condiciones del contrato')?.body ?? ''
        expect(body).toMatch(/\n.*Apoyar en diseño/)
        expect(body).toMatch(/\n.*Realizar pruebas/)
    })

    it('splits implicit list items in Recomendaciones para postular section', () => {
        const text =
            'Recomendaciones para postular Antes de postular verifique los requisitos. Solo envie su documentación a través de los medios. Verifique sus datos antes de registrar. Resultados La organización se comunicará.'
        const result = parsePracticasDescription(text)
        const body = result.sections.find((s) => s.title === 'Recomendaciones para postular')?.body ?? ''
        expect(body).toMatch(/\n.*Solo envie su documentación/)
        expect(body).toMatch(/\n.*Verifique sus datos/)
    })

    it('does not split when previous phrase is long (>= 100 chars) to avoid breaking paragraphs', () => {
        const longPhrase =
            'Este es un párrafo extenso que describe algo importante con muchos detalles para que supere los cien caracteres y no deba ser dividido en múltiples líneas.'
        const text = `Requisitos Requisitos: ${longPhrase}. Otra frase corta después. Condiciones del contrato Lugar: Lima`
        const result = parsePracticasDescription(text)
        const reqBody = result.sections.find((s) => s.title === 'Requisitos')?.body ?? ''
        expect(reqBody).toContain(longPhrase)
        expect(reqBody).toContain('Otra frase corta después')
        expect(reqBody).not.toMatch(/\nOtra frase corta después/)
    })
})
