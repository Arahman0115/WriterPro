import React, { useState } from 'react';
import './MainBox.css';

const MainBox = ({ essayContent }) => {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Function to call your server's /api/predict endpoint
    const handleAskQuestion = async () => {
        if (!question.trim()) return;

        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:3000/api/mainbox', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: `Here is my essay content:\n\n${essayContent}\n\nNow, here is my question: ${question}`
                }),
            });

            const data = await response.json();

            if (response.ok && data.message) {
                setAnswer(data.message);
            } else {
                setAnswer('Sorry, I couldn’t understand the question or generate a response.');
            }
        } catch (error) {
            console.error('Error fetching answer from the server:', error);
            setAnswer('Error fetching the answer.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mainbox-container">
            <h3>Ask a question about your essay</h3>
            <textarea
                className="question-input"
                placeholder="Type your question here..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
            />
            <button onClick={handleAskQuestion} disabled={isLoading}>
                {isLoading ? 'Asking...' : 'Ask'}
            </button>

            <h4>Answer:</h4>
            <textarea
                className="answer-box"
                placeholder="The answer will appear here..."
                value={answer}
                readOnly
            />
        </div>
    );
};

export default MainBox;
