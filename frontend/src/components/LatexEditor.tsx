import Editor from '@monaco-editor/react'
import { Button } from '@/components/ui/button'
import { Save, Play } from 'lucide-react'

// Default LaTeX sample for demo
const DEFAULT_LATEX = `\\documentclass{article}
\\usepackage{geometry, hyperref}
\\geometry{margin=1in}

% START_HEADER %
\\begin{document}
\\section*{Tu Nombre Completo}
\\textit{Backend Developer}
\\\\
\\texttt{email@example.com} | +51 999 888 777 | linkedin.com/in/tunombre
% END_HEADER %

\\rule{\\textwidth}{0.5pt}

% START_EXPERIENCE %
\\section*{Experiencia Profesional}
\\textbf{Python Developer} \\hfill 2023 - Presente \\\\
\\textit{TechStartup SAC • Lima, Perú}
\\begin{itemize}
    \\item Desarrollé APIs REST con FastAPI manejando +10k requests/día
    \\item Implementé sistema de autenticación JWT con refresh tokens
    \\item Optimicé queries SQL reduciendo tiempo de respuesta en 40\\%
\\end{itemize}
% END_EXPERIENCE %

% START_SKILLS %
\\section*{Habilidades Técnicas}
Python, FastAPI, Django, PostgreSQL, Docker, Git, AWS
% END_SKILLS %

\\end{document}`

// Custom Lavender Nights theme for Monaco
const LAVENDER_THEME = {
    base: 'vs-dark' as const,
    inherit: true,
    rules: [
        { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'c586c0' },
        { token: 'string', foreground: 'ce9178' },
        { token: 'number', foreground: 'b5cea8' },
        { token: 'tag', foreground: '569cd6' },
        { token: 'delimiter.curly', foreground: 'ffd700' },
        { token: 'delimiter.bracket', foreground: 'ffd700' },
    ],
    colors: {
        'editor.background': '#0f0a1a',
        'editor.foreground': '#e2ddf5',
        'editor.lineHighlightBackground': '#1a1230',
        'editorLineNumber.foreground': '#4a3f6b',
        'editorLineNumber.activeForeground': '#8b5cf6',
        'editor.selectionBackground': '#8b5cf633',
        'editorCursor.foreground': '#c4b5fd',
        'editor.inactiveSelectionBackground': '#8b5cf620',
    },
}

interface LatexEditorProps {
    value: string
    onChange: (value: string) => void
    filename?: string
    onSave?: () => void
    onCompile?: () => void
    isCompiling?: boolean
}

export function LatexEditor({
    value,
    onChange,
    filename = 'documento.tex',
    onSave,
    onCompile,
    isCompiling = false,
}: LatexEditorProps) {
    const handleEditorMount = (_editor: any, monaco: any) => {
        // Register LaTeX language (Monaco doesn't have built-in LaTeX support)
        monaco.languages.register({ id: 'latex' })

        // Monarch tokenizer for LaTeX syntax highlighting
        monaco.languages.setMonarchTokensProvider('latex', {
            tokenizer: {
                root: [
                    // Comments
                    [/%.*$/, 'comment'],

                    // Commands like \documentclass, \begin, \section*, \textbf, etc.
                    [/\\[a-zA-Z@]+\*?/, 'keyword'],

                    // Curly braces (arguments)
                    [/[{}]/, 'delimiter.curly'],

                    // Square brackets (optional arguments)
                    [/[\[\]]/, 'delimiter.bracket'],

                    // Math mode (inline $...$)
                    [/\$/, { token: 'string', next: '@math' }],

                    // Escaped characters like \\ \% \&
                    [/\\[\\%&$#_{}~^]/, 'string'],

                    // Numbers
                    [/\d+/, 'number'],
                ],
                math: [
                    [/\$/, { token: 'string', next: '@pop' }],
                    [/\\[a-zA-Z]+/, 'keyword'],
                    [/./, 'string'],
                ],
            },
        })

        // Register Lavender Nights theme
        monaco.editor.defineTheme('lavender-nights', LAVENDER_THEME)
        monaco.editor.setTheme('lavender-nights')
    }

    return (
        <div className="flex flex-col h-full">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/50 border-b border-border">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span className="w-2 h-2 rounded-full bg-status-generated" />
                    <span>Editor LaTeX</span>
                    <span className="text-muted-foreground text-xs">— {filename}</span>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 border-border"
                        onClick={onSave}
                    >
                        <Save className="h-3.5 w-3.5 mr-1" />
                        Guardar
                    </Button>
                    <Button
                        size="sm"
                        className="text-xs h-7 bg-primary hover:bg-primary/90"
                        onClick={onCompile}
                        disabled={isCompiling}
                    >
                        <Play className="h-3.5 w-3.5 mr-1" />
                        {isCompiling ? 'Compilando...' : 'Compilar'}
                    </Button>
                </div>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 min-h-0">
                <Editor
                    defaultLanguage="latex"
                    value={value}
                    onChange={(v) => onChange(v ?? '')}
                    onMount={handleEditorMount}
                    theme="vs-dark"
                    options={{
                        fontSize: 14,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        lineNumbers: 'on',
                        minimap: { enabled: false },
                        wordWrap: 'on',
                        padding: { top: 16 },
                        scrollBeyondLastLine: false,
                        renderLineHighlight: 'line',
                        cursorBlinking: 'smooth',
                        smoothScrolling: true,
                        bracketPairColorization: { enabled: true },
                    }}
                />
            </div>
        </div>
    )
}

export { DEFAULT_LATEX }
