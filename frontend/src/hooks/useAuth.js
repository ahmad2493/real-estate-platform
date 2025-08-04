import { useSelector, useDispatch } from 'react-redux';
import { loginUser, registerUser, logout, fetchUserProfile } from '../slices/userSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, loading, error, isAuthenticated } = useSelector((state) => state.user);

  const login = (credentials) => dispatch(loginUser(credentials));
  const register = (userData) => dispatch(registerUser(userData));
  const logoutUser = () => dispatch(logout());
  const fetchProfile = () => dispatch(fetchUserProfile());

  return {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout: logoutUser,
    fetchProfile,
  };
};
