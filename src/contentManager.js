import { collection, addDoc, setDoc, getDocs, doc } from 'firebase/firestore';
import { debounce } from 'lodash';
import { db, auth } from './firebase';

// Function to save content to Firestore
export const saveContent = debounce(async (user, project, updatedSections, sectionOrder, title, articles) => {
    const currentProject = {
        title,
        sections: updatedSections,
        sectionOrder, // Include the current sectionOrder
        lastEdited: Date.now(),
        articles
    };

    if (user) {
        try {
            // If a project ID exists, update the existing document
            if (project?.id) {
                const docRef = doc(db, `users/${user.uid}/projects`, project.id);
                await setDoc(docRef, currentProject, { merge: true });
            } else {
                // If no project ID, create a new document
                const newDocRef = await addDoc(collection(db, `users/${user.uid}/projects`), currentProject);
                return newDocRef.id; // Return new project ID
            }
        } catch (e) {
            console.error("Error saving document: ", e);
        }
    } else {
        console.log('User is not authenticated');
    }
}, 4000);

// Function to load a project from Firestore


