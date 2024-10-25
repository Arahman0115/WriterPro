import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';
import './UserDropdown.css';
import { useNavigate } from 'react-router-dom';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

const UserDropdown = () => {
    const { currentUser, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [profilePicUrl, setProfilePicUrl] = useState(null);
    const navigate = useNavigate();
    const dropdownRef = useRef(null); // Reference for the dropdown

    useEffect(() => {
        const fetchProfilePic = async () => {
            if (currentUser) {
                try {
                    setProfilePicUrl(currentUser.photoURL);
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        if (userData.profilePictureUrl) {
                            setProfilePicUrl(userData.profilePictureUrl);
                        }
                    }
                } catch (error) {
                    console.error("Error fetching profile picture:", error);
                }
            }
        };

        fetchProfilePic();
    }, [currentUser]);

    const toggleDropdown = (e) => {
        e.stopPropagation(); // Add this line
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

    console.log("UserDropdown rendered, isOpen:", isOpen);

    return (
        <div className="user-dropdown" ref={dropdownRef}>
            <div className="user-profile" onClick={toggleDropdown}>
                {profilePicUrl ? (
                    <img src={profilePicUrl} alt="Profile" className="profile-pic" />
                ) : (
                    <div className="profile-pic-placeholder">
                        {currentUser?.displayName?.[0] || currentUser?.email?.[0] || '?'}
                    </div>
                )}
            </div>
            <div className={`dropdown-menu ${isOpen ? 'open' : ''}`}>
                <p className="user-info">{currentUser?.displayName || currentUser?.email}</p>
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
        </div>
    );
};

export default UserDropdown;
