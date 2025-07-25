// components/OAuthHandler.js
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const OAuthHandler = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        navigate('/login?error=' + error);
        return;
      }

      if (token) {
        try {
          // Store the token (using your existing key)
          localStorage.setItem('authToken', token);
          
          // Optionally fetch user data to verify token
          const response = await fetch(`http://localhost:5000/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            localStorage.setItem('user', JSON.stringify(data.data.user));
            console.log('OAuth login successful');
            navigate('/dashboard');
          } else {
            throw new Error('Invalid token');
          }
        } catch (error) {
          console.error('OAuth error:', error);
          localStorage.removeItem('authToken');
          navigate('/login?error=authentication_failed');
        }
      } else {
        console.error('No token received');
        navigate('/login?error=no_token');
      }
    };

    handleOAuthCallback();
  }, [navigate, searchParams]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column' 
    }}>
      <div>Processing OAuth login...</div>
      <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
        Please wait while we complete your authentication.
      </div>
    </div>
  );
};

export default OAuthHandler;