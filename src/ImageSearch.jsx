import React, { useState } from 'react';
import axios from 'axios';
import './ImageSearch.css';

const ImageSearch = () => {
    const [topic, setTopic] = useState('');
    const [images, setImages] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);

    const handleSearch = async () => {
        if (topic.trim().length === 0) {
            alert('Please enter a search topic.');
            return;
        }

        try {
            const response = await axios.post('http://localhost:3000/api/images', { topic });
            setImages(response.data.images);
        } catch (error) {
            console.error('Error fetching images:', error.response?.data || error.message);
            alert('Error fetching images. Please try again.');
        }
    };

    const handleSelectImage = (image) => {
        setSelectedImage(image);
    };

    return (
        <div>
            <h1>Image Search</h1>
            <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter topic"
            />
            <button onClick={handleSearch}>Search Images</button>

            <div style={{ marginTop: '20px' }}>
                <h2>Image Results:</h2>
                {images.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {images.map((image, index) => (
                            <div key={index} style={{ cursor: 'pointer' }}>
                                <img
                                    src={image}
                                    alt={`Result ${index}`}
                                    onClick={() => handleSelectImage(image)}
                                    style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>No images found.</p>
                )}
            </div>

            {selectedImage && (
                <div style={{ marginTop: '20px' }}>
                    <h2>Selected Image:</h2>
                    <div
                        style={{
                            border: '2px solid black',
                            padding: '10px',
                            display: 'inline-block'
                        }}
                    >
                        <img src={selectedImage} alt="Selected" style={{ maxWidth: '100%' }} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageSearch;