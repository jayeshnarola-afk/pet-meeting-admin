// Use CORS proxy for production to bypass Mixed Content errors
const API_BASE_URL = 'http://13.50.250.95:4000';
// const CORS_PROXY = 'https://corsproxy.io/?';

// export const API_BASE_URL = import.meta.env.MODE === 'production' 
//   ? `${CORS_PROXY}${encodeURIComponent(BACKEND_API)}`
//   : BACKEND_API;
export const USERS_API_URL = `${API_BASE_URL}/admin/api/user/list`;
export const BAN_USER_API_URL = `${API_BASE_URL}/admin/api/user/banUser`;
export const DELETE_USER_API_URL = `${API_BASE_URL}/admin/api/user`;

export const PETS_API_URL = `${API_BASE_URL}/admin/api/pets/list`;
export const TYPES_API_URL = `${API_BASE_URL}/admin/api/pets/petTypeList`;
export const BREEDS_API_URL = `${API_BASE_URL}/admin/api/pets/petBreedList`;
export const PERSONALITIES_API_URL = `${API_BASE_URL}/admin/api/pets/personalities`;
export const BAN_PET_API_URL = `${API_BASE_URL}/admin/api/pets/banPet`;
export const DELETE_PET_API_URL = `${API_BASE_URL}/admin/api/pets`;
export const DASHBOARD_COUNT_API_URL = `${API_BASE_URL}/admin/api/dashbord/count`;
export const BLOCK_IMAGE_API_URL = `${API_BASE_URL}/admin/api/pets/blockimage`;
export const BLOCK_USER_IMAGE_API_URL = `${API_BASE_URL}/admin/api/user/blockuserphoto`;

export const STATIC_LOGIN = {
  email: 'admin@gmail.com',
  password: 'Admin@123',
};  




