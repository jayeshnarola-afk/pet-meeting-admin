import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BAN_PET_API_URL as BLOCK_PET_API_URL, BREEDS_API_URL, DELETE_PET_API_URL, PERSONALITIES_API_URL, PETS_API_URL, TYPES_API_URL } from '../api/endpoints';
import { apiRequest } from '../api/http';

const STATUS_OPTIONS = [
    { value: 'all', label: 'All statuses' },
    { value: 'enabled', label: 'Enabled' },
    { value: 'disabled', label: 'Disabled' },
    { value: 'blocked', label: 'Blocked' },
];

function normalizePets(rawPets = []) {
    return rawPets.map((pet) => {
        const typeName = pet.type?.name ?? pet.typeName ?? pet.type ?? '-';
        const breedName = pet.breed?.name ?? pet.breedName ?? '-';
        const ownerName = pet.owner?.fullName ?? pet.ownerName ?? '-';
        const isBan = Boolean(pet.isBan);
        const isEnabled = Boolean(pet.isEnabled);
    const personalities =
      pet.personalityNames ??
      (Array.isArray(pet.personalities) ? pet.personalities.map((item) => item.name).filter(Boolean) : []);

        return {
            id: pet.id ?? crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 9),
            name: pet.name ?? 'Untitled',
            type: typeName,
            breed: breedName,
            typeId: pet.typeId ?? pet.type?.id ?? pet.typeId,
            breedId: pet.breedId ?? pet.breed?.id ?? pet.breedId,
            owner: ownerName,
            age: pet.age,
            lookingFor: pet.lookingFor ?? '-',
            isEnabled,
            isBan,
            status: isBan ? 'blocked' : isEnabled ? 'enabled' : 'disabled',
      personalities,
        };
    });
}

function BooleanBadge({ value, trueLabel = '✓', falseLabel = '✕' }) {
  return (
    <span className={`bool-indicator ${value ? 'true' : 'false'}`}>{value ? trueLabel : falseLabel}</span>
  );
}

