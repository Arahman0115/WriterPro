import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './HomePage.css';

import { auth, db } from './firebase'; // Adjust the path based on your project structure
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from './AuthContext'; // Import the useAuth hook
import Spinner from './Spinner';
import UserDropdown from './UserDropdown';
import writerlogo from './writerlogo.webp';
import wbg from './wbg.png';
import MoreVertIcon from '@mui/icons-material/MoreVert';



const HomePage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth(); // Access currentUser from AuthContext
  const [searchTerm, setSearchTerm] = useState('');
  const [projects, setProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Load projects from Firestore and handle potential errors
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const projectsCollection = collection(db, `users/${user.uid}/projects`);
          const snapshot = await getDocs(projectsCollection);
          const fetchedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setProjects(fetchedProjects);
        } else {
          setProjects([]); // No user signed in
        }
      } catch (error) {
        console.error('Error loading projects from Firestore:', error);
        setProjects([]);
      } finally {
        setTimeout(() => setLoading(false), 500); // Delay for 2 seconds before setting loading to false
      }
    };

    loadProjects();
  }, []);

  const handleProjectClick = (project) => {
    navigate('/writer', { state: { project } });
  };
  const handleResearchClick = () => {
    navigate('/research');
  };
  const handleNewProjectClick = () => {
    console.log("New Project button clicked");

    // Navigate to writer without creating a new document in Firestore
    navigate('/writer', { state: { project: { title: '', sections: { Template: { content: '' } } } } });
  };

  const handleGeneralSearchClick = () => {
    navigate('/general-search');
  };

  const handleDeleteClick = (index) => {
    setDeleteIndex(index);
    setIsModalOpen(true);
  };
  const handleSemanticSearchClick = () => {
    navigate('/semantic-search');
  };

  const handleConfirmDelete = async () => {
    const projectToDelete = projects[deleteIndex];
    const user = auth.currentUser;
    if (user) {
      await deleteDoc(doc(db, `users/${user.uid}/projects`, projectToDelete.id));
      const updatedProjects = projects.filter((_, index) => index !== deleteIndex);
      setProjects(updatedProjects);
      setIsModalOpen(false);

      setTimeout(() => setFeedbackMessage(''), 5000);
    }
  };

  const handleCancelDelete = () => {
    setIsModalOpen(false);
  };

  const handleEllipsisClick = (e, index) => {
    e.stopPropagation();
    setActiveDropdown(activeDropdown === index ? null : index);
  };

  const handleDeleteOption = (e, index) => {
    e.stopPropagation();
    setDeleteIndex(index);
    setIsModalOpen(true);
    setActiveDropdown(null);
  };

  const filteredProjects = projects.filter((project) =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const templateData = [
    {
      name: "Blank Document",
      onClick: handleNewProjectClick,
    },
    {
      name: "Research with PubMed",
      onClick: handleResearchClick,
    },
    {
      name: "General Search",
      onClick: handleGeneralSearchClick,
    },
    {
      name: "Semantic Search",
      onClick: handleSemanticSearchClick,
    },


    // Add more templates as needed
  ];

  return (
    <div className="homepage-container">
      <header className="navbar">
        <div className='titlelogo'>
          <img src={wbg} alt="Home" className="home-icon1" />
          <h1 className='writerprotitle'>WriterPro</h1>
        </div>

        <div className="navbar-middle">

          <input
            type="text"
            className="search-bar"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

        </div>

        <div className="navbar-right">
          <div className="usernamebox">
            <span className="user-name"><span>Welcome, </span>{currentUser?.displayName || currentUser?.email}</span>
          </div>
          <div className="user-dropdown-container" style={{ position: 'relative' }}> {/* Add this wrapper */}
            <UserDropdown />
          </div>
        </div>
      </header>

      {feedbackMessage && <div className="feedback-message">{feedbackMessage}</div>}

      <section className="template-section">
        <div className="template-grid">
          {templateData.map((template, index) => (
            <div
              key={index}
              className="template-card"
              onClick={template.onClick}
            >
              <h3>{template.name}</h3>
            </div>
          ))}
        </div>
      </section>

      <section className="recent-documents-section">
        <div className="recent-documents-header">
          <h2>Recent Documents</h2>
        </div>
        <div className="recent-documents-content">
          <div className="projects-grid">
            {loading ? (
              <div className="spinner-container">
                <Spinner />
              </div>
            ) : filteredProjects.length === 0 ? (
              <p>No projects found. Click "New Blank Document" to create a new project.</p>
            ) : (
              filteredProjects.map((project, index) => (
                <div key={project.id} className="project-card" onClick={() => handleProjectClick(project)}>
                  <p>
                    {project.sections?.Template?.content
                      ? project.sections.Template.content.slice(0, 500)
                      : "No content available"}
                    ...
                  </p>
                  <div className="bottom-doc">
                    <div className="bottom-doc-content">
                      <h2>{project.title || 'Untitled Project'}</h2>
                      <p>Last edited: {new Date(project.lastEdited).toLocaleDateString()}</p>
                    </div>
                    <div className="dropdown-container">
                      <button className="ellipsis-button" onClick={(e) => handleEllipsisClick(e, index)}>
                        <MoreVertIcon />
                      </button>
                      <div className="dropdown-menu">
                        <button onClick={(e) => handleDeleteOption(e, index)}>Delete</button>
                        {/* Add more options here as needed */}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <h2 id="modal-title">Confirm Delete</h2>
            <p>Are you sure you want to delete this project?</p>
            <button className="confirm-btn" onClick={handleConfirmDelete}>Yes, Delete</button>
            <button className="cancel-btn" onClick={handleCancelDelete}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
