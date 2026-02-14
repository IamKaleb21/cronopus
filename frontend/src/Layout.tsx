
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Outlet } from "react-router-dom"

export default function Layout() {
    return (
        <SidebarProvider defaultOpen={true}>
            <TooltipProvider>
                <AppSidebar />
                <main className="flex min-h-screen flex-1 flex-col bg-background transition-all duration-300 ease-in-out">
                    <header className="flex h-16 shrink-0 items-center justify-between border-b gap-2 px-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                        <div className="flex items-center gap-2">
                            <SidebarTrigger className="-ml-1" />
                            {/* Breadcrumbs could go here */}
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Header actions (User, Theme Toggle) */}
                        </div>
                    </header>
                    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                        <Outlet />
                    </div>
                </main>
                <Toaster />
            </TooltipProvider>
        </SidebarProvider>
    )
}
