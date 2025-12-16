import { useEffect, useState } from 'react';
import { API_BASE_URL, BAN_PET_API_URL as BLOCK_PET_API_URL, BLOCK_IMAGE_API_URL, BLOCK_USER_IMAGE_API_URL, DELETE_PET_API_URL, USERS_API_URL } from '../api/endpoints';
import { apiRequest } from '../api/http';

const ensureAbsoluteUrl = (url) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  // Avoid double slashes when concatenating
  return `${API_BASE_URL.replace(/\/+$/, '')}/${String(url).replace(/^\/+/, '')}`;
};

const toApiPhotoUrl = (url) => {
  if (!url) return url;
  const base = API_BASE_URL.replace(/\/+$/, '');
  if (url.startsWith(base)) {
    const rest = url.slice(base.length);
    return rest.startsWith('/') ? rest : `/${rest}`;
  }
  return url;
};

const makeImageKey = (petId, url) => `${petId || 'unknown'}::${url}`;

function normalizeUsers(rawUsers = []) {
  return rawUsers.map((user) => {
    const pets =
      Array.isArray(user.pets) && user.pets.length
        ? user.pets.map((pet) => {
            // Collect images from photos (mark blocked), images array, and single image
            const photoImages = Array.isArray(pet.photos)
              ? pet.photos
                  .map((photo) => {
                    const blocked = typeof photo === 'object' && photo !== null
                      ? photo?.isBlock === true ||
                        photo?.isBlock === 'true' ||
                        photo?.isBlocked === true ||
                        photo?.isBlocked === 'true'
                      : false;
                    const url = ensureAbsoluteUrl(
                      typeof photo === 'string'
                        ? photo
                        : photo?.url ?? photo?.image ?? photo,
                    );
                    return url ? { url, blocked } : null;
                  })
                  .filter(Boolean)
              : [];

            // Handle images array (could be strings or objects)
            const otherImages = Array.isArray(pet.images)
              ? pet.images
                  .map((img) => {
                    const url = ensureAbsoluteUrl(
                      typeof img === 'string' ? img : img?.url ?? img?.image ?? null,
                    );
                    const blocked =
                      typeof img === 'object' && img !== null
                        ? img?.isBlock === true ||
                          img?.isBlock === 'true' ||
                          img?.isBlocked === true ||
                          img?.isBlocked === 'true'
                        : false;
                    return url ? { url, blocked } : null;
                  })
                  .filter(Boolean)
              : [];

            // Handle single image
            const singleImage = pet.image
              ? [
                  {
                    url: ensureAbsoluteUrl(
                      typeof pet.image === 'string'
                        ? pet.image
                        : pet.image?.url ?? pet.image?.image ?? pet.image,
                    ),
                    blocked:
                      typeof pet.image === 'object' && pet.image !== null
                        ? pet.image?.isBlock === true ||
                          pet.image?.isBlock === 'true' ||
                          pet.image?.isBlocked === true ||
                          pet.image?.isBlocked === 'true'
                        : false,
                  },
                ].filter((entry) => entry.url)
              : [];

            const allImages = [...photoImages, ...otherImages, ...singleImage];
            const limitedImages = allImages.slice(0, 5);

            return {
              id: pet.id ?? crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 9),
              name: pet.name ?? 'Unnamed pet',
              images: limitedImages,
              isBlock: pet.isBan === true || pet.isBan === 'true',
            };
          })
        : [];

    // Handle profile photo - check isBlock and isBlocked
    let profilePhoto = null;
    let profilePhotoBlocked = false;
    if (user.profilePhoto) {
      if (typeof user.profilePhoto === 'object' && user.profilePhoto !== null) {
        profilePhotoBlocked = 
          user.profilePhoto.isBlock === true || 
          user.profilePhoto.isBlock === 'true' ||
          user.profilePhoto.isBlocked === true ||
          user.profilePhoto.isBlocked === 'true';
        const photoUrl = user.profilePhoto.url ?? user.profilePhoto.image ?? null;
        profilePhoto = photoUrl ? ensureAbsoluteUrl(photoUrl) : null;
      } else if (typeof user.profilePhoto === 'string') {
        profilePhoto = ensureAbsoluteUrl(user.profilePhoto);
      }
    }
    
    // Fallback to other image fields
    if (!profilePhoto) {
      const fallbackUrl = user.profileImage ?? user.image ?? null;
      profilePhoto = fallbackUrl ? ensureAbsoluteUrl(fallbackUrl) : null;
    }

    return {
      id: user.id ?? crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 9),
      name: user.fullName ?? user.name ?? 'Unnamed user',
      email: user.email ?? '-',
      profilePhoto,
      profilePhotoBlocked,
      pets,
      totalPets: pets.length,
    };
  });
}

