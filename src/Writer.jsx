import React, { useState, useRef, useEffect, useCallback } from 'react';
import './Writer.css';
import Toolbar from './Toolbar';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useLocation } from 'react-router-dom';
import { db, auth } from './firebase';
import { collection, addDoc, setDoc, getDocs, doc } from 'firebase/firestore';
import { debounce } from 'lodash';
import Spinner from './Spinner';
import MainBox from './MainBox';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveContent } from './contentManager';


const formatCitation = (citation) => {
  const { title, author, url } = citation;
  let formattedAuthor = author;

  // Check if the author name contains a comma
  if (author.includes(',')) {
    const [lastName, firstNamePart] = author.split(',');
    const firstName = firstNamePart ? firstNamePart.trim().split(' ')[0] : '';
    formattedAuthor = `${lastName.trim()}, ${firstName}`;
  } else {
    // If there's no comma, assume it's in "First Last" format
    const nameParts = author.split(' ');
    if (nameParts.length > 1) {
      formattedAuthor = `${nameParts[nameParts.length - 1]}, ${nameParts[0]}`;
    }
    // If it's a single word, use it as is
  }

  return `${formattedAuthor}. "${title}." ${url}`;
};

const Writer = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isTitleSet, setIsTitleSet] = useState(false);
  const [sectionOrder, setSectionOrder] = useState([]);
  const [suggestion, setSuggestion] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [activeSection, setActiveSection] = useState('Introduction');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [wordSuggestions, setWordSuggestions] = useState([]);
  const [isArticlesVisible, setIsArticlesVisible] = useState(false); // State for the articles panel
  const [articles, setArticles] = useState([]); // State for storing articles
  const [isSidePanelVisible, setIsSidePanelVisible] = useState(false);
  const [styledBlocks, setStyledBlocks] = useState([]);


  const navigate = useNavigate();
  const [sections, setSections] = useState({
    Introduction: { id: 'section-1', content: '' },
    Body: { id: 'section-2', content: '' },
    Conclusion: { id: 'section-3', content: '' }
  });
  const [newSection, setNewSection] = useState('');
  const location = useLocation();
  const user = auth.currentUser;
  const suggestionTimeoutRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const query = new URLSearchParams(location.search);
  const template = query.get('template');

  useEffect(() => {
    const fetchArticles = async () => {
      const project = location.state?.project;
      console.log('Current project:', project); // Debugging line
      if (user && project) {
        try {
          const articlesCollection = collection(db, `users/${user.uid}/projects/${project.id}/researcharticles`);
          const articlesSnapshot = await getDocs(articlesCollection);
          console.log('Articles snapshot:', articlesSnapshot); // Debugging line
          const articlesList = articlesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setArticles(articlesList);
        } catch (error) {
          console.error("Error fetching articles: ", error);
        }
      }
    };

    fetchArticles();
  }, [user, location.state?.project]);

  useEffect(() => {
    const fetchSectionOrder = async () => {
      const project = location.state?.project;
      if (project) {
        const { title, sections, sectionOrder, articles } = project;
        setTitle(title);
        setSections(sections);
        setSectionOrder(sectionOrder || Object.keys(sections)); // Use stored sectionOrder if available
        setIsTitleSet(!!title);
        setArticles(articles || []);
      } else {
        // Fetch from Firestore if project isn't found in location.state
        const db = getFirestore();
        const docRef = doc(db, "collectionName", "docId"); // Replace with your collection/doc ID
        const docSnap = await getDocs(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setSections(data.sections);
          setSectionOrder(data.sectionOrder || Object.keys(data.sections));
          // ... set other state variables
        } else {
          console.log("No such document!");
          // Set default if Firestore fails
          setSectionOrder(['Introduction', 'Body', 'Conclusion']);
        }
      }
    };

    fetchSectionOrder();
  }, [location]);


  const handleExportAsMicrosoftWord = () => {
    const content = combineSections(); // Combine all section contents

    // Create a new document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun(content),
              ],
            }),
          ],
        },
      ],
    });

    // Generate the Word document and save it
    Packer.toBlob(doc).then(blob => {
      saveAs(blob, `${title || 'Untitled'}.docx`);
    });
  };





  const handleDownload = () => {
    const content = combineSections(); // Combine all section contents
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'Untitled'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);  // Clean up
    URL.revokeObjectURL(url);  // Free up memory
  };
  // Debounced content saving to Firebase
  // Debounced content saving to Firebase
  const saveContent = useCallback(
    debounce(async (user, project, updatedSections, sectionOrder, title, articles) => {
      const currentProject = {
        title,
        sections: updatedSections,
        sectionOrder,
        lastEdited: Date.now(),
        articles
      };

      if (user) {
        try {
          if (project?.id) {
            const docRef = doc(db, `users/${user.uid}/projects`, project.id);
            await setDoc(docRef, currentProject, { merge: true });
            setTimeout(() => setFeedbackMessage('Saved'), 5000); // 5 second delay
          } else {
            const newDocRef = await addDoc(collection(db, `users/${user.uid}/projects`), currentProject);
            navigate(`/writer`, { state: { project: { ...currentProject, id: newDocRef.id } } });
            setTimeout(() => setFeedbackMessage('Saved'), 5000); // 5 second delay
          }
        } catch (e) {
          console.error("Error saving document: ", e);
          setFeedbackMessage('Error saving');
        }
      } else {
        console.log('User is not authenticated');
        setFeedbackMessage('Not logged in');
      }
    }, 4000),
    [navigate]
  );
  // Handle text change and word suggestions
  const handleChange = (e) => {
    const value = e.target.value;
    const updatedSections = {
      ...sections,
      [activeSection]: { ...sections[activeSection], content: value },
    };
    setSections(updatedSections);
    setIsEditing(true);
    setFeedbackMessage('Editing...');

    // Detect trigger words and create styled blocks
    const triggerWords = ['@template', '@summarize'];
    const words = value.split(' ');
    const newStyledBlocks = [];

    words.forEach((word, index) => {
      if (triggerWords.includes(word.toLowerCase())) {
        newStyledBlocks.push({
          word,
          start: value.indexOf(word),
          end: value.indexOf(word) + word.length,
        });
      }
    });

    setStyledBlocks(newStyledBlocks);
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }

    suggestionTimeoutRef.current = setTimeout(() => {
      setIsEditing(false);
      handleTextCompletion(value);
    }, 4000);

    // Clear the previous save timeout if it exists
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set a new save timeout for 4 seconds
    saveTimeoutRef.current = setTimeout(() => {
      saveContent(user, location.state?.project, updatedSections, sectionOrder, title, articles);
      setFeedbackMessage('Saving...');
      console.log('Saving changes...');
    }, 4000);
  };

  const handleTextCompletion = async (prompt) => {
    if (!prompt.trim()) {
      setSuggestion('');
      return;
    }
    try {
      const response = await fetch('http://localhost:3000/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (response.ok && data.message) {
        setSuggestion(data.message);
      } else {
        setSuggestion('');
        console.error('Error or missing message in response:', data);
      }
    } catch (error) {
      setSuggestion('');
      console.error('Error fetching prediction:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab' && suggestion) {
      e.preventDefault();
      const currentContent = sections[activeSection].content;
      const words = currentContent.split(' ');

      // Check if the last word is a trigger
      const lastWord = words[words.length - 1].trim();


      // If no trigger word, append the suggestion
      words.push(suggestion);


      const updatedSections = {
        ...sections,
        [activeSection]: {
          ...sections[activeSection],
          content: words.join(' ') + ' ',
        },
      };
      setSections(updatedSections);

      setSuggestion('');
    }
  };

  const handleTitleBlur = () => {
    if (title.trim()) {
      setIsTitleEditing(false);
      setIsTitleSet(true);

    }
  };
  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleBlur();

    }
  };

  // Switch sections
  const switchSection = (sectionName) => {
    if (sections[sectionName]) {
      setActiveSection(sectionName);
      setTimeout(() => saveContent(user, location.state?.project, sections, sectionOrder, title, articles), 1000);
    }
  };

  // Handle section drag-and-drop
  const gotowriter = () => {
    navigate('/writer', { state: { project: null } }); // or simply omit state if not needed
  }

  // Add a new section
  const handleCitationManagerClick = () => {
    if (user && location.state?.project) {
      const { project } = location.state;
      const citations = project.articles.map(article => ({
        title: article.title,
        author: article.author,
        url: article.url
      }));

      const mlaCitations = citations.map(formatCitation);
      const citationsContent = mlaCitations.join('\n\n');

      // Use handleAddSection to add or update the "Citations" section
      handleAddSection('Citations', citationsContent);
    }
  };

  const handleAddSection = (sectionName, content = '') => {
    if (sectionName.trim()) {
      if (sections[sectionName]) {
        // Update the existing section with new content
        const updatedSections = {
          ...sections,
          [sectionName]: {
            ...sections[sectionName],
            content: `${sections[sectionName].content}\n\n${content}` // Append new content
          }
        };
        setSections(updatedSections);
      } else {
        // Create a new section if it doesn't exist
        const newId = `section-${Object.keys(sections).length + 1}`;
        const updatedSections = {
          ...sections,
          [sectionName]: { id: newId, content: content }
        };
        setSections(updatedSections);
        setSectionOrder([...sectionOrder, sectionName]);
      }
      setNewSection('');
      // Set the active section to the newly added or updated section
      setActiveSection(sectionName);
    }
  };
  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(sectionOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSectionOrder(items);

    // Save the updated order
    saveContent(user, location.state?.project, sections, items, title, articles);
  };

  const toggleArticlesVisibility = () => {
    setIsArticlesVisible(prevState => !prevState);
  };

  return (
    <div className="writer-container">
      <div className="writer" style={{ transform: 'scale(0.95)', transformOrigin: 'center' }}>
        <div className='feedbackbox'>
          {feedbackMessage && <div className="feedback-message">{feedbackMessage}</div>}
        </div>
        <div className="title-section">
          {isTitleEditing ? (
            <input
              type="text"
              className="title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              autoFocus
            />
          ) : (
            <h2 className="project-title" onClick={() => setIsTitleEditing(true)}>
              {title || 'Click to set title'}
            </h2>
          )}
        </div>
        <textarea
          className="writing-area"
          placeholder={`Write your ${activeSection} here...`}
          value={sections[activeSection]?.content || ''}
          onChange={handleChange}
          onKeyDown={(e) => e.key === 'Tab' && suggestion && handleKeyDown(e)}
          disabled={!isTitleSet}
        />
        <div className="character-count">
          Character Count: {(sections[activeSection]?.content || '').replace(/\s+/g, '').length}
        </div>
      </div>
      <div className='outlinenassistant'>
        <div>
          <div className="suggestion-overlay">
            <h2 className='sugtitle'>WriterPro Assistant</h2>
            {!isEditing && suggestion && <span className="suggestion">{suggestion}</span>}
            <div className='spinnerbox'>
              {isEditing && <Spinner />}
            </div>
          </div>
        </div>
        <div className="outline-box">
          <h2>Outline</h2>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="outline">
              {(provided) => (
                <ul {...provided.droppableProps} ref={provided.innerRef}>
                  {sectionOrder.map((name, index) => (
                    <Draggable key={name} draggableId={name} index={index}>
                      {(provided) => (
                        <li
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          onClick={() => switchSection(name)}
                        >
                          {name}
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          </DragDropContext>
          <div className="new-section">
            <input
              type="text"
              placeholder="Add new section..."
              value={newSection}
              onChange={(e) => setNewSection(e.target.value)}
            />
            <button onClick={() => handleAddSection(newSection)}>Add</button>
          </div>
        </div>
      </div>
      <Toolbar
        onNewClick={() => gotowriter()}
        onSaveClick={() => saveContent(user, location.state?.project, sections, sectionOrder, title, articles)}
        onDownloadClick={handleDownload}
        onExportWordClick={handleExportAsMicrosoftWord}
        onShowArticlesClick={toggleArticlesVisibility}
        onCitationMangerClick={handleCitationManagerClick}
      />
      <div className={`side-panel ${isArticlesVisible ? 'visible' : ''}`}>
        <h2>Research Articles</h2>
        {articles.length > 0 ? (
          <ul>
            {articles.map((article) => (
              <div key={article.id} className='articlebox'>
                <li>
                  <a href={article.url} target="_blank" rel="noopener noreferrer">
                    {article.title}
                  </a>
                  <a href={article.url} target="_blank" rel="noopener noreferrer">
                    {article.url}
                  </a>
                  <a href={article.author} target="_blank" rel="noopener noreferrer">
                    {article.author}
                  </a>
                </li>
              </div>
            ))}
          </ul>
        ) : (
          <p>No articles found.</p>
        )}
      </div>
    </div>
  );
};

export default Writer;
