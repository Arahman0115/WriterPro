import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';
import './UserDropdown.css';
import { useNavigate } from 'react-router-dom';

const UserDropdown = () => {
    const { currentUser, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const dropdownRef = useRef(null); // Reference for the dropdown

    const toggleDropdown = () => {
        setIsOpen((prev) => !prev); // Toggle dropdown state
    };

    const handleLogout = () => {
        logout();
        setIsOpen(false); // Close dropdown after logout
    };

    const goToSettings = () => {
        navigate('/settings');
        setIsOpen(false); // Close dropdown when navigating to settings
    };

    const goToDocs = () => {
        navigate('/demo');
        setIsOpen(false); // Close dropdown when navigating to docs
    };

    // Close dropdown if click is outside of it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false); // Close dropdown if clicked outside
            }
        };

        // Add event listener
        document.addEventListener('mousedown', handleClickOutside);

        // Cleanup the event listener on component unmount
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownRef]);

    return (
        <div className="user-dropdown" ref={dropdownRef}>
            <div className="user-profile" onClick={toggleDropdown}>
                {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" className="profile-pic1" />
                ) : (
                    <div className="default-pic">👤</div> // Default icon if no picture is available
                )}
            </div>
            {isOpen && (
                <div className="dropdown-menu">
                    <p>{currentUser?.displayName || currentUser?.email}</p> {/* Show display name or email */}
                    <button onClick={handleLogout} className="dropdown-button">
                        🚪 Sign out
                    </button>
                    <button onClick={goToSettings} className="dropdown-button">
                        ⚙️ Settings
                    </button>
                    <button onClick={goToDocs} className="dropdown-button">
                        📄 Docs
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserDropdown;
