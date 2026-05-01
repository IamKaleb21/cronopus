import type { ReactNode } from "react"

interface PageHeaderProps {
    title: string
    description?: string
    icon?: ReactNode
    actions?: ReactNode
}

export function PageHeader({ title, description, icon, actions }: PageHeaderProps) {
    return (
        <div className="flex items-center justify-between px-6 py-4 bg-background border-b border-border">
            <div className="flex items-center gap-3">
                {icon && (
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        {icon}
                    </div>
                )}
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-gradient">{title}</h1>
                    {description && (
                        <p className="text-sm text-muted-foreground">{description}</p>
                    )}
                </div>
            </div>
            {actions && <div className="flex gap-2">{actions}</div>}
        </div>
    )
}