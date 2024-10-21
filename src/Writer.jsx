import 'global';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import './Writer.css';
import Toolbar from './Toolbar';
import { useNavigate, useLocation } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { db, auth } from './firebase';
import { collection, getDocs } from 'firebase/firestore';
import { debounce } from 'lodash';
import Spinner from './Spinner';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveContent } from './contentManager';
import { Editor, EditorState, ContentState, Modifier, CompositeDecorator, getDefaultKeyBinding } from 'draft-js';
import 'draft-js/dist/Draft.css';

const Writer = () => {
  const [title, setTitle] = useState('');
  const [isTitleSet, setIsTitleSet] = useState(false);
  const [sectionOrder, setSectionOrder] = useState([]);
  const [suggestion, setSuggestion] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [activeSection, setActiveSection] = useState('Introduction');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isArticlesVisible, setIsArticlesVisible] = useState(false);
  const [articles, setArticles] = useState([]);

  const navigate = useNavigate();
  const [sections, setSections] = useState({
    Introduction: { id: 'section-1', content: EditorState.createEmpty() },
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
        setTitle(title);
        setSections(Object.entries(sections).reduce((acc, [key, value]) => {
          acc[key] = {
            ...value,
            content: EditorState.createWithContent(
              ContentState.createFromText(value.content),
              decorator
            )
          };
          return acc;
        }, {}));
        setSectionOrder(sectionOrder || Object.keys(sections));
        setIsTitleSet(!!title);
        setArticles(articles || []);
      } else {
        setSectionOrder(['Introduction', 'Body', 'Conclusion']);
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

  const handleChange = (editorState) => {
    const updatedSections = {
      ...sections,
      [activeSection]: { ...sections[activeSection], content: editorState },
    };
    setSections(updatedSections);
    setIsEditing(true);
    setFeedbackMessage('Editing...');

    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }

    suggestionTimeoutRef.current = setTimeout(() => {
      setIsEditing(false);
      handleTextCompletion(editorState.getCurrentContent().getPlainText());
    }, 4000);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const contentToSave = Object.entries(updatedSections).reduce((acc, [key, value]) => {
        acc[key] = {
          ...value,
          content: value.content.getCurrentContent().getPlainText()
        };
        return acc;
      }, {});
      saveContent(user, location.state?.project, contentToSave, sectionOrder, title, articles);
      setFeedbackMessage('Saving...');
      // Set a timeout to change the feedback message to "Saved" after a short delay
      setTimeout(() => {
        setFeedbackMessage('Saved');
        // Clear the "Saved" message after 3 seconds
      }, 4000); // Adjust this delay as needed
    }, 4000);
  };

  const handleTextCompletion = async (prompt) => {
    if (!prompt.trim()) {
      setSuggestion('');
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:5173'  // You might want to make this dynamic too
        },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.message) {
        setSuggestion(data.message);
      } else {
        setSuggestion('');
        console.error('Error or missing message in response:', data);
      }
    } catch (error) {
      setSuggestion('');
      console.error('Error fetching prediction:', error);
      // Optionally, show a user-friendly error message
      alert('Failed to get suggestion. Please try again later.');
    }
  };
  const handleKeyCommand = (command, editorState) => {
    if (command === 'insert-suggestion' && suggestion) {
      const newState = Modifier.insertText(
        editorState.getCurrentContent(),
        editorState.getSelection(),
        suggestion
      );
      handleChange(EditorState.push(editorState, newState, 'insert-characters'));
      setSuggestion('');
      return 'handled';
    }
    return 'not-handled';
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
    setIsTitleSet(!!title);
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    }
  };

  const switchSection = (sectionName) => {
    setActiveSection(sectionName);
  };

  const handleAddSection = (sectionName, content = '') => {
    if (sectionName && !sections[sectionName]) {
      const newSections = {
        ...sections,
        [sectionName]: {
          id: `section-${Object.keys(sections).length + 1}`,
          content: EditorState.createWithContent(ContentState.createFromText(content), decorator)
        }
      };
      setSections(newSections);
      setSectionOrder([...sectionOrder, sectionName]);
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
  const handleSave = () => {
    saveContent(user, location.state?.project, contentToSave, sectionOrder, title, articles);

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
              />
            ) : (
              <h2 className="project-title" onClick={() => setIsTitleEditing(true)}>
                {title || 'Click to set title'}
              </h2>
            )}
          </div>
          <div className="writing-area-container">

            <Editor
              editorState={sections[activeSection].content}
              onChange={handleChange}
              handleKeyCommand={handleKeyCommand}
              keyBindingFn={keyBindingFn}
            />

          </div>
          <div className="character-count">
            Character Count: {sections[activeSection].content.getCurrentContent().getPlainText('').length}
          </div>
        </div>

        <div className="suggestion-overlay">
          <h2 className='sugtitle'>WriterPro Assistant</h2>
          {!isEditing && suggestion && <span className="suggestion">{suggestion}</span>}
          <div className='spinnerbox'>
            {isEditing && <Spinner />}
          </div>
        </div>
      </div>

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
