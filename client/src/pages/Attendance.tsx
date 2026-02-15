import React, { useState, useEffect } from 'react';
import api from '../services/api.js';

interface AttendanceLog {
  id: string;
  clockIn: string;
  clockOut: string | null;
}

const Attendance: React.FC = () => {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [isClockedIn, setIsClockedIn] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data } = await api.get('/attendance/logs');
      setLogs(data);
      const active = data.find((l: AttendanceLog) => !l.clockOut);
      setIsClockedIn(!!active);
    } catch (error) {
      console.error('Failed to fetch logs', error);
    }
  };

  const handleClockAction = async () => {
    try {
      if (isClockedIn) {
        await api.post('/attendance/clock-out');
      } else {
        await api.post('/attendance/clock-in');
      }
      fetchLogs();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div>
      <h1>Attendance</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Track your daily working hours</p>

      <div className="glass-card" style={{ padding: '40px', textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🕒</div>
        <h2 style={{ marginBottom: '10px' }}>{isClockedIn ? 'You are currently Clocked In' : 'You are currently Clocked Out'}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
          {isClockedIn ? 'Don\'t forget to clock out before leaving.' : 'Start your shift by clocking in below.'}
        </p>
        <button 
          className={`btn ${isClockedIn ? '' : 'btn-primary'}`} 
          onClick={handleClockAction}
          style={{ width: '200px', justifyContent: 'center', background: isClockedIn ? 'rgba(239, 68, 68, 0.2)' : '', color: isClockedIn ? 'var(--error)' : '' }}
        >
          {isClockedIn ? 'Clock Out' : 'Clock In'}
        </button>
      </div>

      <h3>Recent History</h3>
      <div className="glass-card table-container" style={{ marginTop: '20px' }}>
        {logs.length === 0 ? (
          <p style={{ padding: '20px', color: 'var(--text-muted)' }}>No recent activity found.</p>
        ) : (
          <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <th style={{ padding: '16px 24px' }}>Date</th>
                <th style={{ padding: '16px 24px' }}>Clock In</th>
                <th style={{ padding: '16px 24px' }}>Clock Out</th>
                <th style={{ padding: '16px 24px' }}>Duration</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const clockIn = new Date(log.clockIn);
                const clockOut = log.clockOut ? new Date(log.clockOut) : null;
                const duration = clockOut ? ((clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)).toFixed(2) + ' hrs' : 'Active';

                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '16px 24px' }}>{clockIn.toLocaleDateString()}</td>
                    <td style={{ padding: '16px 24px' }}>{clockIn.toLocaleTimeString()}</td>
                    <td style={{ padding: '16px 24px' }}>{clockOut ? clockOut.toLocaleTimeString() : '--'}</td>
                    <td style={{ padding: '16px 24px', fontWeight: 'bold', color: log.clockOut ? 'var(--success)' : 'var(--primary)' }}>
                      {duration}
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
