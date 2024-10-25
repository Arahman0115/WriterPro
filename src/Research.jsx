import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from './firebase'; // Assuming your firebase.js exports auth and db
import axios from 'axios';
import ProjectPopup from './ProjectPopup';
import './Research.css';
import { useAuth } from './AuthContext';
import { ChevronLeft, FileText } from 'lucide-react';

const API_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
const PMC_API_URL = 'https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/';
const RESULTS_PER_PAGE = 5;
const MAX_RESULTS = 500;

const Research = () => {
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
    const navigate = useNavigate();
    const userUid = currentUser?.uid;
    const [selectedArticles, setSelectedArticles] = useState([]);
    const [articlesOpen, setArticlesOpen] = useState(false);
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

    const fetchFullText = async (pmid) => {
        try {
            // First, try to get the PMC ID
            const idConversionResponse = await axios.get(`${API_BASE_URL}elink.fcgi`, {
                params: {
                    dbfrom: 'pubmed',
                    db: 'pmc',
                    id: pmid,
                    retmode: 'json'
                }
            });

            const pmcid = idConversionResponse.data.linksets[0]?.linksetdbs?.[0]?.links?.[0];

            if (pmcid) {
                // If we have a PMC ID, fetch the full text
                const fullTextResponse = await axios.get(`${PMC_API_URL}${pmcid}/unicode`);
                return fullTextResponse.data.passages.map(passage => passage.text).join(' ');
            }
        } catch (error) {
            console.error("Error fetching full text:", error);
        }
        return null; // Return null if full text is not available
    };

    const handleSearch = async (page = 1) => {
        setLoading(true);
        setError('');
        try {
            const searchResponse = await axios.get(`${API_BASE_URL}esearch.fcgi`, {
                params: {
                    db: 'pubmed',
                    term: searchTerm,
                    retmode: 'json',
                    retmax: Math.min(RESULTS_PER_PAGE, MAX_RESULTS),
                    retstart: (page - 1) * RESULTS_PER_PAGE,
                }
            });

            const { esearchresult } = searchResponse.data;
            if (esearchresult?.idlist?.length) {
                const totalCount = Math.min(parseInt(esearchresult.count, 10), MAX_RESULTS);
                setTotalResults(totalCount);
                const ids = esearchresult.idlist.join(',');

                const detailsResponse = await axios.get(`${API_BASE_URL}efetch.fcgi`, {
                    params: {
                        db: 'pubmed',
                        id: ids,
                        retmode: 'xml'
                    }
                });

                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(detailsResponse.data, "text/xml");
                const articlesArray = xmlDoc.getElementsByTagName('PubmedArticle');

                const articles = Array.from(articlesArray).map(article => {
                    const title = article.querySelector('ArticleTitle')?.textContent || 'No title available';
                    const pmid = article.querySelector('PMID')?.textContent;
                    const url = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
                    const abstract = article.querySelector('AbstractText')?.textContent || 'No abstract available';
                    const authorList = article.querySelectorAll('AuthorList > Author');
                    const authors = Array.from(authorList).map(author => {
                        const lastName = article.querySelector('LastName')?.textContent || 'Unknown';
                        const foreName = article.querySelector('ForeName')?.textContent || 'Unknown';
                        return `${foreName} ${lastName}`;
                    });
                    return { title, url, abstract, pmid, author: authors.join(', ') };
                });

                setResults(articles);
                setCurrentPage(page);
                setArticlesOpen(true);
            } else {
                setError('No articles found for your search.');
                setResults([]);
            }
        } catch (error) {
            console.error("Error fetching data from PubMed API:", error);
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

    const handleHomePress = () => {
        navigate('/Homepage');
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
                    author: selectedArticle.author,
                    abstract: selectedArticle.abstract,
                    url: selectedArticle.url,
                    pmid: selectedArticle.pmid,
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

    const toggleArticleSelection = (article) => {
        setSelectedArticles(prevSelected => {
            if (prevSelected.some(a => a.pmid === article.pmid)) {
                return prevSelected.filter(a => a.pmid !== article.pmid);
            } else {
                return [...prevSelected, article];
            }
        });
    };

    const handleSummarize = () => {
        if (selectedArticles.length === 0) {
            alert('Please select at least one article to summarize.');
            return;
        }
        navigate('/summarize', { state: { articles: selectedArticles } });
    };

    return (
        <div className="research-container">
            <button onClick={handleHomePress} className="res-home-button">
                <ChevronLeft size={20} />
            </button>
            <h1>PubMed Article Search</h1>

            {/* Unified Search Bar and Button */}
            <div className="search-bar1">
                <input
                    type="text"
                    placeholder="Search for research articles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={handleKeyPress}
                />
                <button onClick={() => handleSearch()} disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </div>

            {
                error && (
                    <div className="error">
                        <p>{error}</p>
                    </div>
                )
            }

            {articlesOpen && (
                <div className="action-buttons">
                    <button onClick={handleSummarize} disabled={selectedArticles.length === 0} className="summarize-button">
                        <FileText size={20} />
                        Summarize Selected ({selectedArticles.length})
                    </button>
                </div>
            )}
            <div className="results-container">
                {loading && <div className="loading">Loading...</div>}
                {results.map((article, index) => (
                    <div key={index} className="article-box">
                        <input
                            type="checkbox"
                            checked={selectedArticles.some(a => a.pmid === article.pmid)}
                            onChange={() => toggleArticleSelection(article)}
                        />
                        <h3>{article.title}</h3>
                        <p>Author(s): {article.author}</p>
                        <p>{article.abstract}</p>
                        <a href={article.url} target="_blank" rel="noopener noreferrer">
                            Read Article
                        </a>
                        <button className='addprojectbtn' onClick={() => addToProject(article)}>
                            Add to Project
                        </button>

                    </div>
                ))}
            </div>

            {
                totalResults > RESULTS_PER_PAGE && (
                    <div className="pagination">
                        <button
                            onClick={() => handleSearch(currentPage - 1)}
                            disabled={currentPage === 1 || loading}
                        >
                            Previous
                        </button>
                        <span>Page {currentPage} of {Math.ceil(totalResults / RESULTS_PER_PAGE)}</span>
                        <button
                            onClick={() => handleSearch(currentPage + 1)}
                            disabled={currentPage * RESULTS_PER_PAGE >= totalResults || loading}
                        >
                            Next
                        </button>
                    </div>
                )
            }

            {
                showPopup && (
                    <ProjectPopup
                        projects={userProjects}
                        onSelectProject={handleSelectProject}
                        onClose={() => setShowPopup(false)}
                    />
                )
            }
        </div >
    );
};

export default Research;
