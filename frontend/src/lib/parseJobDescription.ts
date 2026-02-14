export type ParsedSection = {
    title: string
    body: string
}

export type ParsedDescription = {
    sections: ParsedSection[]
}

const SECTION_HEADERS = [
    'Requisitos',
    'Condiciones del contrato',
    'Como postular',
    'Recomendaciones para postular',
    'Resultados',
    'Te sugerimos:', // Used as delimiter only; section not included in result
] as const

const SUB_SECTION_LABELS = [
    'Número de vacantes',
    'Modalidad de prácticas',
    'Formación académica',
    'Actividades',
    'Requisitos',
    'Conocimientos',
    'Otros conocimientos',
    'Funciones',
    'Beneficios',
    'Lugar de prácticas',
    'Subvención',
    'Plazo para postular',
    'COMO POSTULAR',
    'REGISTRO DE POSTULANTE',
    'Pasos para Inscribirse',
    'Descargar bases',
] as const

const IMPLICIT_LIST_LABELS = ['Requisitos', 'Funciones'] as const
const MAX_PHRASE_LENGTH_FOR_SPLIT = 100

function formatSubsectionBreaks(text: string): string {
    let result = text
    for (const label of SUB_SECTION_LABELS) {
        const pattern = new RegExp(`(?<!\\n)(${escapeRegex(label)}:)`, 'g')
        result = result.replace(pattern, '\n$1')
    }
    return result.replace(/^\n+/, '').trim()
}

function formatListBreaks(text: string): string {
    return text
        .replace(/(\s)(\d+\.\s)/g, '\n$2')
        .replace(/(\s)([a-z]\)\s)/g, '\n$2')
        .trim()
}

function formatLabelValueBreaks(text: string): string {
    let result = text
    for (const label of SUB_SECTION_LABELS) {
        const escaped = escapeRegex(label)
        result = result.replace(
            new RegExp(`(${escaped}:\\s*[^\\n]+?)(?=\\n[\\s\\S]*?${escaped}:|$)`, 'gs'),
            (match) => match.trimEnd() + '\n'
        )
    }
    return result.replace(/\n+$/, '').trim()
}

function formatImplicitListBreaks(text: string, sectionTitle: string): string {
    const shouldProcessRecomendaciones = sectionTitle === 'Recomendaciones para postular'
    const shouldProcessRequisitosOrCondiciones =
        sectionTitle === 'Requisitos' || sectionTitle === 'Condiciones del contrato'

    if (!shouldProcessRecomendaciones && !shouldProcessRequisitosOrCondiciones) {
        return text
    }

    const lines = text.split('\n')
    const result: string[] = []

    for (const line of lines) {
        let processed = line
        const shouldApplyToLine =
            shouldProcessRecomendaciones ||
            IMPLICIT_LIST_LABELS.some((l) => line.startsWith(`${l}:`))

        if (shouldApplyToLine) {
            processed = splitImplicitListItems(processed)
        }
        result.push(processed)
    }

    return result.join('\n')
}

function splitImplicitListItems(text: string): string {
    const regex = /\.\s+([A-ZÁÉÍÓÚÑ])/g
    let lastIndex = 0
    let output = ''

    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
        const segmentLength = match.index - lastIndex

        output += text.slice(lastIndex, match.index + 1)
        if (segmentLength < MAX_PHRASE_LENGTH_FOR_SPLIT) {
            output += '\n' + match[1]
        } else {
            output += ' ' + match[1]
        }
        lastIndex = match.index + match[0].length
    }
    output += text.slice(lastIndex)
    return output
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function formatBody(rawBody: string, sectionTitle: string): string {
    const step1 = formatSubsectionBreaks(rawBody)
    const step2 = formatListBreaks(step1)
    const step3 = formatLabelValueBreaks(step2)
    return formatImplicitListBreaks(step3, sectionTitle)
}

export function parseJobDescription(
    description: string,
    source: string
): ParsedDescription | null {
    if (source !== 'PRACTICAS_PE') return null
    return parsePracticasDescription(description)
}

export function parsePracticasDescription(
    description: string
): ParsedDescription {
    if (!description.trim()) return { sections: [] }

    const sections: ParsedSection[] = []

    const headerPattern = SECTION_HEADERS.map((h) =>
        h === 'Requisitos' ? 'Requisitos(?!:)' : escapeRegex(h)
    ).join('|')
    const regex = new RegExp(`(${headerPattern})`, 'g')

    const matches: { index: number; header: string }[] = []
    let m: RegExpExecArray | null
    while ((m = regex.exec(description)) !== null) {
        matches.push({ index: m.index, header: m[1] })
    }

    if (matches.length === 0) {
        const body = formatBody(description.trim(), '')
        sections.push({ title: '', body })
        return { sections }
    }

    for (let i = 0; i < matches.length; i++) {
        const current = matches[i]
        if (current.header === 'Te sugerimos:') continue

        const next = matches[i + 1]
        const start = current.index + current.header.length
        const end = next ? next.index : description.length
        const rawBody = description.slice(start, end).trim()
        const body = formatBody(rawBody, current.header)
        sections.push({ title: current.header, body })
    }

    return { sections }
}
