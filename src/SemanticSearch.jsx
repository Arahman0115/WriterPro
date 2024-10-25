import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import axios from 'axios';
import ProjectPopup from './ProjectPopup';
import { useAuth } from './AuthContext';
import './SemanticSearch.css';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const API_BASE_URL = 'https://api.semanticscholar.org/graph/v1/paper/search';
const RESULTS_PER_PAGE = 10;

const SemanticSearch = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
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

    const handleSearch = async (page = 1) => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.get(API_BASE_URL, {
                params: {
                    query: searchTerm,
                    limit: RESULTS_PER_PAGE,
                    offset: (page - 1) * RESULTS_PER_PAGE,
                    fields: 'title,authors,abstract,url,year'
                }
            });

            const { data } = response;
            if (data.total > 0) {
                setTotalResults(data.total);
                setResults(data.data);
                setCurrentPage(page);
            } else {
                setError('No articles found for your search.');
                setResults([]);
            }
        } catch (error) {
            console.error("Error fetching data from Semantic Scholar API:", error);
            setError('Failed to fetch articles. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            handleSearch();
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
                    author: selectedArticle.authors.map(author => author.name).join(', '),
                    abstract: selectedArticle.abstract || 'No abstract available',
                    url: selectedArticle.url,
                    year: selectedArticle.year,
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

    return (
        <div className="semantic-search-container">
            <button className="semantic-back-button" onClick={() => navigate('/Homepage')}>
                <ChevronLeft size={20} />
            </button>
            <h1 className="semantic-search-title">Semantic Scholar Search</h1>

            <div className="semantic-search-bar">
                <input
                    type="text"
                    placeholder="Search for research articles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="semantic-search-input"
                />
                <button
                    onClick={() => handleSearch()}
                    disabled={loading}
                    className="semantic-search-button"
                >
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </div>

            {error && (
                <div className="semantic-search-error">
                    <p>{error}</p>
                </div>
            )}

            <div className="semantic-results-container">
                {loading && <div className="semantic-loading">Loading...</div>}
                {results.map((article, index) => (
                    <div key={index} className="semantic-article-box">
                        <h3 className="semantic-article-title">{article.title}</h3>
                        <p className="semantic-article-authors">Author(s): {article.authors.map(author => author.name).join(', ')}</p>
                        <p className="semantic-article-abstract">{article.abstract || 'No abstract available'}</p>
                        <p className="semantic-article-year">Year: {article.year || 'N/A'}</p>
                        <div className="semantic-article-buttons">


                            <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="semantic-article-link"
                            >
                                Read Article
                            </a>
                            <button
                                className='semantic-add-project-btn'
                                onClick={() => addToProject(article)}
                            >
                                Add to Project
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {totalResults > RESULTS_PER_PAGE && (
                <div className="semantic-pagination">
                    <button
                        onClick={() => handleSearch(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                        className="semantic-pagination-button"
                    >
                        Previous
                    </button>
                    <span className="semantic-pagination-info">Page {currentPage} of {Math.ceil(totalResults / RESULTS_PER_PAGE)}</span>
                    <button
                        onClick={() => handleSearch(currentPage + 1)}
                        disabled={currentPage * RESULTS_PER_PAGE >= totalResults || loading}
                        className="semantic-pagination-button"
                    >
                        Next
                    </button>
                </div>
            )}

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

export default SemanticSearch;
