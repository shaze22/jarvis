import Sidebar from '@/components/Sidebar'

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="jarvis-grid flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
