import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import './Analytics.css'

interface Execution {
    id: string
    automation_type_id: number
    status: 'success' | 'failed'
    duration_seconds: number
    executed_at: string
    automation_types: {
        name: string
        estimated_time_saved_minutes: number
        estimated_cost_saved: number
    }
}

interface Stats {
    totalExecutions: number
    successRate: number
    timeSaved: number // minutes
    moneySaved: number // dollars
}

export default function Analytics() {
    const { client } = useAuth()
    const [executions, setExecutions] = useState<Execution[]>([])
    const [stats, setStats] = useState<Stats>({
        totalExecutions: 0,
        successRate: 0,
        timeSaved: 0,
        moneySaved: 0,
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (client) {
            fetchExecutions()
        }
    }, [client])

    const fetchExecutions = async () => {
        try {
            const { data, error } = await supabase
                .from('executions')
                .select(`
          id,
          automation_type_id,
          status,
          duration_seconds,
          executed_at,
          automation_types (
            name,
            estimated_time_saved_minutes,
            estimated_cost_saved
          )
        `)
                .eq('client_id', client?.id)
                .order('executed_at', { ascending: false })
                .limit(50)

            if (error) throw error

            setExecutions(data || [])
            calculateStats(data || [])
        } catch (error) {
            console.error('Error fetching executions:', error)
        } finally {
            setLoading(false)
        }
    }

    const calculateStats = (executions: Execution[]) => {
        const total = executions.length
        const successful = executions.filter((e) => e.status === 'success')
        const successCount = successful.length
        const successRate = total > 0 ? (successCount / total) * 100 : 0

        // Calculate time and money saved (only for successful executions)
        const timeSaved = successful.reduce((sum, exec) => {
            return sum + (exec.automation_types?.estimated_time_saved_minutes || 0)
        }, 0)

        const moneySaved = successful.reduce((sum, exec) => {
            return sum + (exec.automation_types?.estimated_cost_saved || 0)
        }, 0)

        setStats({
            totalExecutions: total,
            successRate: Math.round(successRate),
            timeSaved,
            moneySaved,
        })
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const formatDuration = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        return `${minutes}m ${remainingSeconds}s`
    }

    if (loading) {
        return (
            <div className="analytics-container">
                <div className="loading-spinner"></div>
                <p>Loading analytics...</p>
            </div>
        )
    }

    return (
        <div className="analytics-container">
            <h2>Analytics Dashboard</h2>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                        <div className="stat-label">Total Executions</div>
                        <div className="stat-value">{stats.totalExecutions}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <div className="stat-label">Success Rate</div>
                        <div className="stat-value">{stats.successRate}%</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">⏰</div>
                    <div className="stat-content">
                        <div className="stat-label">Time Saved</div>
                        <div className="stat-value">
                            {Math.floor(stats.timeSaved / 60)}h {stats.timeSaved % 60}m
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                        <div className="stat-label">Money Saved</div>
                        <div className="stat-value">${stats.moneySaved.toFixed(0)}</div>
                    </div>
                </div>
            </div>

            {/* Recent Executions Table */}
            <div className="executions-section">
                <h3>Recent Executions</h3>
                {executions.length === 0 ? (
                    <div className="empty-state">
                        <p>No executions yet. Your automations will appear here once they run.</p>
                    </div>
                ) : (
                    <div className="executions-table-container">
                        <table className="executions-table">
                            <thead>
                                <tr>
                                    <th>Automation</th>
                                    <th>Status</th>
                                    <th>Duration</th>
                                    <th>Savings</th>
                                    <th>Executed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {executions.map((execution) => (
                                    <tr key={execution.id}>
                                        <td className="automation-name">
                                            {execution.automation_types?.name || 'Unknown'}
                                        </td>
                                        <td>
                                            <span className={`status-badge status-${execution.status}`}>
                                                {execution.status === 'success' ? '✓ Success' : '✗ Failed'}
                                            </span>
                                        </td>
                                        <td>{formatDuration(execution.duration_seconds)}</td>
                                        <td className="savings-cell">
                                            {execution.status === 'success' ? (
                                                <>
                                                    <span className="time-saved">
                                                        {execution.automation_types?.estimated_time_saved_minutes}m
                                                    </span>
                                                    <span className="money-saved">
                                                        ${execution.automation_types?.estimated_cost_saved}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="no-savings">—</span>
                                            )}
                                        </td>
                                        <td className="date-cell">{formatDate(execution.executed_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
