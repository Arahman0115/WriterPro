import React, { useState } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import './FigureExplanation.css';
import { useNavigate } from 'react-router-dom';

const ExplanationText = styled.div`
  font-family: Arial, sans-serif;
  line-height: 1.6;
  color: #e0e0e0;

  h1, h2, h3, h4, h5, h6 {
    color: #1882fc;
    margin-top: 20px;
    margin-bottom: 10px;
  }

  p {
    margin-bottom: 15px;
  }

  ul, ol {
    margin-bottom: 15px;
    padding-left: 20px;
  }

  li {
    margin-bottom: 5px;
  }

  strong {
    color: #1882fc;
  }
`;

const FigureExplanation = () => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [explanation, setExplanation] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleExplain = async () => {
        if (!selectedImage) {
            alert('Please select an image first.');
            return;
        }

        setLoading(true);
        setExplanation('');

        try {
            const formData = new FormData();
            formData.append('image', selectedImage);

            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/explain-figure`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setExplanation(formatExplanation(response.data.explanation));
        } catch (error) {
            console.error('Error explaining figure:', error);
            setExplanation('Failed to generate explanation. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatExplanation = (text) => {
        // Replace markdown-style headers with HTML headers
        text = text.replace(/#{1,6}\s?([^\n]+)/g, (match, p1, offset, string) => {
            const level = match.trim().split(' ')[0].length;
            return `<h${level}>${p1}</h${level}>`;
        });

        // Replace ** or __ with <strong> tags
        text = text.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');

        // Replace * or _ with <em> tags
        text = text.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');

        // Replace newlines with <br> tags
        text = text.replace(/\n/g, '<br>');

        return text;
    };

    return (
        <div className="figure-explanation-container">
            <button onClick={() => navigate('/homepage')} className="back-button">Back</button>
            <h1>Figure Explanation</h1>
            <div className="image-upload-section">
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    id="image-upload"
                />
                <label htmlFor="image-upload" className="upload-button">
                    Select Image
                </label>
                {imagePreview && (
                    <div className="image-preview">
                        <img src={imagePreview} alt="Selected figure" />
                    </div>
                )}
            </div>
            <button
                onClick={handleExplain}
                disabled={!selectedImage || loading}
                className="explain-button"
            >
                {loading ? 'Explaining...' : 'Explain Figure'}
            </button>
            {explanation && (
                <div className="explanation-box">
                    <h2>Explanation:</h2>
                    <ExplanationText dangerouslySetInnerHTML={{ __html: explanation }} />
                </div>
            )}
        </div>
    );
};

export default FigureExplanation;
