import React, { useState, useEffect } from 'react';
import './ResearchCross.css';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from './firebase'; // Assuming your firebase.js exports auth and db
import axios from 'axios';
import ProjectPopup from './ProjectPopup';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const ResearchCross = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [showPopup, setShowPopup] = useState(false);
    const [userProjects, setUserProjects] = useState([]);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const { currentUser } = useAuth();
    const userUid = currentUser?.uid;
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserProjects = async () => {
            if (userUid) {
                try {
                    const projectsSnapshot = await getDocs(collection(db, 'users', userUid, 'projects'));
                    const projects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setUserProjects(projects);
                } catch (error) {
                    console.error("Error fetching user projects:", error);
                }
            }
        };
        fetchUserProjects();
    }, [userUid]);

    const handleSearch = async () => {
        try {
            const response = await axios.get(`https://api.crossref.org/works?query=${searchTerm}&rows=5`);
            const items = response.data.message.items.map(item => ({
                title: item.title[0],
                url: item.URL,
                description: item.abstract ? item.abstract : 'No description available'
            }));
            setResults(items);
        } catch (error) {
            console.error("Error fetching data from CrossRef API:", error);
        }
    };

    const addToProject = (article) => {
        setSelectedArticle(article);
        setShowPopup(true);
    };

    const handleSelectProject = async (project) => {
        if (selectedArticle) {
            try {
                await addDoc(collection(db, 'users', userUid, 'projects', project.id, 'researcharticles'), {
                    title: selectedArticle.title,
                    description: selectedArticle.description,
                    url: selectedArticle.url,
                    createdAt: new Date()
                });
                console.log('Article added to project successfully!');
            } catch (error) {
                console.error("Error adding article to project:", error);
                alert('Failed to add article to project. Please try again.');
            }
            setShowPopup(false);
        }
    };
    const handleHomePress = () => {
        navigate('/Homepage');
    };

    return (
        <div className="research-container">
            <button onClick={handleHomePress} className="res-home-button">
                <ChevronLeft size={20} />

            </button>
            <h1>CrossRef</h1>
            <div className="search-container">
                <input
                    type="text"
                    placeholder="Search for research articles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button onClick={handleSearch}>Search</button>
            </div>
            <div className="results-container">
                {results.map((article, index) => (
                    <div key={index} className="article-box">
                        <h3>{article.title}</h3>
                        <p>{article.description}</p>
                        <a href={article.url} target="_blank" rel="noopener noreferrer">Read Article</a>
                        <button className='addprojectbtn' onClick={() => addToProject(article)}>
                            Add to Project
                        </button>
                    </div>
                ))}
            </div>

            {showPopup && (
                <ProjectPopup
                    projects={userProjects}
                    onSelectProject={handleSelectProject}
                    onClose={() => setShowPopup(false)}
                />
            )}
        </div>
    );
};

export default ResearchCross;
