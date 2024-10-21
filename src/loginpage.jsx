import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './LogInPage.css'; // Import the CSS file
import googleImage from './assets/googleimage.png'; // Import the Google image

const LogInPage = () => {
    const { login, signup, googleLogin } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Check if the state passed from the landing page indicates signup
        if (location.state && location.state.isSignup) {
            setIsLogin(false); // Set to signup form
        }
    }, [location.state]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Clear any existing errors
        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await signup(email, password);
            }
            navigate('/Homepage');
        } catch (error) {
            console.error(error);
            if (error.code === 'auth/invalid-credential' ||
                error.code === 'auth/user-not-found' ||
                error.code === 'auth/wrong-password') {
                setError('Incorrect email or password');
            } else if (error.code === 'auth/email-already-in-use') {
                setError('Email already in use');
            } else {
                setError('An error occurred. Please try again.');
            }
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await googleLogin();
            navigate('/Homepage');
        } catch (error) {
            console.error(error);

        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h1 className="login-title">{isLogin ? 'Login' : 'Create An Account'}</h1>
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleSubmit} className="login-form">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        className="login-input"
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="login-input"
                    />
                    <button type="submit" className="login-button">
                        {isLogin ? 'Login' : 'Signup'}
                    </button>

                    {/* Divider with "OR" */}
                    <div className="divider-wrapper">
                        <span className="divider">OR</span>
                    </div>

                    {/* Google Login Button */}

                    <button onClick={handleGoogleLogin} className="google-login-button">
                        <img
                            src={googleImage}
                            alt="Google Sign-In"
                            className="google-login-image"
                        />
                        {isLogin ? 'Sign in' : 'Sign up'} with Google
                    </button>

                    <button
                        type="button"
                        className="toggle-button"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError(''); // Clear error when switching between login and signup
                        }}
                    >
                        {isLogin ? 'Need an account? Sign up' : 'Already have an account? Log in'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LogInPage;
