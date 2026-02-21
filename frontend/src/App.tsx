import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import Layout from "./Layout"
import Dashboard from "./pages/Dashboard"
import Templates from "./pages/Templates"
import History from "./pages/History"
import GeneratedCvs from "./pages/GeneratedCvs"
import EditGeneratedCv from "./pages/EditGeneratedCv"
import Profile from "./pages/Profile"
import EditorPage from "./pages/EditorPage"
import Login from "./pages/Login"
import { AuthGuard } from "./components/AuthGuard"

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AuthGuard />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="templates" element={<Templates />} />
              <Route path="editor" element={<EditorPage />} />
              <Route path="history" element={<History />} />
              <Route path="generated-cvs" element={<GeneratedCvs />} />
              <Route path="generated-cvs/:id/edit" element={<EditGeneratedCv />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App