export default function UserProfilesPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [blockLoadingUrls, setBlockLoadingUrls] = useState(new Set());
  const [blockedImageUrls, setBlockedImageUrls] = useState(new Set());
  const [unblockedImageUrls, setUnblockedImageUrls] = useState(new Set());
  const [failedImageUrls, setFailedImageUrls] = useState(new Set());
  const [blockLoadingIds, setBlockLoadingIds] = useState(new Set());
  const [deleteLoadingIds, setDeleteLoadingIds] = useState(new Set());
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [hasMore, setHasMore] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [blockedUserProfilePhotos, setBlockedUserProfilePhotos] = useState(new Set());
  const [unblockedUserProfilePhotos, setUnblockedUserProfilePhotos] = useState(new Set());
  const [blockLoadingUserPhotos, setBlockLoadingUserPhotos] = useState(new Set());

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
        if (!ignore) {
          setUsers(normalizeUsers(rawUsers));
          const count = payload?.total ?? payload?.totalRecords ?? rawUsers.length;
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

  const handleBlockImage = async (imageUrl, petId, { unblock = false } = {}) => {
    if (!imageUrl || !petId) return;

    const imageKey = makeImageKey(petId, imageUrl);

    setBlockLoadingUrls((prev) => {
      const next = new Set(prev);
      next.add(imageKey);
      return next;
    });

    try {
      await apiRequest(BLOCK_IMAGE_API_URL, {
        method: 'POST',
        body: JSON.stringify({
          photoUrl: toApiPhotoUrl(imageUrl),
          block: !unblock,
          petId,
        }),
      });

      if (unblock) {
        setBlockedImageUrls((prev) => {
          const next = new Set(prev);
          next.delete(imageKey);
          return next;
        });
        setUnblockedImageUrls((prev) => {
          const next = new Set(prev);
          next.add(imageKey);
          return next;
        });
      } else {
        setBlockedImageUrls((prev) => {
          const next = new Set(prev);
          next.add(imageKey);
          return next;
        });
        setUnblockedImageUrls((prev) => {
          const next = new Set(prev);
          next.delete(imageKey);
          return next;
        });
      }

      // Close preview modal after blocking/unblocking
      setPreviewImage(null);
    } catch (err) {
      console.error(err);
      alert(`${unblock ? 'Unblock' : 'Block'} failed. Please verify the API and try again.`);
    } finally {
      setBlockLoadingUrls((prev) => {
        const next = new Set(prev);
        next.delete(imageKey);
        return next;
      });
    }
  };

  const handleBlockUserProfilePhoto = async (userId, imageUrl, { unblock = false } = {}) => {
    if (!userId) return;

    setBlockLoadingUserPhotos((prev) => {
      const next = new Set(prev);
      next.add(userId);
      return next;
    });

    try {
      await apiRequest(BLOCK_USER_IMAGE_API_URL, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          isBlocked: !unblock,
        }),
      });

      if (unblock) {
        setBlockedUserProfilePhotos((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
        setUnblockedUserProfilePhotos((prev) => {
          const next = new Set(prev);
          next.add(userId);
          return next;
        });
        // Update users state to reflect unblocked status
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, profilePhotoBlocked: false } : u,
          ),
        );
      } else {
        setBlockedUserProfilePhotos((prev) => {
          const next = new Set(prev);
          next.add(userId);
          return next;
        });
        setUnblockedUserProfilePhotos((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
        // Update users state to reflect blocked status
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, profilePhotoBlocked: true } : u,
          ),
        );
      }

      // Close preview modal after blocking/unblocking
      setPreviewImage(null);
    } catch (err) {
      console.error(err);
      alert(`${unblock ? 'Unblock' : 'Block'} failed. Please verify the API and try again.`);
    } finally {
      setBlockLoadingUserPhotos((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleBlockToggle = async (petId, nextIsBlock) => {
    setBlockLoadingIds((prev) => new Set(prev).add(petId));
    try {
      await apiRequest(BLOCK_PET_API_URL, {
        method: 'POST',
        body: JSON.stringify({ petId, isBan: nextIsBlock }),
      });
      setUsers((prev) =>
        prev.map((user) => ({
          ...user,
          pets: user.pets.map((pet) =>
            pet.id === petId
              ? { ...pet, isBlock: nextIsBlock }
              : pet,
          ),
        })),
      );
    } catch (err) {
      console.error(err);
      alert('Block toggle failed. Verify the API URL or try again.');
    } finally {
      setBlockLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(petId);
        return next;
      });
    }
  };

  const handleDeletePet = async (petId) => {
    setDeleteLoadingIds((prev) => new Set(prev).add(petId));
    try {
      await apiRequest(`${DELETE_PET_API_URL}/${petId}`, { method: 'DELETE' });
      setUsers((prev) =>
        prev.map((user) => {
          const filtered = user.pets.filter((pet) => pet.id !== petId);
          return { ...user, pets: filtered, totalPets: filtered.length };
        }),
      );
    } catch (err) {
      console.error(err);
      alert('Delete failed. Update the API URL or try again.');
    } finally {
      setDeleteLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(petId);
        return next;
      });
    }
  };

  return (
    <section>
      <header className="section-header">
        <div>
          <p className="muted">Block pet images and user profile photos</p>
          <h2>Images</h2>
        </div>
      </header>

      {error ? <div className="notice warning">{error}</div> : null}

      {loading ? (
        <p className="muted">Loading users...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {users.map((user) => (
            <div
              key={user.id}
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '1rem',
                padding: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                {user.profilePhoto ? (
                  <div style={{ position: 'relative' }}>
                    <img
                      src={user.profilePhoto}
                      alt={user.name}
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        cursor: 'zoom-in',
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                      onClick={() => {
                        const isBlocked =
                          (user.profilePhotoBlocked || blockedUserProfilePhotos.has(user.id)) &&
                          !unblockedUserProfilePhotos.has(user.id);
                        setPreviewImage({
                          src: user.profilePhoto,
                          alt: `${user.name} profile photo`,
                          userId: user.id,
                          isProfilePhoto: true,
                          isBlocked,
                        });
                      }}
                    />
                    {(user.profilePhotoBlocked || blockedUserProfilePhotos.has(user.id)) &&
                      !unblockedUserProfilePhotos.has(user.id) && (
                        <div
                          style={{
                            position: 'absolute',
                            left: '0.25rem',
                            top: '0.25rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '0.35rem',
                            background: 'rgba(248, 113, 113, 0.9)',
                            color: '#fff',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em',
                          }}
                        >
                          Blocked
                        </div>
                      )}
                  </div>
                ) : (
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b',
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem' }}>{user.name}</h3>
                  <p className="muted" style={{ margin: 0 }}>{user.email}</p>
                  <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
                    Total Pets: <strong>{user.totalPets}</strong>
                  </p>
                </div>
              </div>

              {user.pets.length > 0 ? (
                <div className="pet-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {user.pets.map((pet) => (
                    <div
                      key={pet.id}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.75rem',
                        padding: '0.75rem',
                        background: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          marginBottom: '0.35rem',
                        }}
                      >
                        <strong style={{ fontSize: '1rem' }}>{pet.name}</strong>
                        {pet.images && pet.images.length > 0 ? (
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="outline"
                              style={{ padding: '0.35rem 0.7rem', fontSize: '0.82rem' }}
                              disabled={blockLoadingIds.has(pet.id)}
                              onClick={() => handleBlockToggle(pet.id, !pet.isBlock)}
                            >
                              {blockLoadingIds.has(pet.id) ? 'Updating…' : pet.isBlock ? 'Unblock' : 'Block'}
                            </button>
                            <button
                              type="button"
                              className="danger outline"
                              style={{ padding: '0.35rem 0.7rem', fontSize: '0.82rem' }}
                              disabled={deleteLoadingIds.has(pet.id)}
                              onClick={() => handleDeletePet(pet.id)}
                            >
                              {deleteLoadingIds.has(pet.id) ? 'Deleting…' : 'Delete'}
                            </button>
                          </div>
                        ) : null}
                      </div>
                      {pet.images && pet.images.length > 0 ? (
                        <div
                          style={{
                            display: 'flex',
                            gap: '0.75rem',
                            flexWrap: 'nowrap',
                            overflowX: 'auto',
                            paddingBottom: '0.25rem',
                          }}
                        >
                          {pet.images.map((imageObj, index) => {
                            const url = typeof imageObj === 'string' ? imageObj : imageObj?.url;
                            if (!url) return null;
                            const imageKey = makeImageKey(pet.id, url);
                            const apiBlocked =
                              typeof imageObj === 'object' &&
                              (imageObj?.blocked ||
                                imageObj?.isBlock === true ||
                                imageObj?.isBlock === 'true' ||
                                imageObj?.isBlocked === true ||
                                imageObj?.isBlocked === 'true');
                            const isMarkedBlocked = Boolean((apiBlocked || blockedImageUrls.has(imageKey)) && !unblockedImageUrls.has(imageKey));
                            const isBlocking = blockLoadingUrls.has(imageKey);
                            const isFailed = failedImageUrls.has(url);
                            return (
                              <div key={index} style={{ position: 'relative' }}>
                                {isFailed ? (
                                  <div
                                    style={{
                                      width: '100%',
                                      height: pet.images.length === 1 ? '340px' : '220px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      borderRadius: '0.5rem',
                                      background: '#f8fafc',
                                      border: '1px dashed #e2e8f0',
                                      color: '#64748b',
                                      fontSize: '0.9rem',
                                      textAlign: 'center',
                                      padding: '0.75rem',
                                    }}
                                  >
                                    Image unavailable
                                  </div>
                                ) : (
                                  <img
                                    src={url}
                                    alt={`${pet.name} ${index + 1}`}
                                    style={{
                                      width: '100%',
                                      height: 'auto',
                                      maxHeight: pet.images.length === 1 ? '340px' : '220px',
                                      objectFit: 'contain',
                                      borderRadius: '0.5rem',
                                      margin: pet.images.length === 1 ? '0 auto' : '0',
                                      background: '#fff',
                                      border: '1px solid #e2e8f0',
                                      padding: '0.35rem',
                                      boxSizing: 'border-box',
                                      cursor: isMarkedBlocked ? 'not-allowed' : 'zoom-in',
                                      filter: isMarkedBlocked ? 'grayscale(0.8)' : 'none',
                                      opacity: isMarkedBlocked ? 0.7 : 1,
                                    }}
                                    onError={() => {
                                      setFailedImageUrls((prev) => {
                                        const next = new Set(prev);
                                        next.add(url);
                                        return next;
                                      });
                                    }}
                                    onClick={() => {
                                      if (isMarkedBlocked) return;
                                      setPreviewImage({
                                        src: url,
                                        alt: `${pet.name} ${index + 1}`,
                                        blocked: isMarkedBlocked,
                                        petId: pet.id,
                                        imageKey,
                                      });
                                    }}
                                  />
                                )}
                                {isMarkedBlocked ? (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: '0.5rem',
                                      top: '0.5rem',
                                      padding: '0.3rem 0.6rem',
                                      borderRadius: '0.45rem',
                                      background: 'rgba(248, 113, 113, 0.9)',
                                      color: '#fff',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.02em',
                                      zIndex: 3,
                                    }}
                                  >
                                    Blocked
                                  </div>
                                ) : null}
                                <button
                                  type="button"
                                  className="danger outline"
                                  style={{
                                    position: 'absolute',
                                    right: '0.5rem',
                                    bottom: '0.5rem',
                                    padding: '0.35rem 0.6rem',
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    borderRadius: '0.5rem',
                                    border: '1px solid #fecaca',
                                    background: '#fff',
                                    color: '#b91c1c',
                                    letterSpacing: '0.02em',
                                    minWidth: '88px',
                                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
                                    zIndex: 2,
                                  }}
                                  disabled={isBlocking}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleBlockImage(url, pet.id, { unblock: isMarkedBlocked });
                                  }}
                                >
                                  {isBlocking ? (isMarkedBlocked ? 'Unblocking…' : 'Blocking…') : isMarkedBlocked ? 'Unblock' : 'Block'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                          No images for this pet.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No pets added yet.</p>
              )}
            </div>
          ))}
          <div className="pagination" style={{ marginTop: '1rem' }}>
            <div className="page-info">
              Page <strong>{page}</strong> • Total records <strong>{totalRecords}</strong>
            </div>
            <div className="pagination-actions">
              <button
                type="button"
                disabled={page === 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!hasMore || loading}
                onClick={() => setPage((p) => p + 1)}
              >
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

      {previewImage ? (
        <div
          className="detail-overlay"
          onClick={() => setPreviewImage(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setPreviewImage(null);
            }
          }}
        >
          <div
            className="detail-card"
            style={{ maxWidth: '900px', width: '100%', maxHeight: '90vh' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="detail-header" style={{ alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>{previewImage?.isProfilePhoto ? 'Profile Photo Preview' : 'Image preview'}</h4>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {previewImage?.isProfilePhoto ? (
                  <button
                    className="danger outline"
                    type="button"
                    disabled={blockLoadingUserPhotos.has(previewImage.userId)}
                    onClick={() => handleBlockUserProfilePhoto(previewImage.userId, previewImage.src, { unblock: previewImage?.isBlocked })}
                  >
                    {blockLoadingUserPhotos.has(previewImage.userId)
                      ? previewImage?.isBlocked
                        ? 'Unblocking…'
                        : 'Blocking…'
                      : previewImage?.isBlocked
                        ? 'Unblock'
                        : 'Block'}
                  </button>
                ) : (
                  <button
                    className="danger outline"
                    type="button"
                    disabled={blockLoadingUrls.has(previewImage.imageKey)}
                    onClick={() => handleBlockImage(previewImage.src, previewImage?.petId, { unblock: previewImage?.blocked })}
                  >
                    {blockLoadingUrls.has(previewImage.imageKey)
                      ? previewImage?.blocked
                        ? 'Unblocking…'
                        : 'Blocking…'
                      : previewImage?.blocked
                        ? 'Unblock'
                        : 'Block'}
                  </button>
                )}
                <button className="outline" type="button" onClick={() => setPreviewImage(null)}>
                  Close
                </button>
              </div>
            </div>
            {(previewImage?.blocked || previewImage?.isBlocked) ? (
              <div
                style={{
                  padding: '0.6rem 1rem',
                  marginBottom: '0.75rem',
                  borderRadius: '0.6rem',
                  background: '#fff7ed',
                  color: '#c2410c',
                  border: '1px solid #fed7aa',
                }}
              >
                This image is marked as blocked.
              </div>
            ) : null}
            <img
              src={previewImage.src}
              alt={previewImage.alt}
              style={{
                width: '100%',
                height: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: '0.75rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

