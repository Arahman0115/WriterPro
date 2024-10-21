import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';
import homeIcon from './home-icon.jpg';
import quill from './quilio.png';
import wbg from './wbg.png';

const LandingPage = () => {
    return (
        <div className="landing-container">
            <nav className="landing-nav">
                <img src={wbg} alt="Home" className="home-icon12" />
                <div className="nav-links">
                    <Link to="/login">Log In</Link>
                    <Link to="/login" state={{ isSignup: true }} className="signup-btn">Sign Up</Link>
                </div>
            </nav>
            <div className="landing-content">
                <h1>Welcome to WriterPro</h1>
                <p className="tagline">Your journey to productivity starts here.</p>
                <div className="cta-buttons">
                    <Link to="/login" state={{ isSignup: true }}>
                        <button className="cta-button primary">Get Started</button>
                    </Link>
                    <Link to="/demo">
                        <button className="cta-button secondary">Docs</button>
                    </Link>
                </div>
            </div>
            <div className="features-section">
                <h2>Key Features</h2>
                <div className="feature-grid">
                    <div className="feature-item">
                        <i className="feature-icon">📝</i>
                        <h3>Smart Writing</h3>
                        <p>AI-powered writing assistance to boost your productivity.</p>
                    </div>
                    <div className="feature-item">
                        <i className="feature-icon">🔒</i>
                        <h3>Secure Storage</h3>
                        <p>Your data is encrypted and safely stored in the cloud.</p>
                    </div>
                    <div className="feature-item">
                        <i className="feature-icon">🔗</i>
                        <h3>Easy Sharing</h3>
                        <p>Collaborate with team members effortlessly.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
