import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  WhereFilterOp,
  query,
  where,
  Timestamp,
  orderBy,
  limit,
  QueryConstraint
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

import { db, storage } from "./config";

// Generic document type for Firestore operations
type DocumentData = Record<string, unknown>;
type DocumentWithId = DocumentData & { id: string };

// Fetch all documents from a collection
export const fetchDocuments = async (collPath: string, constraints?: QueryConstraint[]) => {
  try {
    const colRef = collection(db, collPath);
    const q = constraints ? query(colRef, ...constraints) : colRef;
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return data;
  } catch (error) {
    console.error(`Error fetching documents from ${collPath}:`, error);
    return [];
  }
};

// Fetch a single document by ID
export const fetchDocument = async (collPath: string, id: string) => {
  try {
    const docSnap = await getDoc(doc(db, collPath, id));
    if (!docSnap.exists()) {
      // Document not found - this is expected behavior for optional data
      return null;
    }
    return { id: docSnap.id, ...docSnap.data() };
  } catch (error) {
    console.error(`Error fetching document ${id} from ${collPath}:`, error);
    return null;
  }
};

// Query documents with conditions
export const getDocWithQuery = async (
  collectionName: string,
  field: string,
  operator: WhereFilterOp,
  value: unknown,
): Promise<DocumentWithId[]> => {
  try {
    const colRef = collection(db, collectionName);
    const q = query(colRef, where(field, operator, value));
    const querySnapshot = await getDocs(q);
    const results: DocumentWithId[] = [];
    querySnapshot.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() });
    });
    return results;
  } catch (error) {
    console.error("Error getting documents with query: ", error);
    return [];
  }
};

// Query documents with multiple conditions
export const getDocsWithMultipleQueries = async (
  collectionName: string,
  queries: { field: string; operator: WhereFilterOp; value: unknown }[]
): Promise<DocumentWithId[]> => {
  try {
    const colRef = collection(db, collectionName);
    const whereQueries = queries.map(q => where(q.field, q.operator, q.value));
    const q = query(colRef, ...whereQueries);
    const querySnapshot = await getDocs(q);
    const results: DocumentWithId[] = [];
    querySnapshot.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() });
    });
    return results;
  } catch (error) {
    console.error("Error getting documents with multiple queries: ", error);
    return [];
  }
};

// Delete a file from storage
export const deleteFile = async (path: string) => {
  try {
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
    return true;
  } catch (error) {
    console.error("Error deleting file: ", error);
    return false;
  }
}

// Upload an image to storage
export const uploadImage = async (path: string, file: File) => {
  try {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const imageUrl = await getDownloadURL(storageRef);
    return imageUrl;
  } catch (error) {
    console.error("Error uploading image: ", error);
    throw new Error("Failed to upload image");
  }
};

// Add a new document to a collection
export const handleAddDoc = async (data: DocumentData, collPath: string) => {
  try {
    const docRef = await addDoc(collection(db, collPath), {
      ...data,
      createdAt: Timestamp.fromDate(new Date()),
    });
    const newDocSnap = await getDoc(docRef);
    return { id: newDocSnap.id, ...newDocSnap.data() };
  } catch (error) {
    console.error(`Error adding document to ${collPath}:`, error);
    throw error;
  }
};

// Create or overwrite a document with a specific ID
export const handleSetDoc = async (
  id: string,
  data: DocumentData,
  collPath: string,
  merge: boolean = false
) => {
  try {
    const docRef = doc(db, collPath, id);
    const payload = {
      ...data,
      createdAt: Timestamp.fromDate(new Date()),
    };
    await setDoc(docRef, payload, { merge });
    const newDocSnap = await getDoc(docRef);
    return { id: newDocSnap.id, ...newDocSnap.data() };
  } catch (error) {
    console.error(`Error setting document ${id} in ${collPath}:`, error);
    throw error;
  }
};

// Update an existing document
export const handleEditDoc = async (
  id: string,
  updatedData: DocumentData,
  collPath: string,
) => {
  try {
    const updatePayload = {
      ...updatedData,
      updatedAt: Timestamp.fromDate(new Date())
    };
    await updateDoc(doc(db, collPath, id), updatePayload);
    const updatedDocSnap = await getDoc(doc(db, collPath, id));
    const newDocData = { id: updatedDocSnap.id, ...updatedDocSnap.data() };
    return newDocData;
  } catch (error) {
    console.error(`Error updating document ${id} in ${collPath}:`, error);
    throw error;
  }
};

// Delete a document
export const handleDeleteDoc = async (id: string, collPath: string) => {
  try {
    await deleteDoc(doc(db, collPath, id));
    return true;
  } catch (error) {
    console.error(`Error deleting document ${id} from ${collPath}:`, error);
    throw error;
  }
};

// Bulk import documents
export const handleBulkImport = async (items: DocumentData[], collectionName: string) => {
  try {
    const importedItems = []
    for (const item of items) {
      const docRef = await addDoc(collection(db, collectionName), {
        ...item,
        createdAt: Timestamp.fromDate(new Date())
      })
      importedItems.push({ id: docRef.id, ...item })
    }
    return importedItems;
  } catch (error) {
    console.error(`Error bulk importing to ${collectionName}:`, error);
    throw error;
  }
}

// Get ordered documents
export const fetchOrderedDocuments = async (
  collPath: string,
  orderByField: string,
  orderDirection: "asc" | "desc" = "desc",
  limitCount?: number
) => {
  try {
    const colRef = collection(db, collPath);
    const constraints: QueryConstraint[] = [orderBy(orderByField, orderDirection)];
    if (limitCount) {
      constraints.push(limit(limitCount));
    }
    const q = query(colRef, ...constraints);
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return data;
  } catch (error) {
    console.error(`Error fetching ordered documents from ${collPath}:`, error);
    return [];
  }
};
