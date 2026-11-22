import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { API_BASE } from '../api/client';

export default function DashboardPage({ onLogout }) {
  const [links, setLinks] = useState([]);
  const [url, setUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/links');
      setLinks(Array.isArray(data) ? data : data.links || []);
    } catch (err) {
      if (err.response?.status === 401) {
        onLogout();
        navigate('/login');
      } else {
        setError(err.response?.data?.error || 'Failed to load links');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { url: url.trim() };
      if (alias.trim()) payload.alias = alias.trim();
      if (expiresAt) payload.expiresAt = new Date(expiresAt).toISOString();

      await api.post('/api/links', payload);
      setUrl('');
      setAlias('');
      setExpiresAt('');
      await fetchLinks();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create link');
    }
  };

  const handleCopy = async (link) => {
    const code = link.short_code || link.shortCode || link.code;
    const shortUrl = link.shortUrl || `${API_BASE}/${code}`;
    await navigator.clipboard.writeText(shortUrl);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDelete = async (id) => {
    setError('');
    try {
      await api.delete(`/api/links/${id}`);
      setLinks((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete link');
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '32px auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>URL Shortener Dashboard</h2>
        <button
          type="button"
          onClick={() => {
            onLogout();
            navigate('/login');
          }}
        >
          Logout
        </button>
      </div>

      <form
        onSubmit={handleCreate}
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr auto',
          gap: 10,
          marginBottom: 24,
          padding: 16,
          border: '1px solid #ddd',
          borderRadius: 8,
        }}
      >
        <input
          type="url"
          placeholder="https://example.com/long-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          style={{ padding: 8 }}
        />
        <input
          type="text"
          placeholder="Custom alias (optional)"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          style={{ padding: 8 }}
        />
        <input
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          style={{ padding: 8 }}
        />
        <button type="submit" style={{ padding: '8px 16px' }}>
          Shorten
        </button>
      </form>

      {error && <div style={{ color: '#c62828', marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <p>Loading links...</p>
      ) : (
        <table width="100%" cellPadding="10" style={{ borderCollapse: 'collapse', border: '1px solid #ddd' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
              <th>Short Code</th>
              <th>Original URL</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {links.length === 0 ? (
              <tr>
                <td colSpan="4">No links created yet.</td>
              </tr>
            ) : (
              links.map((link) => {
                const code = link.short_code || link.shortCode || link.code;
                const exp = link.expires_at || link.expiresAt;
                return (
                  <tr key={link.id} style={{ borderTop: '1px solid #eee' }}>
                    <td>
                      <a href={`${API_BASE}/${code}`} target="_blank" rel="noreferrer">
                        {code}
                      </a>
                    </td>
                    <td style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {link.original_url || link.originalUrl}
                    </td>
                    <td>{exp ? new Date(exp).toLocaleString() : 'Never'}</td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => handleCopy(link)}>
                        {copiedId === link.id ? 'Copied!' : 'Copy'}
                      </button>
                      <Link to={`/links/${link.id}`}>
                        <button type="button">Analytics</button>
                      </Link>
                      <button type="button" onClick={() => handleDelete(link.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
