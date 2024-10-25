import React, { useState, useEffect } from 'react';
import { Editor, EditorState, ContentState } from 'draft-js';
import 'draft-js/dist/Draft.css';
import './DocumentEditor.css';

const DocumentEditor = ({ content, onChange }) => {
    const [pages, setPages] = useState([EditorState.createEmpty()]);

    useEffect(() => {
        if (content) {
            const contentState = ContentState.createFromText(content);
            setPages([EditorState.createWithContent(contentState)]);
        }
    }, [content]);

    const handlePageChange = (index, newEditorState) => {
        const newPages = [...pages];
        newPages[index] = newEditorState;
        setPages(newPages);
        onChange(newPages[0].getCurrentContent().getPlainText());
    };

    return (
        <div className="document-container">
            <div className="pages-container">
                {pages.map((pageEditorState, index) => (
                    <div key={index} className="page">
                        <div className="page-content">
                            <Editor
                                editorState={pageEditorState}
                                onChange={(editorState) => handlePageChange(index, editorState)}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DocumentEditor;
