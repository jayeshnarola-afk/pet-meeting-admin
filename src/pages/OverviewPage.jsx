import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DASHBOARD_COUNT_API_URL } from '../api/endpoints';
import { apiRequest } from '../api/http';

export default function OverviewPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [newUserData, setNewUserData] = useState(null);
  const [activeUserData, setActiveUserData] = useState(null);
  const [chartFilter, setChartFilter] = useState('week'); // 'today', 'week', 'month', '3months', '6months', 'year'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function fetchOverview() {
      setLoading(true);
      setError('');
      try {
        const payload = await apiRequest(DASHBOARD_COUNT_API_URL);
        
        const totalUsers = Number(payload?.totalUser ?? 0);
        const bannedUsers = Number(payload?.totalBanUsers ?? 0);
        const totalPets = Number(payload?.totalPets ?? 0);
        const bannedPets = Number(payload?.totalBanPets ?? 0);

        const activeUsers = Math.max(totalUsers - bannedUsers, 0);
        const activePets = Math.max(totalPets - bannedPets, 0);

        // Extract new user and active user data
        const newUser = payload?.newUser;
        const activeUser = payload?.activeUser;

        if (!ignore) {
          setStats([
            {
              label: 'Total users',
              value: totalUsers,
              note: `${activeUsers} active`,
              route: '/dashboard/users',
              state: { statusFilter: 'all' },
            },
            {
              label: 'Banned users',
              value: bannedUsers,
              note: 'Need review',
              route: '/dashboard/users',
              state: { statusFilter: 'banned' },
            },
            {
              label: 'Total pets',
              value: totalPets,
              note: `${activePets} enabled`,
              route: '/dashboard/pets',
              state: { statusFilter: 'all' },
            },
            {
              label: 'Banned pets',
              value: bannedPets,
              note: 'Take action',
              route: '/dashboard/pets',
              state: { statusFilter: 'banned' },
            },
          ]);

          // Set chart data for different time periods
          if (newUser) {
            const processData = (dataArray) => {
              if (!Array.isArray(dataArray)) return [];
              return dataArray.map((item) => ({
                date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                count: item.count ?? 0,
              }));
            };

            // Convert single number to chart data format
            const numberToChartData = (value) => {
              const num = Number(value) || 0;
              return [{ date: 'Total', count: num }];
            };

            setNewUserData({
              today: newUser.todayUsers ?? 0,
              weekly: processData(newUser.lastWeekUser || []),
              monthly: numberToChartData(newUser.lastMonthUsers),
              threeMonths: numberToChartData(newUser.last3MonthUsers),
              sixMonths: numberToChartData(newUser.last6MonthUsers),
              yearly: numberToChartData(newUser.last1YearUsers),
            });
          }

          if (activeUser) {
            const processData = (dataArray) => {
              if (!Array.isArray(dataArray)) return [];
              return dataArray.map((item) => ({
                date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                count: item.count ?? 0,
              }));
            };

            // Convert single number to chart data format
            const numberToChartData = (value) => {
              const num = Number(value) || 0;
              return [{ date: 'Total', count: num }];
            };

            setActiveUserData({
              today: activeUser.todayActive ?? 0,
              weekly: processData(activeUser.weeklyActive || []),
              monthly: numberToChartData(activeUser.lastMonthActive),
              threeMonths: numberToChartData(activeUser.last3MonthActive),
              sixMonths: numberToChartData(activeUser.last6MonthActive),
              yearly: numberToChartData(activeUser.last1YearActive),
            });
          }
        }
      } catch (err) {
        console.error(err);
        if (!ignore) {
          setError('Unable to reach dashboard API.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchOverview();
    return () => {
      ignore = true;
    };
  }, []);

  const handleNavigate = (stat) => {
    if (stat.route) {
      navigate(stat.route, { state: stat.state });
    }
  };

  return (
    <section>
      <header className="section-header">
        <div>
          <p className="muted">Quick snapshot</p>
          <h2>Dashboard</h2>
        </div>
      </header>

      {error ? <div className="notice warning">{error}</div> : null}

      {loading ? (
        <p className="muted">Loading overview...</p>
      ) : (
        <>
          <div className="stats-grid">
            {stats.map((stat) => (
              <article
                key={stat.label}
                className={`stat-card ${stat.route ? 'clickable' : ''}`}
                role={stat.route ? 'button' : undefined}
                tabIndex={stat.route ? 0 : undefined}
                onClick={() => handleNavigate(stat)}
                onKeyDown={(event) => {
                  if ((event.key === 'Enter' || event.key === ' ') && stat.route) {
                    event.preventDefault();
                    handleNavigate(stat);
                  }
                }}
              >
                <p className="muted">{stat.label}</p>
                <h3>{stat.value}</h3>
                <span>{stat.note}</span>
              </article>
            ))}
          </div>

          <div style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>User Analytics</h3>
              <select
                value={chartFilter}
                onChange={(e) => setChartFilter(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #cbd5f5',
                  borderRadius: '0.5rem',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last Month</option>
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="year">Last Year</option>
              </select>
            </div>

            <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
              {newUserData && (
                <div className="chart-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>New Users</h3>
                  <p className="muted" style={{ margin: '0 0 1rem' }}>
                    {chartFilter === 'today'
                      ? `Today: ${newUserData.today} users`
                      : chartFilter === 'week'
                        ? 'Last 7 Days'
                        : chartFilter === 'month'
                          ? `Last Month: ${newUserData.monthly[0]?.count || 0} users`
                          : chartFilter === '3months'
                            ? `Last 3 Months: ${newUserData.threeMonths[0]?.count || 0} users`
                            : chartFilter === '6months'
                              ? `Last 6 Months: ${newUserData.sixMonths[0]?.count || 0} users`
                              : `Last Year: ${newUserData.yearly[0]?.count || 0} users`}
                  </p>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={
                        chartFilter === 'today'
                          ? [{ date: 'Today', count: newUserData.today }]
                          : chartFilter === 'week'
                            ? newUserData.weekly
                            : chartFilter === 'month'
                              ? newUserData.monthly
                              : chartFilter === '3months'
                                ? newUserData.threeMonths
                                : chartFilter === '6months'
                                  ? newUserData.sixMonths
                                  : newUserData.yearly
                      }
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        angle={chartFilter === 'week' ? -45 : 0}
                        textAnchor={chartFilter === 'week' ? 'end' : 'middle'}
                        height={chartFilter === 'week' ? 80 : 40}
                        interval={0}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} name="New Users" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {activeUserData && (
                <div className="chart-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Active Users</h3>
                  <p className="muted" style={{ margin: '0 0 1rem' }}>
                    {chartFilter === 'today'
                      ? `Today: ${activeUserData.today} users`
                      : chartFilter === 'week'
                        ? 'Last 7 Days'
                        : chartFilter === 'month'
                          ? `Last Month: ${activeUserData.monthly[0]?.count || 0} users`
                          : chartFilter === '3months'
                            ? `Last 3 Months: ${activeUserData.threeMonths[0]?.count || 0} users`
                            : chartFilter === '6months'
                              ? `Last 6 Months: ${activeUserData.sixMonths[0]?.count || 0} users`
                              : `Last Year: ${activeUserData.yearly[0]?.count || 0} users`}
                  </p>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={
                        chartFilter === 'today'
                          ? [{ date: 'Today', count: activeUserData.today }]
                          : chartFilter === 'week'
                            ? activeUserData.weekly
                            : chartFilter === 'month'
                              ? activeUserData.monthly
                              : chartFilter === '3months'
                                ? activeUserData.threeMonths
                                : chartFilter === '6months'
                                  ? activeUserData.sixMonths
                                  : activeUserData.yearly
                      }
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        angle={chartFilter === 'week' ? -45 : 0}
                        textAnchor={chartFilter === 'week' ? 'end' : 'middle'}
                        height={chartFilter === 'week' ? 80 : 40}
                        interval={0}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={2} name="Active Users" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

