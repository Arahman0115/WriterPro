import React, { useState } from 'react';
import './DemoPage.css';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
const DemoPage = () => {
    // State to control which panel is open
    const [activePanel, setActivePanel] = useState(null);
    const navigate = useNavigate();
    // Function to toggle panel visibility
    const togglePanel = (panel) => {
        setActivePanel(activePanel === panel ? null : panel);
    };
    const goToLandingPage = () => {
        navigate('/HomePage')
    }
    return (
        <div className="demo-container">
            <button className='homebutton' onClick={goToLandingPage}>
                <ChevronLeft size={20} />
            </button>
            <h1 className="demo-header">Docs</h1>
            <p className="demo-description">Explore the features of WriterPro by clicking the panels below.</p>

            <div className="panel-container">
                {/* About Panel */}
                <div className="panel">
                    <div className="panel-title" onClick={() => togglePanel('about')}>
                        About
                    </div>
                    {activePanel === 'about' && (
                        <div className="panel-content">
                            <p>WriterPro takes advantage of Artificial Intelligence to help you create. It introduces an AI assistant that will contextually perform text completions, provide templates, and give suggestions on how to improve your writing. </p>
                        </div>
                    )}
                </div>

                {/* How to Use Panel */}
                <div className="panel">
                    <div className="panel-title" onClick={() => togglePanel('howToUse')}>
                        How to Use
                    </div>
                    {activePanel === 'howToUse' && (
                        <div className="panel-content">
                            <p>To initiate a specific task such as the creation of a template, translation, or summary, type
                                <li>
                                    @template
                                </li>
                                <li>
                                    @translate
                                </li>
                                <li>
                                    @summary
                                </li>The task will be completed, and the product will be displayed in the Assistant box.
                                To place the finished product into your essay, simply press tab.</p>
                        </div>
                    )}
                </div>




            </div>
        </div>
    );
};

export default DemoPage;
