import { useAuth } from '../../hooks/useAuth'
import Analytics from './Analytics'
import './DashboardHome.css'

export default function DashboardHome() {
    const { client, signOut } = useAuth()

    const handleSignOut = async () => {
        await signOut()
    }

    return (
        <div className="dashboard">
            <nav className="dashboard-nav">
                <div className="nav-brand">
                    <h2>SAITS Dashboard</h2>
                </div>
                <div className="nav-user">
                    <span>{client?.company_name || client?.email}</span>
                    <button onClick={handleSignOut} className="btn-secondary">
                        Sign Out
                    </button>
                </div>
            </nav>

            <main className="dashboard-main">
                <Analytics />
            </main>
        </div>
    )
}
