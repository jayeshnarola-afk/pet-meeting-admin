import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BAN_USER_API_URL, DELETE_USER_API_URL, USERS_API_URL } from '../api/endpoints';
import { apiRequest } from '../api/http';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'banned', label: 'Banned' },
];

const PET_PREVIEW_LIMIT = 3;

function normalizeUsers(rawUsers = []) {
  return rawUsers.map((user) => {
    const status = user.isBan ? 'banned' : 'active';
    const location = user.location ?? 'Not specified';
    const pets =
      Array.isArray(user.pets) && user.pets.length
        ? user.pets.map((pet) => ({
            id: pet.id ?? crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 9),
            name: pet.name ?? 'Unnamed pet',
            type: pet.type?.name ?? pet.typeName ?? '-',
            breed: pet.breed?.name ?? pet.breedName ?? '-',
            age: pet.age ?? '-',
            gender: pet.gender ?? '-',
            size: pet.size ?? '-',
            color: pet.color ?? '-',
            status: pet.isBan ? 'banned' : pet.isEnabled ? 'enabled' : 'disabled',
          }))
        : [];

    return {
      id: user.id ?? crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 9),
      name: user.fullName ?? user.name ?? 'Unnamed user',
      email: user.email ?? '-',
      location,
      locationShort: location.length > 32 ? `${location.slice(0, 32)}...` : location,
      pets,
      petCount: pets.length,
      isBan: Boolean(user.isBan),
      status,
    };
  });
}

