import React, { useState } from 'react';
import './DemoPage.css';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, User, Bot, Settings, Zap } from 'lucide-react';

const DemoPage = () => {
    const [activePanel, setActivePanel] = useState(null);
    const navigate = useNavigate();

    const togglePanel = (panel) => {
        setActivePanel(activePanel === panel ? null : panel);
    };

    const goToLandingPage = () => {
        navigate('/HomePage')
    }

    return (
        <div className="demo-container">
            <div className="demo-header-container">
                <button className='homebutton' onClick={goToLandingPage}>
                    <ChevronLeft size={20} />
                </button>
                <h1 className="demo-header">WriterPro Documentation</h1>
            </div>
            <p className="demo-description">Discover the power of AI-assisted writing with WriterPro. Explore our features below.</p>

            <div className="panel-container">
                <div className="panel">
                    <div className="panel-title" onClick={() => togglePanel('about')}>
                        <User size={20} />
                        <span>About WriterPro</span>
                    </div>
                    {activePanel === 'about' && (
                        <div className="panel-content">
                            <p>WriterPro harnesses the power of Artificial Intelligence to revolutionize your writing process. Our AI assistant provides contextual text completions, customized templates, and intelligent suggestions to elevate your writing.</p>
                            <ul>
                                <li>AI-powered writing assistance</li>
                                <li>Contextual suggestions</li>
                                <li>Custom templates</li>
                                <li>Intelligent text completion</li>
                            </ul>
                        </div>
                    )}
                </div>

                <div className="panel">
                    <div className="panel-title" onClick={() => togglePanel('howToUse')}>
                        <Bot size={20} />
                        <span>How to Use</span>
                    </div>
                    {activePanel === 'howToUse' && (
                        <div className="panel-content">
                            <p>Unlock WriterPro's features with simple commands:</p>
                            <ul>
                                <li><code>@template</code> - Generate a custom template</li>
                                <li><code>@translate</code> - Translate your text</li>
                                <li><code>@summary</code> - Summarize your content</li>
                            </ul>
                            <p>The AI will process your request and display the result in the Assistant box. To insert the output into your essay, simply press the Tab key.</p>
                        </div>
                    )}
                </div>

                <div className="panel">
                    <div className="panel-title" onClick={() => togglePanel('features')}>
                        <Zap size={20} />
                        <span>Key Features</span>
                    </div>
                    {activePanel === 'features' && (
                        <div className="panel-content">
                            <ul>
                                <li>AI-powered writing assistance</li>
                                <li>Custom template generation</li>
                                <li>Text translation</li>
                                <li>Content summarization</li>
                                <li>Intelligent text completion</li>
                                <li>Real-time writing suggestions</li>
                            </ul>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default DemoPage;
