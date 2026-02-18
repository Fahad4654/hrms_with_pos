import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext';

interface LeaveType {
  id: string;
  name: string;
  daysAllowed: number;
  active: boolean;
}

interface CompanySettings {
  companyName: string;
  workDays: string[];
  workStartTime: string;
  workEndTime: string;
  enableOvertime: boolean;
}

const SystemConfig: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'schedule' | 'leaves'>('schedule');
  const [loading, setLoading] = useState(true);

  // Settings State
  const [settings, setSettings] = useState<CompanySettings>({
    companyName: '',
    workDays: [],
    workStartTime: '09:00',
    workEndTime: '17:00',
    enableOvertime: false
  });
  
  // Leaves State
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<Partial<LeaveType> | null>(null);
  const [utilizationData, setUtilizationData] = useState<{ employeeName: string, daysTaken: number }[] | null>(null);
  const [selectedLeaveType, setSelectedLeaveType] = useState<string | null>(null);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [loadingUtilization, setLoadingUtilization] = useState(false);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, leavesRes] = await Promise.all([
        api.get('/settings/company'),
        api.get('/settings/leave-types')
      ]);
      setSettings(settingsRes.data);
      setLeaveTypes(leavesRes.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      showToast('Error loading configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (settings.workStartTime >= settings.workEndTime) {
      showToast('Work Start Time cannot be later than or equal to Work End Time', 'error');
      return;
    }

    try {
      await api.put('/settings/company', settings);
      showToast('Settings saved successfully', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Error saving settings', 'error');
    }
  };

  const handleSaveLeaveType = async () => {
    if (!editingLeave?.name || !editingLeave?.daysAllowed) return;
    try {
      if (editingLeave.id) {
        await api.put(`/settings/leave-types/${editingLeave.id}`, editingLeave);
        showToast('Leave type updated successfully', 'success');
      } else {
        await api.post('/settings/leave-types', editingLeave);
        showToast('Leave type created successfully', 'success');
      }
      setIsLeaveModalOpen(false);
      fetchData();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Error saving leave type', 'error');
    }
  };
  
  const handleDeleteLeaveType = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this leave type?')) return;
    try {
       await api.delete(`/settings/leave-types/${id}`);
       showToast('Leave type deleted successfully', 'success');
       fetchData();
    } catch (error: any) {
       showToast(error.response?.data?.message || 'Error deleting leave type', 'error');
    }
  };

  const fetchUtilization = async (leaveTypeName: string) => {
    setLoadingUtilization(true);
    setSelectedLeaveType(leaveTypeName);
    setIsUsageModalOpen(true);
    try {
      const res = await api.get(`/settings/leave-types/${leaveTypeName}/utilization`);
      setUtilizationData(res.data);
    } catch (error: any) {
      console.error('Error fetching utilization:', error);
      showToast('Error loading utilization data', 'error');
      setIsUsageModalOpen(false);
    } finally {
      setLoadingUtilization(false);
    }
  };

  const toggleDay = (day: string) => {
    const currentDays = settings.workDays || [];
    if (currentDays.includes(day)) {
      setSettings({ ...settings, workDays: currentDays.filter(d => d !== day) });
    } else {
      setSettings({ ...settings, workDays: [...currentDays, day] });
    }
  };

  if (loading) return <div className="animate-fade-in">Loading Configuration...</div>;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '4%' }}>
        <h1>System Configuration</h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage company schedule and leave policies</p>
      </div>

      <div style={{ display: 'flex', gap: '2%', marginBottom: '4%' }}>
        <button 
          className={`btn ${activeTab === 'schedule' ? 'btn-primary' : ''}`}
          style={{ background: activeTab === 'schedule' ? '' : 'rgba(255,255,255,0.05)' }}
          onClick={() => setActiveTab('schedule')}
        >
          📅 Office Schedule
        </button>
        <button 
          className={`btn ${activeTab === 'leaves' ? 'btn-primary' : ''}`}
          style={{ background: activeTab === 'leaves' ? '' : 'rgba(255,255,255,0.05)' }}
          onClick={() => setActiveTab('leaves')}
        >
          🌴 Leave Types
        </button>
      </div>

      {activeTab === 'schedule' && (
        <div className="glass-card animate-fade-in" style={{ padding: '4%' }}>
          <h2 style={{ marginBottom: '4%' }}>Working Days & Hours</h2>
          
          <div style={{ marginBottom: '6%' }}>
            <label style={{ display: 'block', marginBottom: '2%', color: 'var(--text-muted)' }}>Working Days</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {daysOfWeek.map(day => (
                <div 
                  key={day}
                  onClick={() => toggleDay(day)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: settings.workDays.includes(day) ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                    color: settings.workDays.includes(day) ? 'white' : 'var(--text-muted)',
                    border: '1px solid var(--glass-border)',
                    transition: 'all 0.2s'
                  }}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4%', marginBottom: '6%' }}>
            <div className="input-group">
              <label>Work Start Time</label>
              <input 
                type="time" 
                value={settings.workStartTime}
                onChange={e => setSettings({...settings, workStartTime: e.target.value})}
              />
            </div>
            <div className="input-group">
              <label>Work End Time</label>
              <input 
                type="time" 
                value={settings.workEndTime}
                onChange={e => setSettings({...settings, workEndTime: e.target.value})}
              />
            </div>
          </div>
          
          <div style={{ marginBottom: '6%', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label className="switch" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '12px' }}>
              <div style={{ position: 'relative', width: '48px', height: '24px' }}>
                  <input 
                    type="checkbox" 
                    checked={settings.enableOvertime}
                    onChange={e => setSettings({...settings, enableOvertime: e.target.checked})}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{ 
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                      backgroundColor: settings.enableOvertime ? 'var(--primary)' : 'rgba(255,255,255,0.1)', 
                      transition: '.4s', borderRadius: '34px' 
                  }}></span>
                  <span style={{ 
                      position: 'absolute', content: '""', height: '16px', width: '16px', left: '4px', bottom: '4px', 
                      backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                      transform: settings.enableOvertime ? 'translateX(24px)' : 'translateX(0)'
                  }}></span>
              </div>
              <span>Enable Overtime Logic (Auto-Clockout at 11:59 PM)</span>
            </label>
          </div>

          <button className="btn btn-primary" onClick={handleSaveSettings} style={{ width: '200px' }}>
            Save Schedule
          </button>
        </div>
      )}

      {activeTab === 'leaves' && (
        <div className="glass-card animate-fade-in" style={{ padding: '4%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4%' }}>
            <h2>Defined Leave Types</h2>
            <button className="btn btn-primary" onClick={() => { setEditingLeave({ active: true }); setIsLeaveModalOpen(true); }}>
              + Add Leave Type
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '2%' }}>Type Name</th>
                <th style={{ padding: '2%' }}>Days Allowed / Year</th>
                <th style={{ padding: '2%' }}>Status</th>
                <th style={{ padding: '2%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaveTypes.map(type => (
                <tr key={type.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '2%', fontWeight: 'bold' }}>{type.name}</td>
                  <td style={{ padding: '2%' }}>{type.daysAllowed} days</td>
                  <td style={{ padding: '2%' }}>
                    <span className="badge" style={{ 
                      background: type.active ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: type.active ? 'var(--success)' : 'var(--error)'
                    }}>
                      {type.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '2%' }}>
                     <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button className="btn" style={{ padding: '6px 12px', fontSize: '0.875rem', border: '1px solid var(--glass-border)', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }} onClick={() => fetchUtilization(type.name)}>Usage</button>
                        <button className="btn" style={{ padding: '6px 12px', fontSize: '0.875rem', border: '1px solid var(--glass-border)' }} onClick={() => { setEditingLeave(type); setIsLeaveModalOpen(true); }}>Edit</button>
                        <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.875rem' }} onClick={() => handleDeleteLeaveType(type.id)}>Delete</button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Leave Modal */}
      {isLeaveModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content animate-fade-in" style={{ width: '90%', maxWidth: '450px', padding: '30px' }}>
            <h2 style={{ marginBottom: '20px' }}>{editingLeave?.id ? 'Edit Leave Type' : 'New Leave Type'}</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveLeaveType(); }}>
              <div className="input-group">
                <label>Type Name</label>
                <input 
                  required
                  value={editingLeave?.name || ''} 
                  onChange={e => setEditingLeave({ ...editingLeave!, name: e.target.value })}
                  placeholder="e.g. Sick Leave"
                />
              </div>
              <div className="input-group">
                <label>Days Allowed Per Year</label>
                <input 
                  type="number"
                  required
                  min="0"
                  value={editingLeave?.daysAllowed || ''} 
                  onChange={e => setEditingLeave({ ...editingLeave!, daysAllowed: parseInt(e.target.value) })}
                  placeholder="e.g. 10"
                />
              </div>
              <div className="input-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={editingLeave?.active ?? true}
                    onChange={e => setEditingLeave({ ...editingLeave!, active: e.target.checked })}
                  />
                  Active
                </label>
              </div>
              <div style={{ display: 'flex', gap: '2%', marginTop: '5%' }}>
                <button type="button" className="btn" onClick={() => setIsLeaveModalOpen(false)} style={{ flex: 1, border: '1px solid var(--glass-border)' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Utilization Modal */}
      {isUsageModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content animate-fade-in" style={{ width: '90%', maxWidth: '550px', padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>{selectedLeaveType} Utilization</h2>
              <button className="btn" onClick={() => setIsUsageModalOpen(false)} style={{ padding: '4px 8px' }}>✕</button>
            </div>

            {loadingUtilization ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>Loading utilization data...</div>
            ) : utilizationData && utilizationData.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '3%' }}>Employee</th>
                    <th style={{ padding: '3%', textAlign: 'right' }}>Days Taken</th>
                  </tr>
                </thead>
                <tbody>
                  {utilizationData.map((row, i) => (
                    <tr key={i} style={{ borderBottom: i === utilizationData.length - 1 ? 'none' : '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '3%' }}>{row.employeeName}</td>
                      <td style={{ padding: '3%', textAlign: 'right', fontWeight: 'bold' }}>{row.daysTaken} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                No approved leave requests found for this type.
              </div>
            )}
            
            <div style={{ marginTop: '6%', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setIsUsageModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemConfig;
