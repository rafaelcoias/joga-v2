"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  QueryConstraint,
  WhereFilterOp,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import {
  fetchDocuments,
  fetchDocument,
  handleAddDoc,
  handleEditDoc,
  handleDeleteDoc,
  getDocWithQuery,
} from "@/lib/firebase/server";

interface UseCollectionOptions {
  constraints?: QueryConstraint[];
  realtime?: boolean;
}

interface QueryFilter {
  field: string;
  operator: WhereFilterOp;
  value: unknown;
}

// Hook for fetching a collection with optional real-time updates
export function useCollection<T>(
  collectionName: string,
  options: UseCollectionOptions = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { constraints = [], realtime = false } = options;

  useEffect(() => {
    setLoading(true);

    if (realtime) {
      // Real-time listener
      const colRef = collection(db, collectionName);
      const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const docs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as T[];
          setData(docs);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error(`Error listening to ${collectionName}:`, err);
          setError(err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } else {
      // One-time fetch
      const loadData = async () => {
        try {
          const docs = await fetchDocuments(collectionName, constraints);
          setData(docs as T[]);
          setError(null);
        } catch (err) {
          console.error(`Error fetching ${collectionName}:`, err);
          setError(err as Error);
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }
  }, [collectionName, realtime]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const docs = await fetchDocuments(collectionName, constraints);
      setData(docs as T[]);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [collectionName]);

  return { data, loading, error, refresh };
}

// Hook for fetching a single document
export function useDocument<T>(collectionName: string, documentId: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!documentId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const loadData = async () => {
      try {
        const doc = await fetchDocument(collectionName, documentId);
        setData(doc as T);
        setError(null);
      } catch (err) {
        console.error(`Error fetching document ${documentId}:`, err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [collectionName, documentId]);

  const refresh = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const doc = await fetchDocument(collectionName, documentId);
      setData(doc as T);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [collectionName, documentId]);

  return { data, loading, error, refresh };
}

// Hook for querying documents with filters
export function useQuery<T>(
  collectionName: string,
  filters: QueryFilter[],
  options: { enabled?: boolean; realtime?: boolean } = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { enabled = true, realtime = false } = options;

  useEffect(() => {
    if (!enabled || filters.length === 0) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (realtime) {
      const colRef = collection(db, collectionName);
      const constraints = filters.map((f) => where(f.field, f.operator, f.value));
      const q = query(colRef, ...constraints);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const docs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as T[];
          setData(docs);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error(`Error querying ${collectionName}:`, err);
          setError(err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } else {
      const loadData = async () => {
        try {
          // Use the first filter for simple queries
          if (filters.length === 1) {
            const docs = await getDocWithQuery(
              collectionName,
              filters[0].field,
              filters[0].operator,
              filters[0].value
            );
            setData(docs as T[]);
          } else {
            // For multiple filters, build constraints
            const colRef = collection(db, collectionName);
            const constraints = filters.map((f) =>
              where(f.field, f.operator, f.value)
            );
            const q = query(colRef, ...constraints);
            const snapshot = await import("firebase/firestore").then((m) =>
              m.getDocs(q)
            );
            const docs = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as T[];
            setData(docs);
          }
          setError(null);
        } catch (err) {
          console.error(`Error querying ${collectionName}:`, err);
          setError(err as Error);
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }
  }, [collectionName, enabled, realtime, JSON.stringify(filters)]);

  return { data, loading, error };
}

// Helper type to exclude auto-generated fields
type CreateData<T> = Omit<T, "id" | "createdAt" | "updatedAt">;

// CRUD operations hook
export function useCRUD<T extends DocumentData>(collectionName: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(
    async (data: CreateData<T>) => {
      setLoading(true);
      setError(null);
      try {
        const result = await handleAddDoc(data as Record<string, unknown>, collectionName);
        return result as unknown as T;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [collectionName]
  );

  const update = useCallback(
    async (id: string, data: Partial<T>) => {
      setLoading(true);
      setError(null);
      try {
        const result = await handleEditDoc(id, data as Record<string, unknown>, collectionName);
        return result as unknown as T;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [collectionName]
  );

  const remove = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        await handleDeleteDoc(id, collectionName);
        return true;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [collectionName]
  );

  return { create, update, remove, loading, error };
}

// Export query helper functions
export { where, orderBy, limit } from "firebase/firestore";
