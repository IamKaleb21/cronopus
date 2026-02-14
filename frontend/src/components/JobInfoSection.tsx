import type { Job } from '@/types'
import { Badge } from '@/components/ui/badge'
import { MapPin, Building2, Wallet } from 'lucide-react'
import { parseJobDescription, type ParsedSection } from '@/lib/parseJobDescription'

interface JobInfoSectionProps {
    job: Job
}

export function JobInfoSection({ job }: JobInfoSectionProps) {
    const parsed = parseJobDescription(job.description, job.source)
    const useParsed = parsed !== null && parsed.sections.length > 0

    return (
        <div className="p-4 bg-secondary/30 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg">{job.title}</h3>
                <Badge variant="outline" className="text-xs">
                    {job.source}
                </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-primary/80 mb-3">
                <Building2 className="h-3.5 w-3.5" />
                {job.company}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {job.location}
                </span>
                {job.salary && (
                    <span className="flex items-center gap-1">
                        <Wallet className="h-3 w-3" />
                        {job.salary}
                    </span>
                )}
            </div>
            {useParsed && parsed ? (
                <div className="space-y-3">
                    {parsed.sections.map((section: ParsedSection, i: number) => (
                        <div key={i}>
                            {section.title && (
                                <h4 className="font-semibold text-sm text-foreground mb-1">
                                    {section.title}
                                </h4>
                            )}
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                                {section.body}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {job.description}
                </p>
            )}
        </div>
    )
}
