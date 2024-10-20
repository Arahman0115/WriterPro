import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from './firebase'; // Assuming your firebase.js exports auth and db
import axios from 'axios';
import ProjectPopup from './ProjectPopup';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import './GeneralSearch.css';
import { ChevronLeft } from 'lucide-react';

const GeneralSearch = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [showPopup, setShowPopup] = useState(false);
    const [userProjects, setUserProjects] = useState([]);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const { currentUser } = useAuth();
    const userUid = currentUser?.uid;
    const navigate = useNavigate();

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const resultsPerPage = 5; // Number of results to display per page
    const [loading, setLoading] = useState(false); // Loading state

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
        if (!searchTerm) return; // Prevent search with empty term
        setLoading(true); // Set loading state
        try {
            const response = await axios.post('http://localhost:3000/api/search', { searchTerm });
            setResults(response.data.results);
            setCurrentPage(1); // Reset to the first page on new search
        } catch (error) {
            console.error("Error fetching data from server:", error);
            // Optionally show an error message to the user
        } finally {
            setLoading(false); // Reset loading state
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
                // Optionally, you can show a success message to the user here
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

    // Calculate the displayed results
    const indexOfLastResult = currentPage * resultsPerPage;
    const indexOfFirstResult = indexOfLastResult - resultsPerPage;
    const currentResults = results.slice(indexOfFirstResult, indexOfLastResult);
    const totalPages = Math.ceil(results.length / resultsPerPage);
    const renderPaginationControls = () => {
        if (results.length === 0) return null;

        return (
            <div className="GeneralSearch-pagination">
                <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="GeneralSearch-pagination-button"
                >
                    Previous
                </button>
                <span className="GeneralSearch-pagination-info">
                    Page {currentPage} of {totalPages}
                </span>
                <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="GeneralSearch-pagination-button"
                >
                    Next
                </button>
            </div>
        );
    };
    const truncateText = (text, maxLength) => {
        if (text.length > maxLength) {
            return text.slice(0, maxLength) + '...';
        }
        return text;
    };

    return (
        <div className="GeneralSearch-search-container">
            <button onClick={handleHomePress} className="res-home-button">
                <ChevronLeft size={20} />

            </button>
            <h1>General Search</h1>
            <div className="GeneralSearch-search-input">
                <input
                    type="text"
                    placeholder="Search for anything..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button onClick={handleSearch}>Search</button>
            </div>
            <div className="GeneralSearch-results-container">
                {loading && <p className="GeneralSearch-loading">Loading...</p>}
                {!loading && currentResults.map((article) => (
                    <div key={article.url} className="GeneralSearch-article-box">
                        <h3>{article.title}</h3>
                        <div className='paragraph'>
                            <p>{truncateText(article.description, 300)}</p>
                        </div>

                        <div className="GeneralSearch-article-actions">
                            <a href={article.url} target="_blank" rel="noopener noreferrer">Go</a>
                            <button className='GeneralSearch-addprojectbtn1' onClick={() => addToProject(article)}>
                                Add to Project
                            </button>
                        </div>
                    </div>
                ))}
                {!loading && results.length === 0 && <p className="GeneralSearch-no-results"></p>}
            </div>

            {renderPaginationControls()}

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

export default GeneralSearch;
