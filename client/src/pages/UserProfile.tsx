import { useEffect, useState } from 'react';
import { useLocale } from '../context/LocaleContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Dashboard from './Dashboard';
import api from '../services/api.js';

interface FullUserProfile {
  id: string;
  employeeId: string;
  email: string;
  name: string;
  phone: string | null;
  address: string | null;
  gender: string | null;
  maritalStatus: string | null;
  nationality: string | null;
  dateOfBirth: number | null;
  designation: string | null;
  salary: number;
  joinTimestamp: number | null;
  image: string | null;
  role: {
    name: string;
    level: number;
    permissions: string[];
  };
}

interface InfoItemProps {
  label: string;
  value: string | number | null | undefined;
  name?: string;
  type?: string;
  options?: { label: string; value: string }[];
  isEditing: boolean;
  formData: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const InfoItem: React.FC<InfoItemProps> = ({ 
  label, 
  value, 
  name, 
  type = "text", 
  options, 
  isEditing, 
  formData, 
  onChange 
}) => (
  <div style={{ marginBottom: '20px' }}>
    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
    {isEditing && name ? (
      type === "select" ? (
        <select
          name={name}
          value={formData[name]}
          onChange={onChange}
          className="glass-input"
          style={{ width: '100%', padding: '8px 12px' }}
        >
          <option value="">Select {label}</option>
          {options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          value={formData[name]}
          onChange={onChange}
          className="glass-input"
          style={{ width: '100%', padding: '8px 12px' }}
        />
      )
    ) : (
      <p style={{ margin: 0, fontWeight: '500', fontSize: '1rem' }}>{value || 'N/A'}</p>
    )}
  </div>
);

const UserProfile: React.FC = () => {
  const { formatCurrency, formatDate } = useLocale();
  const { showToast } = useToast();
  const { updateUser, user } = useAuth();
  const [profile, setProfile] = useState<FullUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    gender: '',
    maritalStatus: '',
    nationality: '',
    dateOfBirth: '',
    image: ''
  });

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/employees/me');
      setProfile(data);
      // Initialize form data
      setFormData({
        phone: data.phone || '',
        address: data.address || '',
        gender: data.gender || '',
        maritalStatus: data.maritalStatus || '',
        nationality: data.nationality || '',
        dateOfBirth: data.dateOfBirth ? new Date(Number(data.dateOfBirth)).toISOString().split('T')[0] : '',
        image: data.image || ''
      });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).getTime() : null
      };
      const { data } = await api.put('/employees/me', payload);
      setProfile(data);
      setIsEditing(false);
      showToast('Profile updated successfully', 'success');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to update profile';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file size must be less than 5MB', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setUploading(true);
    try {
      const { data } = await api.post('/employees/upload-avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setProfile(prev => prev ? { ...prev, image: data.image } : null);
      
      // Update global auth user if this is the logged in user
      if (user && user.id === data.employee.id) {
        updateUser({
          ...user,
          image: data.image
        });
      }

      showToast('Profile picture updated', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <Dashboard>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="loader">Loading Profile...</div>
      </div>
    </Dashboard>
  );

  if (error) return (
    <Dashboard>
      <div className="glass-card" style={{ padding: '24px', border: '1px solid var(--error)' }}>
        <p style={{ color: 'var(--error)' }}>Error: {error}</p>
      </div>
    </Dashboard>
  );

  if (!profile) return null;

  return (
    <Dashboard>
      <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1>My Profile</h1>
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="glass-button"
              style={{ padding: '10px 24px', borderRadius: '12px' }}
            >
              Edit Profile
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setIsEditing(false)}
                className="glass-button"
                style={{ padding: '10px 24px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)' }}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="glass-button primary"
                style={{ padding: '10px 24px', borderRadius: '12px', background: 'var(--primary)', color: 'white' }}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '24px', alignItems: 'start' }} className="profile-grid">
          {/* Left Column: Avatar & Quick Info */}
          <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '24px' }}>
              <div style={{ 
                width: '180px', 
                height: '180px', 
                borderRadius: '50%', 
                background: profile.image ? 'transparent' : 'var(--primary)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '4rem', 
                fontWeight: 'bold',
                overflow: 'hidden',
                border: '4px solid var(--glass-border)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                margin: '0 auto'
              }}>
                {profile.image ? (
                  <img src={profile.image.startsWith('/') ? `${import.meta.env.VITE_API_ORIGIN || 'http://localhost:5000'}${profile.image}` : profile.image} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  profile.name.charAt(0)
                )}
              </div>
              
              {/* Overlay Upload Button */}
              <label 
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  border: '2px solid var(--glass-border)',
                  transition: 'transform 0.2s',
                  zIndex: 10
                }}
                className="upload-btn-hover"
              >
                <input type="file" hidden accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                {uploading ? (
                  <div className="mini-loader"></div>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                )}
              </label>
            </div>
            
            {isEditing ? (
               <div style={{ marginBottom: '24px' }}>
                 <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>PROFILE PICTURE URL</p>
                 <input
                   type="text"
                   name="image"
                   value={formData.image}
                   onChange={handleChange}
                   className="glass-input"
                   placeholder="https://example.com/photo.jpg"
                   style={{ width: '100%', padding: '8px 12px' }}
                 />
               </div>
            ) : null}

            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.75rem' }}>{profile.name}</h2>
            <p style={{ color: 'var(--primary)', fontWeight: '600', marginBottom: '24px' }}>{profile.designation || profile.role.name}</p>
            
            <div style={{ 
              display: 'inline-block',
              padding: '6px 16px', 
              borderRadius: '20px', 
              fontSize: '0.85rem', 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid var(--glass-border)',
              color: 'var(--text-muted)'
            }}>
              Level {profile.role.level} Access
            </div>
          </div>

          {/* Right Column: Detailed Info Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Job Information (View Only) */}
            <div className="glass-card" style={{ padding: '32px' }}>
              <h3 style={{ marginBottom: '24px', color: 'var(--primary)', fontSize: '1.25rem' }}>Job Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                <InfoItem label="Employee ID" value={profile.employeeId} isEditing={isEditing} formData={formData} onChange={handleChange} />
                <InfoItem label="Designation" value={profile.designation} isEditing={isEditing} formData={formData} onChange={handleChange} />
                <InfoItem label="Role" value={profile.role.name} isEditing={isEditing} formData={formData} onChange={handleChange} />
                <InfoItem label="Joined On" value={profile.joinTimestamp ? formatDate(profile.joinTimestamp) : null} isEditing={isEditing} formData={formData} onChange={handleChange} />
                <InfoItem label="Salary" value={formatCurrency(profile.salary)} isEditing={isEditing} formData={formData} onChange={handleChange} />
              </div>
            </div>

            {/* Personal Details */}
            <div className="glass-card" style={{ padding: '32px' }}>
              <h3 style={{ marginBottom: '24px', color: 'var(--primary)', fontSize: '1.25rem' }}>Personal Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                <InfoItem 
                  label="Date of Birth" 
                  value={profile.dateOfBirth ? formatDate(profile.dateOfBirth) : null} 
                  name="dateOfBirth"
                  type="date"
                  isEditing={isEditing}
                  formData={formData}
                  onChange={handleChange}
                />
                <InfoItem 
                  label="Gender" 
                  value={profile.gender} 
                  name="gender" 
                  type="select"
                  options={[
                    { label: 'Male', value: 'Male' },
                    { label: 'Female', value: 'Female' },
                    { label: 'Other', value: 'Other' }
                  ]}
                  isEditing={isEditing}
                  formData={formData}
                  onChange={handleChange}
                />
                <InfoItem 
                  label="Nationality" 
                  value={profile.nationality} 
                  name="nationality" 
                  isEditing={isEditing}
                  formData={formData}
                  onChange={handleChange}
                />
                <InfoItem 
                  label="Marital Status" 
                  value={profile.maritalStatus} 
                  name="maritalStatus" 
                  type="select"
                  options={[
                    { label: 'Single', value: 'Single' },
                    { label: 'Married', value: 'Married' },
                    { label: 'Divorced', value: 'Divorced' },
                    { label: 'Widowed', value: 'Widowed' }
                  ]}
                  isEditing={isEditing}
                  formData={formData}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="glass-card" style={{ padding: '32px' }}>
              <h3 style={{ marginBottom: '24px', color: 'var(--primary)', fontSize: '1.25rem' }}>Contact Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                <InfoItem label="Email Address" value={profile.email} isEditing={isEditing} formData={formData} onChange={handleChange} />
                <InfoItem label="Phone Number" value={profile.phone} name="phone" isEditing={isEditing} formData={formData} onChange={handleChange} />
                <InfoItem label="Home Address" value={profile.address} name="address" isEditing={isEditing} formData={formData} onChange={handleChange} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dashboard>
  );
};

export default UserProfile;