export default function UsersPage() {
  const location = useLocation();
  const initialStatus = location.state?.statusFilter ?? 'all';
  const [users, setUsers] = useState([]);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [hasMore, setHasMore] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [banLoadingIds, setBanLoadingIds] = useState(new Set());
  const [deleteLoadingIds, setDeleteLoadingIds] = useState(new Set());
  const [detailUser, setDetailUser] = useState(null);

  useEffect(() => {
    if (location.state?.statusFilter && location.state.statusFilter !== statusFilter) {
      setStatusFilter(location.state.statusFilter);
      setPage(1);
    }
  }, [location.state?.statusFilter, statusFilter]);

  useEffect(() => {
    if (!detailUser) {
      return;
    }
    const updated = users.find((user) => user.id === detailUser.id);
    if (updated) {
      setDetailUser(updated);
    }
  }, [users, detailUser]);

  useEffect(() => {
    let ignore = false;

    async function fetchUsers() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        const payload = await apiRequest(`${USERS_API_URL}?${params.toString()}`);
        const rawUsers = Array.isArray(payload) ? payload : payload?.users ?? [];
        const count = payload?.total ?? payload?.totalUsers ?? rawUsers.length;
        if (!ignore) {
          setUsers(normalizeUsers(rawUsers));
          setHasMore(rawUsers.length === Number(limit));
          setTotalRecords(count);
        }
      } catch (err) {
        console.error(err);
        if (!ignore) {
          setError('Unable to reach user API.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchUsers();

    return () => {
      ignore = true;
    };
  }, [page, limit]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (statusFilter === 'all') {
        return true;
      }
      return statusFilter === 'banned' ? user.isBan : !user.isBan;
    });
  }, [users, statusFilter]);

  const setBanLoadingState = (userId, isLoading) => {
    setBanLoadingIds((prev) => {
      const next = new Set(prev);
      if (isLoading) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });
  };

  const setDeleteLoadingState = (userId, isLoading) => {
    setDeleteLoadingIds((prev) => {
      const next = new Set(prev);
      if (isLoading) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });
  };

  const handleDelete = async (userId) => {
    try {
      setDeleteLoadingState(userId, true);
      await apiRequest(`${DELETE_USER_API_URL}/${userId}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((user) => user.id !== userId));
      setTotalRecords((prev) => Math.max(0, prev - 1));
      if (detailUser?.id === userId) {
        setDetailUser(null);
      }
    } catch (err) {
      console.error(err);
      alert('Delete failed. Update the API URL or try again.');
    } finally {
      setDeleteLoadingState(userId, false);
    }
  };

  const handleBanToggle = async (user) => {
    const nextIsBan = !user.isBan;
    try {
      setBanLoadingState(user.id, true);
      await apiRequest(BAN_USER_API_URL, {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          isBan: nextIsBan,
        }),
      });
      setUsers((prev) =>
        prev.map((entry) =>
          entry.id === user.id ? { ...entry, isBan: nextIsBan, status: nextIsBan ? 'banned' : 'active' } : entry,
        ),
      );
    } catch (err) {
      console.error(err);
      alert('Ban toggle failed. Verify the API URL or try again.');
    } finally {
      setBanLoadingState(user.id, false);
    }
  };

  return (
    <section>
      <header className="section-header">
        <div>
          <p className="muted">One place to manage everyone</p>
          <h2>Users</h2>
        </div>
        <div className="filters">
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </header>
      {error ? <div className="notice warning">{error}</div> : null}

      {loading ? (
        <p className="muted">Loading users...</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Location</th>
                <th>Pets</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const isBanLoading = banLoadingIds.has(user.id);
                const isDeleteLoading = deleteLoadingIds.has(user.id);
                const petPreview = user.pets.slice(0, PET_PREVIEW_LIMIT);
                const remainingPets = user.pets.length - petPreview.length;

                return (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td title={user.location}>{user.locationShort}</td>
                    <td>
                      <div className="pill-row">
                        {petPreview.length ? (
                          petPreview.map((pet) => (
                            <span key={pet.id} className="pill">
                              {pet.name} ({pet.type})
                            </span>
                          ))
                        ) : (
                          <span className="muted">No pets</span>
                        )}
                        {remainingPets > 0 ? <span className="pill">+{remainingPets} more</span> : null}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${user.status === 'banned' ? 'danger' : 'success'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="actions">
                      <button
                        type="button"
                        className="ghost"
                        disabled={isBanLoading}
                        onClick={() => handleBanToggle(user)}
                      >
                        {isBanLoading ? 'Updating...' : user.isBan ? 'Remove ban' : 'Ban'}
                      </button>
                      <button
                        type="button"
                        className="danger ghost"
                        disabled={isDeleteLoading}
                        onClick={() => handleDelete(user.id)}
                      >
                        {isDeleteLoading ? 'Deleting...' : 'Delete'}
                      </button>
                      <button type="button" className="ghost" onClick={() => setDetailUser(user)}>
                        View details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filteredUsers.length ? <p className="muted">No users to show.</p> : null}

          <div className="pagination">
            <div className="page-info">
              Page <strong>{page}</strong> | Total records <strong>{totalRecords}</strong>
            </div>
            <div className="pagination-actions">
              <button type="button" disabled={page === 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </button>
              <button type="button" disabled={!hasMore || loading} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
              <select
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(1);
                }}
              >
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {detailUser ? (
        <div className="detail-overlay" onClick={() => setDetailUser(null)}>
          <div className="detail-card" onClick={(event) => event.stopPropagation()}>
            <header className="detail-header">
              <div>
                <p className="muted">User details</p>
                <h3>{detailUser.name}</h3>
                <p className="muted">{detailUser.email}</p>
                <p>{detailUser.location}</p>
              </div>
              <button type="button" className="ghost" onClick={() => setDetailUser(null)}>
                Close
              </button>
            </header>

            <section className="detail-section">
              <h4>Pets</h4>
              {detailUser.pets.length ? (
                <div className="pet-grid">
                  {detailUser.pets.map((pet) => (
                    <article key={pet.id} className="pet-card">
                      <header>
                        <strong>{pet.name}</strong>
                        <span className={`badge ${pet.status === 'banned' ? 'danger' : 'success'}`}>{pet.status}</span>
                      </header>
                      <ul>
                        <li>
                          <span>Type</span>
                          <strong>{pet.type}</strong>
                        </li>
                        <li>
                          <span>Breed</span>
                          <strong>{pet.breed}</strong>
                        </li>
                        <li>
                          <span>Gender / Age</span>
                          <strong>
                            {pet.gender} | {pet.age}
                          </strong>
                        </li>
                        <li>
                          <span>Size / Color</span>
                          <strong>
                            {pet.size} | {pet.color}
                          </strong>
                        </li>
                      </ul>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted">No pets added yet.</p>
              )}
            </section>
          </div>
        </div>
      ) : null}
    </section>
  );
}
