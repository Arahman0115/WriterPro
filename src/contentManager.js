import { collection, addDoc, setDoc, getDocs, doc } from 'firebase/firestore';
import { debounce } from 'lodash';
import { db, auth } from './firebase';

// Add a new function to create a blank document
export const createBlankDocument = async (user) => {
  if (!user) return null;
  
  const blankProject = {
    title: '',
    sections: {
      Template: { content: '' },
      Body: { content: '' },
      Conclusion: { content: '' }
    },
    sectionOrder: ['Template', 'Body', 'Conclusion'],
    lastEdited: Date.now(),
    articles: []
  };

  try {
    const newDocRef = await addDoc(collection(db, `users/${user.uid}/projects`), blankProject);
    return {
      id: newDocRef.id,
      ...blankProject
    };
  } catch (error) {
    console.error("Error creating blank document:", error);
    throw error;
  }
};

// Modified saveContent function
export const saveContent = debounce(async (user, project, updatedSections, sectionOrder, title, articles) => {
    if (!user) {
        console.log('User is not authenticated');
        return null;
    }

    const currentProject = {
        title,
        sections: updatedSections,
        sectionOrder,
        lastEdited: Date.now(),
        articles
    };

    try {
        const projectId = project?.id;
        
        // If no project ID exists, throw an error - new documents should be created using createBlankDocument
        if (!projectId) {
            throw new Error('No project ID provided. New documents should be created using createBlankDocument');
        }

        // Update existing document
        const docRef = doc(db, `users/${user.uid}/projects`, projectId);
        await setDoc(docRef, currentProject, { merge: true });

        return {
            id: projectId,
            isNew: false
        };
    } catch (e) {
        console.error("Error saving document: ", e);
        throw e;
    }
}, 4000);