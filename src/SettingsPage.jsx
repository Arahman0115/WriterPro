import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext'; // Import the custom hook
import './SettingsPage.css'; // Add your styles here
import { storage } from './firebase'; // Import your Firebase storage setup
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // Import required functions from Firebase storage
import { doc, updateDoc } from 'firebase/firestore'; // Import Firestore functions
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, User, Bot, Upload } from 'lucide-react';

const SettingsPage = () => {
    const { currentUser, updateProfile } = useAuth(); // Make sure to include updateProfile from AuthContext
    const [name, setName] = useState(currentUser?.displayName || '');
    const [profilePic, setProfilePic] = useState(null);
    const [tone, setTone] = useState('neutral');
    const [language, setLanguage] = useState('English');
    const [suggestions, setSuggestions] = useState(true);
    const navigate = useNavigate();
    useEffect(() => {
        if (currentUser) {
            setName(currentUser.displayName || '');
        }
    }, [currentUser]);

    const handleProfileUpdate = (e) => {
        e.preventDefault();
        const updates = {
            displayName: name,
        };

        // If there is a new profile picture, upload it
        if (profilePic) {
            const imageRef = ref(storage, `${currentUser.uid}/profilePictures`); // Reference to the location in Storage

            // Upload the file
            uploadBytes(imageRef, profilePic).then(() => {
                // Get the download URL after uploading
                getDownloadURL(imageRef).then((url) => {
                    // Add the photo URL to updates
                    updates.photoURL = url;

                    // Update the user's profile in Firebase Authentication
                    updateProfile(updates).then(() => {
                        // Update the Firestore document with the new profile picture URL
                        const userRef = doc(db, 'Users', currentUser.uid);
                        updateDoc(userRef, { profilePicture: url, displayName: name }) // Update Firestore with both fields
                            .then(() => {
                                console.log("Profile updated successfully!");
                            })
                            .catch((error) => {
                                console.error("Error updating profile in Firestore:", error);
                            });
                    }).catch((error) => {
                        console.error("Error updating profile:", error);
                    });
                });
            }).catch((error) => {
                console.error("Error uploading file:", error);
            });
        } else {
            // If there's no new profile picture, just update the displayName
            const userRef = doc(db, 'Users', currentUser.uid);
            updateDoc(userRef, { displayName: name }) // Update Firestore with the new display name
                .then(() => {
                    console.log("Display name updated successfully!");
                })
                .catch((error) => {
                    console.error("Error updating display name in Firestore:", error);
                });
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfilePic(file); // Set the file to the state
        }
    };

    const handleBotSettingsUpdate = (e) => {
        e.preventDefault();
        console.log('Updated Bot Settings:', { tone, language, suggestions });
    };
    const handleSetHomeClick = () => {
        navigate('/Homepage');
    }

    return (
        <div className="settings-page-container">
            <button onClick={handleSetHomeClick} className="settings-home-button">
                <ChevronLeft size={20} />
            </button>
            <h1 className="settings-header">Settings</h1>

            <div className="settings-content">
                <div className="settings-section">
                    <h2><User size={20} /> User Profile</h2>
                    <form onSubmit={handleProfileUpdate}>
                        <div className="form-group">
                            <label htmlFor="name">Name</label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="profile-pic">Profile Picture</label>
                            <div className="file-input-wrapper">
                                <input
                                    type="file"
                                    id="profile-pic"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                                <label htmlFor="profile-pic" className="file-input-label">
                                    <Upload size={20} /> Choose File
                                </label>
                            </div>
                        </div>
                        <button type="submit" className="update-button">Update Profile</button>
                    </form>
                </div>

                <div className="settings-section">
                    <h2><Bot size={20} /> Writing Bot Settings</h2>
                    <form onSubmit={handleBotSettingsUpdate}>
                        <div className="form-group">
                            <label htmlFor="tone">Tone</label>
                            <select
                                id="tone"
                                value={tone}
                                onChange={(e) => setTone(e.target.value)}
                            >
                                <option value="neutral">Neutral</option>
                                <option value="formal">Formal</option>
                                <option value="friendly">Friendly</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="language">Language</label>
                            <select
                                id="language"
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                            >
                                <option value="English">English</option>
                                <option value="Spanish">Spanish</option>
                                <option value="French">French</option>
                            </select>
                        </div>
                        <div className="form-group checkbox-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={suggestions}
                                    onChange={(e) => setSuggestions(e.target.checked)}
                                />
                                Enable Suggestions
                            </label>
                        </div>
                        <button type="submit" className="update-button">Update Bot Settings</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
