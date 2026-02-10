import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import * as db from '../services/database';

const ItemsContext = createContext(null);

// Action types
const ACTIONS = {
  SET_ITEMS: 'SET_ITEMS',
  SET_COLLECTIONS: 'SET_COLLECTIONS',
  SET_LOADING: 'SET_LOADING',
  ADD_ITEMS: 'ADD_ITEMS',
  UPDATE_ITEM: 'UPDATE_ITEM',
  DELETE_ITEM: 'DELETE_ITEM',
  ADD_COLLECTION: 'ADD_COLLECTION',
  UPDATE_COLLECTION: 'UPDATE_COLLECTION',
  DELETE_COLLECTION: 'DELETE_COLLECTION',
};

// Initial state
const initialState = {
  items: [],
  collections: [],
  loading: true,
};

// Reducer
function itemsReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
      
    case ACTIONS.SET_ITEMS:
      return { ...state, items: action.payload, loading: false };
      
    case ACTIONS.SET_COLLECTIONS:
      return { ...state, collections: action.payload };
      
    case ACTIONS.ADD_ITEMS:
      return { ...state, items: [...state.items, ...action.payload] };
      
    case ACTIONS.UPDATE_ITEM:
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id ? { ...item, ...action.payload } : item
        ),
      };
      
    case ACTIONS.DELETE_ITEM:
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload),
      };
      
    case ACTIONS.ADD_COLLECTION:
      return { ...state, collections: [...state.collections, action.payload] };
      
    case ACTIONS.UPDATE_COLLECTION:
      return {
        ...state,
        collections: state.collections.map(col =>
          col.id === action.payload.id ? { ...col, ...action.payload } : col
        ),
      };
      
    case ACTIONS.DELETE_COLLECTION:
      return {
        ...state,
        collections: state.collections.filter(col => col.id !== action.payload),
        items: state.items.map(item =>
          item.collection_id === action.payload ? { ...item, collection_id: null } : item
        ),
      };
      
    default:
      return state;
  }
}

