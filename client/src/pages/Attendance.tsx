import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext';
import { useLocale } from '../context/LocaleContext';
import { exportAttendanceToPDF } from '../utils/pdfExport';
import { useAuth } from '../context/AuthContext';

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

function getTodayString(tz: string): string {
  // Use Intl.DateTimeFormat to get the date in the specific timezone
  const formatter = new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

const Attendance: React.FC = () => {
  const { showToast } = useToast();
  const { formatDate, formatTime, timezone } = useLocale();
  const [logs, setLogs] = useState<DailyAttendance[]>([]);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { user } = useAuth();
  const companyName = 'HRMS POS'; // Hardcoded for now, or fetch from settings

  useEffect(() => {
    fetchLogs();
  }, [timezone, startDate, endDate]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/attendance/logs', {
        params: { startDate, endDate }
      });
      setLogs(data);
      // Check if the most recent day (first item) is active
      const today = getTodayString(timezone || 'UTC');
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2%', flexWrap: 'wrap', gap: '16px' }}>
        <h2>History</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>From</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              style={{ padding: '8px 12px', width: 'auto' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>To</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              style={{ padding: '8px 12px', width: 'auto' }}
            />
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => exportAttendanceToPDF(logs, {
              employeeName: user?.name || 'Employee',
              companyName: companyName,
              startDate,
              endDate,
              timezone: timezone || 'UTC'
            })}
            disabled={logs.length === 0}
            style={{ padding: '8px 16px', fontSize: '0.875rem' }}
          >
            Download PDF
          </button>
        </div>
      </div>
      <div className="glass-card table-container">
        {logs.length === 0 ? (
          <p style={{ padding: '4%', color: 'var(--text-muted)', textAlign: 'center' }}>No recent activity found. Your logs will appear here.</p>
        ) : (
          <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', tableLayout: 'fixed', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <th style={{ padding: '2%', width: '5%' }}>#</th>
                <th style={{ padding: '2%', width: '15%' }}>Timestamp</th>
                <th style={{ padding: '2%', width: '15%' }}>Clock In</th>
                <th style={{ padding: '2%', width: '15%' }}>Clock Out</th>
                <th style={{ padding: '2%', width: '25%' }}>Status</th>
                <th style={{ padding: '2%', width: '20%' }}>Total Duration</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => {
                return (
                  <tr key={log.date} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '2% 3%' }}>{index + 1}</td>
                    <td style={{ padding: '2% 3%' }}>{formatDate(log.date)}</td>
                    <td className="td-wrap" style={{ padding: '2% 3%' }}>{formatTime(log.firstClockIn)}</td>
                    <td className="td-wrap" style={{ padding: '2% 3%' }}>
                      {log.lastClockOut ? formatTime(log.lastClockOut) : '-'}
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