export default function PetsPage() {
    const location = useLocation();
    const [pets, setPets] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [breedFilter, setBreedFilter] = useState('all');
    const [personalityFilter, setPersonalityFilter] = useState('');
    const [ageFilter, setAgeFilter] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [hasMore, setHasMore] = useState(false);
    const [totalRecords, setTotalRecords] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [blockLoadingIds, setBlockLoadingIds] = useState(new Set());
    const [deleteLoadingIds, setDeleteLoadingIds] = useState(new Set());
    const [types, setTypes] = useState([]);
    const [breeds, setBreeds] = useState([]);
    const [typesLoading, setTypesLoading] = useState(false);
    const [breedsLoading, setBreedsLoading] = useState(false);
    const [typesError, setTypesError] = useState('');
    const [breedsError, setBreedsError] = useState('');
    const [personalities, setPersonalities] = useState([]);
    const [personalitiesLoading, setPersonalitiesLoading] = useState(false);
    const [personalitiesError, setPersonalitiesError] = useState('');

    const setBlockLoadingState = (petId, isLoading) => {
        setBlockLoadingIds((prev) => {
            const next = new Set(prev);
            if (isLoading) {
                next.add(petId);
            } else {
                next.delete(petId);
            }
            return next;
        });
    };

    useEffect(() => {
        if (location.state?.statusFilter && location.state.statusFilter !== statusFilter) {
            setStatusFilter(location.state.statusFilter);
            setPage(1);
        }
    }, [location.state?.statusFilter, statusFilter]);

    useEffect(() => {
        let ignore = false;

        async function fetchPets() {
            setLoading(true);
            setError('');
            try {
                const queryParams = new URLSearchParams({
                    page: String(page),
                    limit: String(limit),
                });
                
                // Add search parameter if search term exists
                if (search.trim()) {
                    queryParams.append('search', search.trim());
                }
                
                // Add age parameter if age filter exists
                if (ageFilter) {
                    queryParams.append('age', ageFilter);
                }
                
                const payload = await apiRequest(`${PETS_API_URL}?${queryParams.toString()}`);
                const rawPets = Array.isArray(payload) ? payload : payload?.pets ?? [];
                const count = payload?.total ?? payload?.totalRecords ?? rawPets.length;
                if (!ignore) {
                    setPets(normalizePets(rawPets));
                    setHasMore(rawPets.length === Number(limit));
                    setTotalRecords(count);
                }
            } catch (err) {
                console.error(err);
                if (!ignore) {
                    setError('Unable to reach pet API.');
                }
            } finally {
                if (!ignore) {
                       setLoading(false);
                }
            }
        }

        fetchPets();
        return () => {
            ignore = true;
        };
    }, [page, limit, search, ageFilter]);

    useEffect(() => {
        let ignore = false;

        async function fetchTypes() {
            setTypesLoading(true);
            setTypesError('');
            try {
                const payload = await apiRequest(TYPES_API_URL);
                // Handle different response formats
                const rawTypes = Array.isArray(payload) 
                    ? payload 
                    : payload?.petType ?? payload?.types ?? payload?.data ?? payload?.petTypes ?? [];
                if (!ignore) {
                    setTypes(rawTypes);
                }
            } catch (err) {
                console.error(err);
                if (!ignore) {
                    setTypesError('Unable to reach types API.');
                }
            } finally {
                if (!ignore) {
                    setTypesLoading(false);
                }
            }
        }

        fetchTypes();
        return () => {
            ignore = true;
        };
    }, []);

    useEffect(() => {
        let ignore = false;

        async function fetchBreeds() {
            if (typeFilter === 'all' || !typeFilter) {
                setBreeds([]);
                setBreedFilter('all');
                return;
            }
            setBreedsLoading(true);
            setBreedsError('');
            try {
                const queryParams = new URLSearchParams({
                    petTypeId: typeFilter,
                });
                const payload = await apiRequest(`${BREEDS_API_URL}?${queryParams.toString()}`);
                // Handle different response formats - API returns "Breeds" (capital B)
                const rawBreeds = Array.isArray(payload) 
                    ? payload 
                    : payload?.Breeds ?? payload?.breeds ?? payload?.data ?? [];
                if (!ignore) {
                    setBreeds(rawBreeds);
                }
            } catch (err) {
                console.error(err);
                if (!ignore) {
                    setBreedsError('Unable to reach breeds API.');
                }
            } finally {
                if (!ignore) {
                    setBreedsLoading(false);
                }
            }
        }

        fetchBreeds();
        return () => {
            ignore = true;
        };
    }, [typeFilter]);

    useEffect(() => {
        let ignore = false;

        async function fetchPersonalities() {
            setPersonalitiesLoading(true);
            setPersonalitiesError('');
            try {
                const payload = await apiRequest(PERSONALITIES_API_URL);
                // Handle different response formats - API returns "personalities"
                const rawPersonalities = Array.isArray(payload) 
                    ? payload 
                    : payload?.personalities ?? payload?.data ?? [];
                if (!ignore) {
                    setPersonalities(rawPersonalities);
                }
            } catch (err) {
                console.error(err);
                if (!ignore) {
                    setPersonalitiesError('Unable to reach personalities API.');
                }
            } finally {
                if (!ignore) {
                    setPersonalitiesLoading(false);
                }
            }
        }

        fetchPersonalities();
        return () => {
            ignore = true;
        };
    }, []);

    // Generate static age options from 1 to 30
    const ageOptions = useMemo(() => {
        return Array.from({ length: 30 }, (_, i) => i + 1);
    }, []);

    // Commented out types API call as per user request
    // const [types, setTypes] = useState([]);
    // const [typesLoading, setTypesLoading] = useState(false);
    // const [typesError, setTypesError] = useState('');

    const filteredPets = useMemo(() => {
        // Backend handles search and age, so we only filter by other criteria
        return pets
            .filter((pet) => (statusFilter === 'all' ? true : pet.status === statusFilter))
            .filter((pet) => (typeFilter === 'all' ? true : String(pet.typeId) === String(typeFilter)))
            .filter((pet) => (breedFilter === 'all' || !breedFilter || breedFilter === '' ? true : String(pet.breedId) === String(breedFilter)))
            .filter((pet) => (!personalityFilter || personalityFilter === '' ? true : pet.personalities?.includes(personalityFilter)))
            .filter((pet) => {
                if (!ageFilter || ageFilter === '') return true;
                const petAge = Number(pet.age);
                const filterAge = Number(ageFilter);
                return !isNaN(petAge) && petAge === filterAge;
            });
    }, [pets, statusFilter, typeFilter, breedFilter, personalityFilter, ageFilter]);

    const setDeleteLoadingState = (petId, isLoading) => {
        setDeleteLoadingIds((prev) => {
            const next = new Set(prev);
            if (isLoading) {
                next.add(petId);
            } else {
                next.delete(petId);
            }
            return next;
        });
    };

    const handleDelete = async (petId) => {
        try {
            setDeleteLoadingState(petId, true);
            await apiRequest(`${DELETE_PET_API_URL}/${petId}`, { method: 'DELETE' });
            setPets((prev) => prev.filter((pet) => pet.id !== petId));
            setTotalRecords((prev) => Math.max(0, prev - 1));
        } catch (err) {
            console.error(err);
            alert('Delete failed. Update the API URL or try again.');
        } finally {
            setDeleteLoadingState(petId, false);
        }
    };

    const handleBlockToggle = async (pet) => {
        const nextIsBan = !pet.isBan;
        try {
            setBlockLoadingState(pet.id, true);
            await apiRequest(BLOCK_PET_API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    isBan: nextIsBan,
                    petId: pet.id,
                }),
            });
            setPets((prev) =>
                prev.map((entry) =>
                    entry.id === pet.id
                        ? {
                              ...entry,
                              isBan: nextIsBan,
                              isEnabled: nextIsBan ? false : true,
                              status: nextIsBan ? 'blocked' : 'enabled',
                          }
                        : entry,
                ),
            );
        } catch (err) {
            console.error(err);
            alert('Block toggle failed. Verify the API URL or try again.');
        } finally {
            setBlockLoadingState(pet.id, false);
        }
    };

    return (
        <section>
            <header className="section-header">
                <div>
                    <p className="muted">Search and filter pets</p>
                    <h2>Pets</h2>
                </div>
                <div className="filters">
                    <input
                        type="search"
                        placeholder="Search by name"
                        value={search}
                        onChange={(event) => {
                            const value = event.target.value;
                            setSearch(value);
                            setPage(1);
                        }}
                        autoComplete="off"
                    />
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
                    <select
                        value={typeFilter}
                        onChange={(event) => {
                            setTypeFilter(event.target.value);
                            setBreedFilter('all');
                            setPage(1);
                        }}
                        disabled={typesLoading}
                    >
                        <option value="all">All types</option>
                        {typesLoading ? (
                            <option value="" disabled>Loading types...</option>
                        ) : (
                            types.map((type) => (
                                <option key={type.id} value={type.id}>
                                    {type.name}
                                </option>
                            ))
                        )}
                    </select>
                    <select
                        value={breedFilter}
                        onChange={(event) => {
                            setBreedFilter(event.target.value);
                            setPage(1);
                        }}
                        disabled={typeFilter === 'all' || breedsLoading}
                    >
                        {breedsLoading ? (
                            <option value="" disabled>Loading breeds...</option>
                        ) : (
                            <>
                                <option value="all">All breeds</option>
                                {breeds.map((breed) => (
                                    <option key={breed.id} value={breed.id}>
                                        {breed.name}
                                    </option>
                                ))}
                            </>
                        )}
                    </select>
                    <select
                        value={personalityFilter}
                        onChange={(event) => {
                            setPersonalityFilter(event.target.value);
                            setPage(1);
                        }}
                        disabled={personalitiesLoading}
                    >
                        {personalitiesLoading ? (
                            <option value="" disabled>Loading personalities...</option>
                        ) : (
                            <>
                                <option value="">All personalities</option>
                                {personalities.map((personality) => (
                                    <option key={personality.id} value={personality.name}>
                                        {personality.name}
                                    </option>
                                ))}
                            </>
                        )}
                    </select>
                    <select
                        value={ageFilter}
                        onChange={(event) => {
                            setAgeFilter(event.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">All ages</option>
                        {ageOptions.map((age) => (
                            <option key={age} value={age}>
                                {age} {age === 1 ? 'year' : 'years'}
                            </option>
                        ))}
                    </select>
                </div>
            </header>

            {error ? <div className="notice warning">{error}</div> : null}
            {typesError ? <div className="notice warning">{typesError}</div> : null}
            {breedsError ? <div className="notice warning">{breedsError}</div> : null}
            {personalitiesError ? <div className="notice warning">{personalitiesError}</div> : null}

            {loading ? (
                <p className="muted">Loading pets…</p>
            ) : (
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Breed</th>
                                <th>Owner</th>
                <th>Personality</th>
                                <th>Status</th>
                                <th>Enabled</th>
                                <th>Age</th>
                                <th>Looking For</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPets.length > 0 ? (
                                filteredPets.map((pet) => {
                                    const isBlockLoading = blockLoadingIds.has(pet.id);
                                    return (
                                        <tr key={pet.id}>
                                        <td>{pet.name}</td>
                                        <td>{pet.type}</td>
                                        <td>{pet.breed}</td>
                                        <td>{pet.owner}</td>
                      <td>
                        <div className="pill-row">
                          {pet.personalities?.length ? (
                            pet.personalities.map((trait) => (
                              <span key={trait} className="pill">
                                {trait}
                              </span>
                            ))
                          ) : (
                            <span className="muted">-</span>
                          )}
                        </div>
                      </td>
                                        <td>
                                            <span className={`badge ${pet.status === 'blocked' ? 'danger' : 'success'}`}>
                                                {pet.status}
                                            </span>
                                        </td>
                                        <td>
                    <BooleanBadge value={pet.isEnabled} />
                                    </td>
                  <td>{pet.age ?? '-'}</td>
                  <td>{pet.lookingFor ?? '-'}</td>
                                    <td className="actions">
                                            <button
                                                type="button"
                                                className="ghost"
                                                disabled={isBlockLoading}
                                                onClick={() => handleBlockToggle(pet)}
                                            >
                                                {isBlockLoading ? 'Updating…' : pet.isBan ? 'Unblock' : 'Block'}
                                            </button>
                                            <button
                                                type="button"
                                                className="danger ghost"
                                                disabled={deleteLoadingIds.has(pet.id)}
                                                onClick={() => handleDelete(pet.id)}
                                            >
                                                {deleteLoadingIds.has(pet.id) ? 'Deleting…' : 'Delete'}
                                            </button>
                                        </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="10" style={{ textAlign: 'center', padding: '2rem' }}>
                                        <p className="muted">No pets match your filters.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    <div className="pagination">
                        <div className="page-info">
                            Page <strong>{page}</strong> • Total records <strong>{totalRecords}</strong>
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
        </section>
    );
}