export const ItemsProvider = ({ children }) => {
  const [state, dispatch] = useReducer(itemsReducer, initialState);

  // Fetch all items
  const fetchItems = useCallback(async () => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      const items = await db.getAllItems();
      dispatch({ type: ACTIONS.SET_ITEMS, payload: items });
    } catch (error) {
      console.error('Error fetching items:', error);
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  // Fetch all collections
  const fetchCollections = useCallback(async () => {
    try {
      const collections = await db.getAllCollections();
      dispatch({ type: ACTIONS.SET_COLLECTIONS, payload: collections });
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  }, []);

  // Add new items
  const addItems = useCallback(async (items, collectionId = null) => {
    try {
      const createdItems = await db.createItems(items, collectionId);
      dispatch({ type: ACTIONS.ADD_ITEMS, payload: createdItems });
      return createdItems;
    } catch (error) {
      console.error('Error adding items:', error);
      throw error;
    }
  }, []);

  // Update item
  const updateItem = useCallback(async (id, updates) => {
    try {
      const updatedItem = await db.updateItem(id, updates);
      if (updatedItem) {
        dispatch({ type: ACTIONS.UPDATE_ITEM, payload: updatedItem });
      }
      return updatedItem;
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }, []);

  // Update progress
  const updateProgress = useCallback(async (id, progress, lastPosition, timeSpent = 0) => {
    try {
      const updatedItem = await db.updateProgress(id, progress, lastPosition);
      if (updatedItem) {
        dispatch({ type: ACTIONS.UPDATE_ITEM, payload: updatedItem });
        // Log progress to history (for analytics)
        try {
          await db.logProgress(id, progress, timeSpent);
        } catch (logError) {
          console.warn('Error logging progress:', logError);
        }
      }
      return updatedItem;
    } catch (error) {
      console.error('Error updating progress:', error);
      throw error;
    }
  }, []);

  // Mark completed
  const markCompleted = useCallback(async (id, completed = true) => {
    try {
      const updatedItem = await db.markCompleted(id, completed);
      if (updatedItem) {
        dispatch({ type: ACTIONS.UPDATE_ITEM, payload: updatedItem });
      }
      return updatedItem;
    } catch (error) {
      console.error('Error marking completed:', error);
      throw error;
    }
  }, []);

  // Delete item
  const deleteItem = useCallback(async (id) => {
    try {
      // Get item to find file path
      const item = state.items.find(i => i.id === id);
      await db.deleteItem(id);
      dispatch({ type: ACTIONS.DELETE_ITEM, payload: id });
      // Note: File deletion is handled separately if needed
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }, [state.items]);

  // Delete multiple items
  const deleteItems = useCallback(async (ids) => {
    try {
      await db.deleteItems(ids);
      ids.forEach(id => {
        dispatch({ type: ACTIONS.DELETE_ITEM, payload: id });
      });
    } catch (error) {
      console.error('Error deleting items:', error);
      throw error;
    }
  }, []);

  // Move multiple items to a collection
  const moveItemsToCollection = useCallback(async (ids, collectionId) => {
    try {
      await db.moveItemsToCollection(ids, collectionId);
      ids.forEach(id => {
        dispatch({ type: ACTIONS.UPDATE_ITEM, payload: { id, collection_id: collectionId } });
      });
    } catch (error) {
      console.error('Error moving items:', error);
      throw error;
    }
  }, []);

  // Update item collection
  const updateItemCollection = useCallback(async (id, collectionId) => {
    try {
      const updatedItem = await db.updateItemCollection(id, collectionId);
      if (updatedItem) {
        dispatch({ type: ACTIONS.UPDATE_ITEM, payload: updatedItem });
      }
      return updatedItem;
    } catch (error) {
      console.error('Error updating item collection:', error);
      throw error;
    }
  }, []);

  // Reorder items
  const reorderItems = useCallback(async (items) => {
    try {
      await db.reorderItems(items);
      dispatch({ type: ACTIONS.SET_ITEMS, payload: items.map((item, idx) => ({ ...item, order_index: idx })) });
    } catch (error) {
      console.error('Error reordering items:', error);
      throw error;
    }
  }, []);

  // Create collection
  const createCollection = useCallback(async (name, color, icon) => {
    try {
      const collection = await db.createCollection(name, color, icon);
      dispatch({ type: ACTIONS.ADD_COLLECTION, payload: collection });
      return collection;
    } catch (error) {
      console.error('Error creating collection:', error);
      throw error;
    }
  }, []);

  // Update collection
  const updateCollection = useCallback(async (id, updates) => {
    try {
      const updated = await db.updateCollection(id, updates);
      if (updated) {
        dispatch({ type: ACTIONS.UPDATE_COLLECTION, payload: updated });
      }
      return updated;
    } catch (error) {
      console.error('Error updating collection:', error);
      throw error;
    }
  }, []);

  // Delete collection
  const deleteCollection = useCallback(async (id) => {
    try {
      await db.deleteCollection(id);
      dispatch({ type: ACTIONS.DELETE_COLLECTION, payload: id });
    } catch (error) {
      console.error('Error deleting collection:', error);
      throw error;
    }
  }, []);

  // Get items by collection
  const getItemsByCollection = useCallback((collectionId) => {
    if (!collectionId) {
      return state.items.filter(item => !item.collection_id);
    }
    return state.items.filter(item => item.collection_id === collectionId);
  }, [state.items]);

  // Initial data fetch
  useEffect(() => {
    fetchItems();
    fetchCollections();
  }, [fetchItems, fetchCollections]);

  // Calculate stats
  const stats = {
    total: state.items.length,
    completed: state.items.filter(i => i.is_completed).length,
    inProgress: state.items.filter(i => i.progress > 0 && !i.is_completed).length,
    avgProgress: state.items.length > 0
      ? Math.round(state.items.reduce((acc, i) => acc + i.progress, 0) / state.items.length)
      : 0,
  };

  const value = {
    items: state.items,
    collections: state.collections,
    loading: state.loading,
    stats,
    fetchItems,
    fetchCollections,
    addItems,
    updateItem,
    updateProgress,
    markCompleted,
    deleteItem,
    deleteItems,
    moveItemsToCollection,
    updateItemCollection,
    reorderItems,
    createCollection,
    updateCollection,
    deleteCollection,
    getItemsByCollection,
  };

  return (
    <ItemsContext.Provider value={value}>
      {children}
    </ItemsContext.Provider>
  );
};

export const useItems = () => {
  const context = useContext(ItemsContext);
  if (!context) {
    throw new Error('useItems must be used within an ItemsProvider');
  }
  return context;
};
