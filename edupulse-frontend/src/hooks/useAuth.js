import { useSelector } from 'react-redux';

export function useAuth() {
  const { user, loading } = useSelector((state) => state.auth);
  return { user, loading, isAuthenticated: !!user };
}