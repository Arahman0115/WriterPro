import 'global';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import './Writer.css';
import Toolbar from './Toolbar';
import { useNavigate, useLocation } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { db, auth } from './firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { debounce } from 'lodash';
import Spinner from './Spinner';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveContent } from './contentManager';
import { Editor, EditorState, ContentState, Modifier, CompositeDecorator, getDefaultKeyBinding } from 'draft-js';
import 'draft-js/dist/Draft.css';


const formatCitation = (article) => {
  // Basic MLA format: Author(s). "Title of Source." Title of Container, Other contributors, Version, Number, Publisher, Publication Date, Location.
  let citation = '';

  // Author
  if (article.author) {
    citation += `${article.author}. `;
  }

  // Title
  if (article.title) {
    citation += `"${article.title}." `;
  }

  // We don't have all MLA fields, so we'll add what we have
  if (article.journal) {
    citation += `${article.journal}, `;
  }

  // Publication date (assuming it's available)
  if (article.publicationDate) {
    citation += `${article.publicationDate}, `;
  }

  // URL
  if (article.url) {
    citation += `${article.url}. `;
  }

  // Access date (current date)
  citation += `Accessed ${new Date().toLocaleDateString()}.`;

  return citation;
};

const Writer = () => {
  const [title, setTitle] = useState('');
  const [isTitleSet, setIsTitleSet] = useState(false);
  const [sectionOrder, setSectionOrder] = useState([]);
  const [suggestion, setSuggestion] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [activeSection, setActiveSection] = useState('Template');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isArticlesVisible, setIsArticlesVisible] = useState(false);
  const [articles, setArticles] = useState([]);
  const [previousSuggestions, setPreviousSuggestions] = useState([]);
  const [showSuggestionHistory, setShowSuggestionHistory] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const navigate = useNavigate();
  const [sections, setSections] = useState({
    Template: { id: 'section-1', content: EditorState.createEmpty() },
    Body: { id: 'section-2', content: EditorState.createEmpty() },
    Conclusion: { id: 'section-3', content: EditorState.createEmpty() }
  });
  const [newSection, setNewSection] = useState('');
  const location = useLocation();
  const user = auth.currentUser;
  const suggestionTimeoutRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  const triggerWordStrategy = (contentBlock, callback, contentState) => {
    const text = contentBlock.getText();
    const regex = /@(template|summarize)\b/gi;
    let matchArr, start;
    while ((matchArr = regex.exec(text)) !== null) {
      start = matchArr.index;
      callback(start, start + matchArr[0].length);
    }
  };

  const TriggerWordSpan = (props) => {
    return <span className="styled-block">{props.children}</span>;
  };

  const decorator = new CompositeDecorator([
    {
      strategy: triggerWordStrategy,
      component: TriggerWordSpan,
    },
  ]);

  useEffect(() => {
    const fetchArticles = async () => {
      const project = location.state?.project;
      if (user && project) {
        try {
          const articlesCollection = collection(db, `users/${user.uid}/projects/${project.id}/researcharticles`);
          const articlesSnapshot = await getDocs(articlesCollection);
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
        setTitle(title || '');
        setSections(Object.entries(sections).reduce((acc, [key, value]) => {
          acc[key] = {
            ...value,
            content: EditorState.createWithContent(
              ContentState.createFromText(value.content || ''),
              decorator
            )
          };
          return acc;
        }, {}));
        setSectionOrder(sectionOrder || ['Template', 'Body', 'Conclusion']);
        setActiveSection(sectionOrder?.[0] || 'Template');
        setIsTitleSet(!!title);
        setArticles(articles || []);
      }
    };

    fetchSectionOrder();
  }, [location.state?.project]);

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
  const handleChange = async (editorState) => {
    const updatedSections = {
      ...sections,
      [activeSection]: { ...sections[activeSection], content: editorState },
    };
    setSections(updatedSections);
    setIsEditing(true);
    setFeedbackMessage('Editing...');

    // Clear existing timeouts
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Handle text completion suggestion
    suggestionTimeoutRef.current = setTimeout(async () => {
      const currentContent = editorState.getCurrentContent().getPlainText();
      if (currentContent.trim()) {
        try {
          console.log('Sending request to:', import.meta.env.VITE_API_URL);
          
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/predict`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            credentials: 'include',
            mode: 'cors',
            body: JSON.stringify({
              text: currentContent.trim()
            })
          });

          console.log('Response status:', response.status);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Server error: ${response.status}`);
          }

          const data = await response.json();
          if (!data.suggestion) {
            throw new Error('No suggestion received from server');
          }

          setSuggestion(data.suggestion);
          setPreviousSuggestions(prev => [...prev, data.suggestion]);
          setIsEditing(false);
          setFeedbackMessage('Suggestion ready');
        } catch (error) {
          console.error('Error getting suggestion:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
          setIsEditing(false);
          setFeedbackMessage('Failed to get suggestion');
        }
      }
    }, 2000);

    // Handle saving
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const contentToSave = Object.entries(updatedSections).reduce((acc, [key, value]) => {
          acc[key] = {
            ...value,
            content: value.content.getCurrentContent().getPlainText()
          };
          return acc;
        }, {});

        const result = await saveContent(
          user,
          location.state?.project,
          contentToSave,
          sectionOrder,
          title,
          articles
        );

        // If this is a new document, update the location state without navigation
        if (result?.isNew) {
          window.history.replaceState(
            {
              ...window.history.state,
              usr: {
                ...window.history.state.usr,
                project: {
                  ...location.state?.project,
                  id: result.id,
                  sections: contentToSave,
                  title: title
                }
              }
            },
            ''
          );
        }

        setFeedbackMessage('Saving...');
        setTimeout(() => {
          setFeedbackMessage('Saved');
        }, 2000);
      } catch (error) {
        console.error('Error saving content:', error);
        setFeedbackMessage('Error saving content');
      }
    }, 4000);
};
  const keyBindingFn = (e) => {
    if (e.keyCode === 9 && !e.shiftKey && suggestion) { // 9 is the keyCode for Tab
      e.preventDefault();
      return 'insert-suggestion';
    }
    return getDefaultKeyBinding(e);
  };

  const handleTitleBlur = () => {
    setIsTitleEditing(false);
    if (title.trim() !== '') {
      setIsTitleSet(true);
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    }
  };

  const switchSection = (sectionName) => {
    if (sections[sectionName]) {
      setActiveSection(sectionName);
    } else {
      console.error(`Section ${sectionName} does not exist`);
      // Optionally, set a default section or show an error message
    }
  };

  const handleAddSection = (sectionName, content = '') => {
    if (sectionName && !sections[sectionName]) {
      setSections(prevSections => ({
        ...prevSections,
        [sectionName]: {
          id: `section-${Object.keys(prevSections).length + 1}`,
          content: EditorState.createWithContent(ContentState.createFromText(content))
        }
      }));
      setSectionOrder(prevOrder => [...prevOrder, sectionName]);
      setActiveSection(sectionName);
      setNewSection('');
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(sectionOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSectionOrder(items);
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

  const toggleArticlesVisibility = () => {
    setIsArticlesVisible(prevState => !prevState);
  };

  const handleCitationManagerClick = () => {
    if (articles.length > 0) {
      const mlaCitations = articles.map(formatCitation);
      const citationsContent = mlaCitations.join('\n\n');

      // Use handleAddSection to add or update the "Citations" section
      handleAddSection('Citations', citationsContent);

      // Switch to the newly created or updated Citations section
      switchSection('Citations');

      setFeedbackMessage('Citations added successfully!');
      setTimeout(() => setFeedbackMessage(''), 3000);
    } else {
      setFeedbackMessage('No articles available for citation.');
      setTimeout(() => setFeedbackMessage(''), 3000);
    }
  };
  const handleSave = useCallback(async (editorState) => {
    if (!user || !location.state?.project?.id) {
      console.error("Cannot save: missing user or project ID");
      setFeedbackMessage('Error: Cannot save document');
      return;
    }

    setIsEditing(true);

    // Clear any existing timeouts
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Update the sections state
    setSections(prevSections => ({
      ...prevSections,
      [activeSection]: { ...prevSections[activeSection], content: editorState },
    }));

    try {
      const contentToSave = Object.entries(sections).reduce((acc, [key, value]) => {
        acc[key] = {
          ...value,
          content: value.content.getCurrentContent().getPlainText()
        };
        return acc;
      }, {});

      setFeedbackMessage('Saving...');

      await saveContent(
        user,
        location.state.project,
        contentToSave,
        sectionOrder,
        title,
        articles
      );

      setFeedbackMessage('Saved');
      setTimeout(() => setFeedbackMessage(''), 3000);
    } catch (error) {
      console.error('Error saving content:', error);
      setFeedbackMessage('Error saving');
      setTimeout(() => setFeedbackMessage(''), 3000);
    } finally {
      setIsEditing(false);
    }
  }, [user, location.state?.project, sections, sectionOrder, title, articles, activeSection]);

  const toggleSuggestionHistory = () => {
    setShowSuggestionHistory(!showSuggestionHistory);
  };
  const handleDeleteArticle = async (articleId) => {
    if (!user || !location.state?.project) {
      console.error("User or project not available");
      return;
    }

    try {
      const projectId = location.state.project.id;
      const articleRef = doc(db, `users/${user.uid}/projects/${projectId}/researcharticles`, articleId);
      await deleteDoc(articleRef);

      // Update local state
      setArticles(prevArticles => prevArticles.filter(article => article.id !== articleId));
      setFeedbackMessage('Article deleted successfully');
      setTimeout(() => setFeedbackMessage(''), 3000);
    } catch (error) {
      console.error("Error deleting article: ", error);
      setFeedbackMessage('Error deleting article');
      setTimeout(() => setFeedbackMessage(''), 3000);
    }
  };

  const handleSuggestionClick = (suggestionText) => {
    const currentContent = sections[activeSection].content.getCurrentContent();
    const selection = sections[activeSection].content.getSelection();

    const newContent = Modifier.insertText(
      currentContent,
      selection,
      suggestionText
    );

    const newEditorState = EditorState.push(
      sections[activeSection].content,
      newContent,
      'insert-characters'
    );

    handleChange(newEditorState);
    setSuggestion('');
    setShowSuggestionHistory(false);
  };

  useEffect(() => {
    return () => {
      // Clear all timeouts
      if (suggestionTimeoutRef.current) clearTimeout(suggestionTimeoutRef.current);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      // Cancel any pending save operations
      saveContent.cancel();

      // Clear the state
      setSections({});
      setTitle('');
      setSectionOrder([]);
      // ... clear other relevant state
    };
  }, []);
  const handleKeyCommand = (command) => {
    if (command === 'insert-suggestion' && suggestion) {
      const newContent = Modifier.insertText(
        sections[activeSection].content.getCurrentContent(),
        sections[activeSection].content.getSelection(),
        suggestion
      );
      
      const newEditorState = EditorState.push(
        sections[activeSection].content,
        newContent,
        'insert-characters'
      );
      
      handleChange(newEditorState);
      setSuggestion('');
      return 'handled';
    }
    return 'not-handled';
  };

  const handleDeleteSection = (sectionName) => {
    // Don't allow deletion if it's the last section
    if (sectionOrder.length <= 1) {
      setFeedbackMessage("Cannot delete the last remaining section");
      return;
    }

    // Create new sections object without the deleted section
    const { [sectionName]: deletedSection, ...remainingSections } = sections;
    setSections(remainingSections);

    // Update section order
    setSectionOrder(prevOrder => prevOrder.filter(name => name !== sectionName));

    // If the active section was deleted, switch to the first available section
    if (activeSection === sectionName) {
      const newActiveSection = sectionOrder.find(name => name !== sectionName);
      setActiveSection(newActiveSection);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <div className="writer-container">
      <Toolbar
        onNewClick={() => navigate('/writer')}
        onSaveClick={handleSave}
        onDownloadClick={handleDownload}
        onExportWordClick={handleExportAsMicrosoftWord}
        onShowArticlesClick={toggleArticlesVisibility}
        onCitationMangerClick={handleCitationManagerClick}
        onDarkModeClick={toggleDarkMode}
      />
      <div className='writer-main'>
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
                          className="outline-item"
                        >
                          <span onClick={() => switchSection(name)}>{name}</span>
                          <button 
                            className="delete-section-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSection(name);
                            }}
                          >
                            ×
                          </button>
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

        <div className="writer">
          <div className='feedback-container'>
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
                placeholder="Enter a title to start writing"
              />
            ) : (
              <h2
                className={`project-title ${!isTitleSet ? 'untitled' : ''}`}
                onClick={() => setIsTitleEditing(true)}
              >
                {isTitleSet ? title : 'Click to set title'}
              </h2>
            )}
          </div>
          <div className={`writing-area-container ${!isTitleSet ? 'disabled' : ''} ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
            <div className="page-header">
              {title || 'Untitled Document'}
            </div>
            {sections[activeSection] ? (
              <Editor
                editorState={sections[activeSection].content}
                onChange={handleChange}
                handleKeyCommand={handleKeyCommand}
                keyBindingFn={keyBindingFn}
              />
            ) : (
              <p>No content available for this section.</p>
            )}
          </div>
         
          <div className="character-count">
            Character Count: {sections[activeSection].content.getCurrentContent().getPlainText('').length}
          </div>
        </div>

        <div className="suggestion-overlay">
          <div className='sugtitle'>{showSuggestionHistory ? 'History' : 'WriterPro Assistant'}</div>
          <button className="history-button" onClick={toggleSuggestionHistory}>
            {showSuggestionHistory ? 'Current' : 'History'}
          </button>
          {!isEditing && !showSuggestionHistory && suggestion && (
            <span className="suggestion">{suggestion}</span>
          )}
          {!isEditing && showSuggestionHistory && (
            <div className="suggestion-history">
              <ul>
                {previousSuggestions.map((prevSuggestion, index) => (
                  <li key={index} className="history-item">
                    {prevSuggestion}
                    <button
                      className="insert-suggestion-button"
                      onClick={() => handleSuggestionClick(prevSuggestion)}
                    >
                      Insert
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className='spinnerbox'>
            {isEditing && <Spinner />}
          </div>
        </div>
      </div>

      <div className={`side-panel ${isArticlesVisible ? 'visible' : ''}`}>
        <h2>Research Articles</h2>
        {articles.length > 0 ? (
          <ul className='article-list'>
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
                  <button className="article-delete-button" onClick={() => handleDeleteArticle(article.id)}>Delete</button>
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
