import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Summarize.css';
import { ChevronLeft } from 'lucide-react';

const API_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
const PMC_API_URL = 'https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/';

const Summarize = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [articles, setArticles] = useState([]);
    const [summaries, setSummaries] = useState({});
    const [loading, setLoading] = useState({});
    const [pastedContent, setPastedContent] = useState({});

    useEffect(() => {
        if (location.state?.articles) {
            setArticles(location.state.articles);
        }
    }, [location]);

    const fetchFullText = async (pmid) => {
        try {
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
                const fullTextResponse = await axios.get(`${PMC_API_URL}${pmcid}/unicode`);
                return fullTextResponse.data.passages.map(passage => passage.text).join(' ');
            }
        } catch (error) {
            console.error("Error fetching full text:", error);
        }
        return null;
    };

    const handleSummarize = async (article) => {
        setLoading(prev => ({ ...prev, [article.pmid]: true }));
        try {
            let textToSummarize;

            // Try to fetch full text first
            const fullText = await fetchFullText(article.pmid);
            if (fullText) {
                textToSummarize = fullText;
            } else if (pastedContent[article.pmid]) {
                // If full text is not available, use pasted content
                textToSummarize = pastedContent[article.pmid];
            } else {
                // If neither full text nor pasted content is available, use abstract
                textToSummarize = article.abstract;
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/summarize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': import.meta.env.VITE_CLIENT_URL || 'http://localhost:5173'
                },
                body: JSON.stringify({ text: textToSummarize }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.summary) {
                setSummaries(prev => ({ ...prev, [article.pmid]: data.summary }));
            } else {
                throw new Error('No summary received from the server');
            }
        } catch (error) {
            console.error('Error fetching summary:', error);
            setSummaries(prev => ({ ...prev, [article.pmid]: 'Failed to generate summary.' }));
            alert('Failed to get summary. Please try again later.');
        } finally {
            setLoading(prev => ({ ...prev, [article.pmid]: false }));
        }
    };

    return (
        <div className="summarize-container">
            <button onClick={() => navigate(-1)} className="back-button">
                <ChevronLeft size={20} />
                Back to Research
            </button>
            <h1>Article Summaries</h1>
            {articles.map((article) => (
                <div key={article.pmid} className="article-summary">
                    <h2>{article.title}</h2>
                    <p><strong>Authors:</strong> {article.author}</p>
                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="read-article-btn">
                        Read Article
                    </a>
                    <textarea
                        value={pastedContent[article.pmid] || ''}
                        onChange={(e) => setPastedContent(prev => ({ ...prev, [article.pmid]: e.target.value }))}
                        placeholder="Paste the full article content here..."
                    />
                    <button
                        onClick={() => handleSummarize(article)}
                        disabled={loading[article.pmid]}
                    >
                        {loading[article.pmid] ? 'Summarizing...' : 'Generate Summary'}
                    </button>
                    {summaries[article.pmid] && (
                        <div className="summary-box">
                            <h3>Summary:</h3>
                            <p>{summaries[article.pmid]}</p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default Summarize;
