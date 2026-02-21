import { Home, FileText, History, LogOut } from "lucide-react"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarFooter,
    SidebarHeader,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { clearStoredToken } from "@/lib/auth"
import { useJobs } from "@/hooks/useJobs"

// Menu items.
const items = [
    { title: "Dashboard", url: "/", icon: Home },
    { title: "Plantillas", url: "/templates", icon: FileText },
    { title: "Historial", url: "/history", icon: History },
]

export function AppSidebar() {
    const location = useLocation()
    const navigate = useNavigate()
    const isOnDashboard = location.pathname === "/"
    const { data: jobs = [] } = useJobs(isOnDashboard)

    const handleLogout = () => {
        clearStoredToken()
        navigate("/login", { replace: true })
    }

    return (
        <Sidebar variant="inset" className="border-r border-border bg-sidebar" collapsible="icon">
            <SidebarHeader className="border-b border-border p-6 h-[70px] flex justify-center group-data-[collapsible=icon]:!p-2">
                <div className="flex items-center gap-3 group-data-[collapsible=icon]:gap-0">
                    <div className="flex shrink-0 w-[44px] h-[44px] items-center justify-center rounded-[16px] bg-accent-gradient shadow-glow-primary transition-all duration-300 hover:scale-105 hover:rotate-[-3deg] hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                        <img src="/vite.svg" alt="" className="w-7 h-7" />
                    </div>
                    <span className="text-[1.35rem] font-bold text-gradient tracking-tight group-data-[collapsible=icon]:hidden">
                        CronOpus
                    </span>
                </div>
            </SidebarHeader>

            <SidebarContent className="px-0 py-6">
                <SidebarGroup>
                    <SidebarGroupLabel className="px-6 text-[0.7rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase mb-3 group-data-[collapsible=icon]:hidden">
                        Principal
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="px-0 space-y-1">
                            {items.map((item) => {
                                const isActive = location.pathname === item.url;
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive}
                                            tooltip={item.title}
                                            className={`
                                                h-auto py-3 px-6 transition-all duration-150 rounded-none border-l-[3px] w-full justify-start
                                                hover:bg-white/5 hover:translate-x-1 hover:text-foreground
                                                group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!p-2 group-data-[collapsible=icon]:border-none
                                                ${isActive
                                                    ? "bg-primary/15 text-accent-light border-primary"
                                                    : "border-transparent text-secondary-foreground"}
                                            `}
                                        >
                                            <Link to={item.url} className="flex items-center gap-3 w-full group-data-[collapsible=icon]:justify-center">
                                                <item.icon className={`h-5 w-5 shrink-0 ${isActive ? "text-primary" : ""}`} />
                                                <span className="font-medium text-[0.9rem] group-data-[collapsible=icon]:hidden">{item.title}</span>
                                                {item.title === "Dashboard" && (
                                                    <span className="ml-auto bg-accent-gradient text-white text-[0.7rem] font-bold px-1.5 py-0.5 rounded-[12px] min-w-[22px] text-center shadow-sm group-data-[collapsible=icon]:hidden">
                                                        {jobs.length}
                                                    </span>
                                                )}
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-border p-6 group-data-[collapsible=icon]:p-4 space-y-3">
                <div className="flex items-center gap-2 text-[0.8rem] text-muted-foreground group-data-[collapsible=icon]:justify-center">
                    <div className="h-2 w-2 rounded-full bg-status-generated animate-[pulse_2s_infinite]" />
                    <span className="group-data-[collapsible=icon]:hidden">Scrapers activos</span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                    onClick={handleLogout}
                >
                    <LogOut className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">Cerrar sesión</span>
                </Button>
            </SidebarFooter>
        </Sidebar>
    )
}
