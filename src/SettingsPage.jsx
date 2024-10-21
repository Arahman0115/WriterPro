import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext'; // Import the custom hook
import './SettingsPage.css'; // Add your styles here
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // Import required functions from Firebase storage
import { doc, setDoc } from 'firebase/firestore'; // Import Firestore functions
import { db } from './firebase'; // Make sure to import your Firestore instance
import { getAuth, updateProfile } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, User, Bot, Upload } from 'lucide-react';

const SettingsPage = () => {
    const { currentUser } = useAuth(); // Make sure to include updateProfile from AuthContext
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

    const uploadProfilePicture = async (file, userId) => {
        const storage = getStorage();
        const storageRef = ref(storage, `profilePictures/${userId}`);

        try {
            // Upload the file
            await uploadBytes(storageRef, file);

            // Get the download URL
            const downloadURL = await getDownloadURL(storageRef);

            // Save the URL to Firestore
            const userDocRef = doc(db, 'users', userId);
            await setDoc(userDocRef, {
                profilePictureUrl: downloadURL
            }, { merge: true });

            console.log("Profile picture uploaded successfully");
            return downloadURL;
        } catch (error) {
            console.error("Error uploading profile picture:", error);
            throw error;
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        try {
            let photoURL = currentUser.photoURL;

            if (profilePic) {
                photoURL = await uploadProfilePicture(profilePic, currentUser.uid);
            }

            // Update the user's profile in Firebase Authentication
            const auth = getAuth();
            await updateProfile(auth.currentUser, {
                displayName: name,
                photoURL: photoURL
            });

            // Update or create the Firestore document
            const userRef = doc(db, 'users', currentUser.uid);
            await setDoc(userRef, {
                displayName: name,
                profilePictureUrl: photoURL
            }, { merge: true });

            console.log("Profile updated successfully!");
            // Optionally, show a success message to the user
        } catch (error) {
            console.error("Error updating profile:", error);
            // Optionally, show an error message to the user
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
        // Implement the logic to save bot settings
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
