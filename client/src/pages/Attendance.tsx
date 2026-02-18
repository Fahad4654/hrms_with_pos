import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext';

interface DailyAttendance {
  date: string;
  firstClockIn: string;
  lastClockOut: string | null;
  totalDuration: number;
  isActive: boolean;
  isLate: boolean;
  isOffDay: boolean;
  overtimeDuration: number;
}

const Attendance: React.FC = () => {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<DailyAttendance[]>([]);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/attendance/logs');
      setLogs(data);
      // Check if the most recent day (first item) is active
      const today = new Date().toISOString().split('T')[0];
      const todayLog = data.find((l: DailyAttendance) => l.date === today);
      setIsClockedIn(!!todayLog?.isActive);
    } catch (error) {
      console.error('Failed to fetch logs', error);
      showToast('Failed to fetch attendance logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClockAction = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      if (isClockedIn) {
        await api.post('/attendance/clock-out');
        showToast('Clocked out successfully', 'success');
      } else {
        await api.post('/attendance/clock-in', {});
        showToast('Clocked in successfully', 'success');
      }
      await fetchLogs();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
     const totalMinutes = Math.floor(ms / (1000 * 60));
     const hours = Math.floor(totalMinutes / 60);
     const minutes = totalMinutes % 60;
     return `${hours}h ${minutes}m`;
  };

  if (loading && logs.length === 0) return <div className="animate-fade-in">Loading Attendance...</div>;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '4%' }}>
        <h1>Attendance</h1>
        <p style={{ color: 'var(--text-muted)' }}>Track your daily working hours and attendance history</p>
      </div>

      <div className="glass-card" style={{ padding: '6%', textAlign: 'center', marginBottom: '4%', border: '1px solid var(--glass-border)' }}>
        <div style={{ fontSize: '4rem', marginBottom: '24px' }}>🕒</div>
        <h2 style={{ marginBottom: '8px' }}>{isClockedIn ? 'You are currently Clocked In' : 'You are currently Clocked Out'}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
          {isClockedIn ? "Keep up the great work! Don't forget to clock out before you leave." : 'Ready to start your shift? Clock in to begin tracking.'}
        </p>
        <button 
          className={`btn ${isClockedIn ? '' : 'btn-primary'}`} 
          onClick={handleClockAction}
          disabled={actionLoading}
          style={{ 
            width: '240px', 
            height: '50px',
            fontSize: '1.125rem',
            justifyContent: 'center', 
            background: isClockedIn ? 'rgba(239, 68, 68, 0.1)' : '', 
            color: isClockedIn ? 'var(--error)' : '',
            border: isClockedIn ? '1px solid rgba(239, 68, 68, 0.2)' : ''
          }}
        >
          {actionLoading ? 'Processing...' : (isClockedIn ? 'Clock Out' : 'Clock In Now')}
        </button>
      </div>

      <h2 style={{ marginBottom: '2%' }}>Recent History</h2>
      <div className="glass-card table-container">
        {logs.length === 0 ? (
          <p style={{ padding: '4%', color: 'var(--text-muted)', textAlign: 'center' }}>No recent activity found. Your logs will appear here.</p>
        ) : (
          <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <th style={{ padding: '2%', width: '15%' }}>Date</th>
                <th style={{ padding: '2%', width: '15%' }}>Clock In</th>
                <th style={{ padding: '2%', width: '15%' }}>Clock Out</th>
                <th style={{ padding: '2%', width: '25%' }}>Status</th>
                <th style={{ padding: '2%', width: '20%' }}>Total Duration</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const date = new Date(log.date);
                const firstIn = new Date(log.firstClockIn);
                const lastOut = log.lastClockOut ? new Date(log.lastClockOut) : null;
                
                return (
                  <tr key={log.date} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '2% 3%' }}>{date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                    <td style={{ padding: '2% 3%' }}>{firstIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ padding: '2% 3%' }}>
                      {lastOut ? lastOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td style={{ padding: '2% 3%' }}>
                      {log.isActive ? (
                        <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>Active</span>
                      ) : (
                           <div style={{ display: 'flex', gap: '5px' }}>
                              {log.isOffDay && <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>Off Day</span>}
                              {log.isLate && <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}>Late</span>}
                              {!log.isLate && !log.isOffDay && <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' }}>On Time</span>}
                           </div>
                      )}
                    </td>
                    <td style={{ padding: '2% 3%', fontWeight: 'bold' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: log.isActive ? 'var(--primary)' : 'var(--text-color)' }}>{formatDuration(log.totalDuration)}</span>
                          {log.overtimeDuration > 0 && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>
                                  (+ {formatDuration(log.overtimeDuration)} OT)
                              </span>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Attendance;
