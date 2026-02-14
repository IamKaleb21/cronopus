import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useCreateJob } from '@/hooks/useJobs'
import { Loader2 } from 'lucide-react'

interface AddJobModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function AddJobModal({ open, onOpenChange, onSuccess }: AddJobModalProps) {
    const [title, setTitle] = useState('')
    const [company, setCompany] = useState('')
    const [location, setLocation] = useState('')
    const [url, setUrl] = useState('')
    const [description, setDescription] = useState('')
    const [salary, setSalary] = useState('')

    const createMutation = useCreateJob()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || !company.trim() || !location.trim() || !url.trim() || !description.trim()) return

        try {
            await createMutation.mutateAsync({
                title: title.trim(),
                company: company.trim(),
                location: location.trim(),
                url: url.trim(),
                description: description.trim(),
                salary: salary.trim() || undefined,
            })
            onSuccess?.()
            onOpenChange(false)
            setTitle('')
            setCompany('')
            setLocation('')
            setUrl('')
            setDescription('')
            setSalary('')
        } catch {
            // Error state handled in mutation
        }
    }

    const errorMessage = createMutation.isError
        ? (createMutation.error as Error)?.message || 'Error al crear el trabajo. Intenta de nuevo.'
        : null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-card border-border backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle>Agregar trabajo personalizado</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="add-job-title">Título</Label>
                        <Input
                            id="add-job-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej: Backend Developer"
                            required
                            className="bg-secondary/50 border-border"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="add-job-company">Empresa</Label>
                        <Input
                            id="add-job-company"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            placeholder="Ej: TechCorp"
                            required
                            className="bg-secondary/50 border-border"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="add-job-location">Ubicación</Label>
                        <Input
                            id="add-job-location"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Ej: Lima, Remoto"
                            required
                            className="bg-secondary/50 border-border"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="add-job-url">URL</Label>
                        <Input
                            id="add-job-url"
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com/apply"
                            required
                            className="bg-secondary/50 border-border"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="add-job-description">Descripción</Label>
                        <Textarea
                            id="add-job-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Descripción del puesto..."
                            rows={4}
                            required
                            className="bg-secondary/50 border-border resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="add-job-salary">Salario (opcional)</Label>
                        <Input
                            id="add-job-salary"
                            value={salary}
                            onChange={(e) => setSalary(e.target.value)}
                            placeholder="Ej: S/ 3,000 - 4,000"
                            className="bg-secondary/50 border-border"
                        />
                    </div>

                    {errorMessage && (
                        <p className="text-sm text-destructive" role="alert">
                            {errorMessage}
                        </p>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-accent-gradient text-white hover:opacity-90"
                        disabled={createMutation.isPending}
                    >
                        {createMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Agregando...
                            </>
                        ) : (
                            'Agregar'
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
