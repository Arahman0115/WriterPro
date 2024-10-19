import React, { useState } from 'react';
import PropTypes from 'prop-types';  // Import PropTypes for type-checking
import './Toolbar.css';
import homeIcon from './home-icon.jpg'; // Import your home icon image
import { useNavigate } from 'react-router-dom';

const Toolbar = ({ onNewClick, onSaveClick, onDownloadClick, onExportWordClick, onShowArticlesClick, onCitationMangerClick }) => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const navigate = useNavigate();

  // Toggle dropdown menu
  const handleDropdown = (menu) => {
    setActiveDropdown(activeDropdown === menu ? null : menu);
  };

  return (
    <div className="toolbar-container">
      <div className="toolbar">
        {/* Home Icon */}
        <div className="menu-item" onClick={() => navigate('/')}>
          <img src={homeIcon} alt="Home" className="home-icon" />
        </div>

        {/* File Menu */}
        <div
          className="menu-item"
          onMouseEnter={() => handleDropdown('file')}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          File
          {activeDropdown === 'file' && (
            <div className="dropdown">
              <button onClick={onNewClick}>New</button>
              <button onClick={() => alert('Open clicked')}>Open</button>
              <button onClick={onSaveClick}>Save</button>
              <button onClick={onDownloadClick}>Export as Plain Text</button>
              <button onClick={onExportWordClick}>Export as Word Doc</button>
            </div>
          )}
        </div>

        {/* Edit Menu */}
        <div
          className="menu-item"
          onMouseEnter={() => handleDropdown('edit')}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          Edit
          {activeDropdown === 'edit' && (
            <div className="dropdown">
              <button onClick={() => alert('Undo clicked')}>Undo</button>
              <button onClick={() => alert('Redo clicked')}>Redo</button>
              <button onClick={() => alert('Cut clicked')}>Cut</button>
              <button onClick={() => alert('Copy clicked')}>Copy</button>
              <button onClick={() => alert('Paste clicked')}>Paste</button>
            </div>
          )}
        </div>

        {/* Format Menu */}
        <div
          className="menu-item"
          onMouseEnter={() => handleDropdown('format')}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          Format
          {activeDropdown === 'format' && (
            <div className="dropdown">
              <button onClick={() => onFormat('bold')}>Bold</button>
              <button onClick={() => onFormat('italic')}>Italic</button>
              <button onClick={() => onFormat('underline')}>Underline</button>
              <button onClick={() => onFormat('strikethrough')}>Strikethrough</button>
            </div>

          )}

        </div>
        <div
          className="menu-item"
          onMouseEnter={() => handleDropdown('citation')}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          Citation Manager
          {activeDropdown === 'citation' && (
            <div className="dropdown">
              <button onClick={onCitationMangerClick}>Create Citation List</button>

            </div>

          )}

        </div>
        <button className='showarticlesbutton' onClick={onShowArticlesClick} > Articles</button>
      </div>
    </div>
  );
};

// Define propTypes for the component
Toolbar.propTypes = {
  onFormat: PropTypes.func.isRequired, // Ensure onFormat is a required function
};

export default Toolbar;
