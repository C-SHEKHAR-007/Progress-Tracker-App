import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDatabase } from '../services/database';

const DatabaseContext = createContext(null);

export const DatabaseProvider = ({ children }) => {
  const [db, setDb] = useState(null);

  useEffect(() => {
    const loadDatabase = async () => {
      const database = await getDatabase();
      setDb(database);
    };
    loadDatabase();
  }, []);

  return (
    <DatabaseContext.Provider value={db}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  return context;
};
