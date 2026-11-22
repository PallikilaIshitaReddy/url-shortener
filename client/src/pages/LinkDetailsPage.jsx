import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import api from '../api/client';

const PIE_COLORS = ['#2563eb', '#16a34a', '#ea580c', '#9333ea'];

export default function LinkDetailsPage() {
  const { id } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/api/links/${id}/analytics`);
        if (active) setAnalytics(data);
      } catch (err) {
        if (active) setError(err.response?.data?.error || 'Failed to load analytics');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <div style={{ padding: 32 }}>Loading analytics...</div>;
  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ color: '#c62828', marginBottom: 12 }}>{error}</div>
        <Link to="/">Back to Dashboard</Link>
      </div>
    );
  }

  const dailyData = (analytics?.clicksLast30Days || []).map((row) => ({
    day: new Date(row.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    count: Number(row.count),
  }));

  const deviceData = (analytics?.byDevice || []).map((row) => ({
    name: row.device || 'unknown',
    value: Number(row.count),
  }));

  return (
    <div style={{ maxWidth: 960, margin: '32px auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Link #{id} Analytics</h2>
        <Link to="/">← Back to Dashboard</Link>
      </div>

      <div style={{ marginBottom: 24, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
        <strong>Total Clicks:</strong> {analytics?.totalClicks ?? 0}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>Clicks Over Time (Last 30 Days)</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>Device Breakdown</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={deviceData} dataKey="value" nameKey="name" outerRadius={85} label>
                  {deviceData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>Top Referrers</h3>
          {(analytics?.topReferrers || []).length === 0 ? (
            <p>No referrer data yet.</p>
          ) : (
            <ul>
              {analytics.topReferrers.map((r, idx) => (
                <li key={idx}>
                  {r.referrer} — <strong>{r.count}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>Top Countries</h3>
          {(analytics?.topCountries || []).length === 0 ? (
            <p>No country data yet.</p>
          ) : (
            <ul>
              {analytics.topCountries.map((c, idx) => (
                <li key={idx}>
                  {c.country} — <strong>{c.count}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
