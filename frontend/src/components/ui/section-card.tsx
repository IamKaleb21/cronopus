import type { ReactNode } from "react"

interface SectionCardProps {
    icon: ReactNode
    title: string
    description?: string
    children: ReactNode
}

export function SectionCard({ icon, title, description, children }: SectionCardProps) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.6)] backdrop-blur-xl group" style={{ boxShadow: '0 4px 20px rgba(168, 85, 247, 0.15)' }}>
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            <div className="p-6 pb-0">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                        {icon}
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
                        {description && (
                            <p className="text-sm text-on-surface-variant mt-0.5">{description}</p>
                        )}
                    </div>
                </div>
            </div>
            <div className="px-6 pb-6">
                {children}
            </div>
        </div>
    )
}