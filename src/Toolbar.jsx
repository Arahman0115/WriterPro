import React, { useState } from 'react';
import PropTypes from 'prop-types';  // Import PropTypes for type-checking
import './Toolbar.css';
import homeIcon from './home-icon.jpg'; // Import your home icon image
import { useNavigate } from 'react-router-dom';
import wbg from './wbg.png';

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
          <img src={wbg} alt="Home" className="home-icon" />
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
              <button onClick={onSaveClick}>Save</button>
              <button onClick={onDownloadClick}>Export as Plain Text</button>
              <button onClick={onExportWordClick}>Export as Word Doc</button>
            </div>
          )}
        </div>

        {/* Edit Menu */}


        {/* Format Menu */}

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
