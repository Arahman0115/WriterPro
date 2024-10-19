import React from 'react';
import './ProjectPopup.css'; // Add your styles here

const ProjectPopup = ({ projects, onSelectProject, onClose }) => {
    return (
        <div className="popup-overlay">
            <div className="popup-content">
                <h2>Select a Project</h2>
                <ul>
                    {projects.map((project) => (
                        <li key={project.id} onClick={() => onSelectProject(project)}>
                            {project.title}
                        </li>
                    ))}
                </ul>
                <button onClick={onClose}>Close</button>
            </div>
        </div>
    );
};

export default ProjectPopup;