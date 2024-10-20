import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

const apiService = {
    save: async (content) => {
        try {
            const docRef = await addDoc(collection(db, 'contents'), content);
            console.log("Document written with ID: ", docRef.id);
        } catch (error) {
            console.error("Error adding document: ", error);
            throw error; // Rethrow to handle in ContentManager
        }
    }
};

export default apiService;