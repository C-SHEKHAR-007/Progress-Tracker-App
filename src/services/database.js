import * as SQLite from 'expo-sqlite';

let db = null;

export const getDatabase = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('progress_tracker.db');
  }
  return db;
};

export const initDatabase = async () => {
  const database = await getDatabase();
  
  // Create collections table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6366f1',
      icon TEXT DEFAULT 'folder',
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create learning_items table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS learning_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('video', 'pdf')),
      file_id TEXT UNIQUE NOT NULL,
      file_path TEXT,
      file_uri TEXT,
      collection_id INTEGER REFERENCES collections(id) ON DELETE SET NULL,
      progress INTEGER DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
      last_position REAL DEFAULT 0,
      is_completed INTEGER DEFAULT 0,
      duration REAL DEFAULT 0,
      file_size INTEGER DEFAULT 0,
      thumbnail TEXT,
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create progress_history table for analytics
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS progress_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER REFERENCES learning_items(id) ON DELETE CASCADE,
      progress REAL DEFAULT 0,
      time_spent INTEGER DEFAULT 0,
      session_date TEXT NOT NULL,
      recorded_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create indexes for better query performance
  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_progress_history_item ON progress_history(item_id);
  `);
  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_progress_history_date ON progress_history(session_date);
  `);

  console.log('Database initialized');
};

// ============================================
// COLLECTIONS CRUD
// ============================================

export const getAllCollections = async () => {
  const database = await getDatabase();
  const result = await database.getAllAsync(
    'SELECT * FROM collections ORDER BY order_index ASC, created_at DESC'
  );
  return result;
};

export const createCollection = async (name, color = '#6366f1', icon = 'folder') => {
  const database = await getDatabase();
  const result = await database.runAsync(
    'INSERT INTO collections (name, color, icon) VALUES (?, ?, ?)',
    [name, color, icon]
  );
  return { id: result.lastInsertRowId, name, color, icon };
};

export const updateCollection = async (id, updates) => {
  const database = await getDatabase();
  const fields = [];
  const values = [];
  
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.color !== undefined) {
    fields.push('color = ?');
    values.push(updates.color);
  }
  if (updates.icon !== undefined) {
    fields.push('icon = ?');
    values.push(updates.icon);
  }
  
  if (fields.length === 0) return null;
  
  values.push(id);
  await database.runAsync(
    `UPDATE collections SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  
  return { id, ...updates };
};

export const deleteCollection = async (id) => {
  const database = await getDatabase();
  // Update items to have no collection
  await database.runAsync(
    'UPDATE learning_items SET collection_id = NULL WHERE collection_id = ?',
    [id]
  );
  await database.runAsync('DELETE FROM collections WHERE id = ?', [id]);
  return true;
};

// ============================================
// LEARNING ITEMS CRUD
// ============================================

export const getAllItems = async () => {
  const database = await getDatabase();
  const result = await database.getAllAsync(
    'SELECT * FROM learning_items ORDER BY order_index ASC, created_at DESC'
  );
  return result.map(item => ({
    ...item,
    is_completed: Boolean(item.is_completed),
  }));
};

export const getItemById = async (id) => {
  const database = await getDatabase();
  const result = await database.getFirstAsync(
    'SELECT * FROM learning_items WHERE id = ?',
    [id]
  );
  if (!result) return null;
  return { ...result, is_completed: Boolean(result.is_completed) };
};

export const getItemsByCollection = async (collectionId) => {
  const database = await getDatabase();
  const result = await database.getAllAsync(
    'SELECT * FROM learning_items WHERE collection_id = ? ORDER BY order_index ASC',
    [collectionId]
  );
  return result.map(item => ({
    ...item,
    is_completed: Boolean(item.is_completed),
  }));
};

export const createItem = async (item) => {
  const database = await getDatabase();
  const {
    name,
    type,
    file_id,
    file_path = null,
    file_uri = null,
    collection_id = null,
    duration = 0,
    file_size = 0,
    thumbnail = null,
  } = item;

  const result = await database.runAsync(
    `INSERT INTO learning_items 
     (name, type, file_id, file_path, file_uri, collection_id, duration, file_size, thumbnail)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, type, file_id, file_path, file_uri, collection_id, duration, file_size, thumbnail]
  );

  return {
    id: result.lastInsertRowId,
    ...item,
    progress: 0,
    last_position: 0,
    is_completed: false,
    order_index: 0,
  };
};

export const createItems = async (items, collectionId = null) => {
  const createdItems = [];
  for (const item of items) {
    const created = await createItem({
      ...item,
      collection_id: collectionId,
    });
    createdItems.push(created);
  }
  return createdItems;
};

export const updateItem = async (id, updates) => {
  const database = await getDatabase();
  const fields = [];
  const values = [];

  const allowedFields = [
    'name', 'type', 'file_path', 'file_uri', 'collection_id',
    'progress', 'last_position', 'is_completed', 'duration',
    'file_size', 'thumbnail', 'order_index'
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(field === 'is_completed' ? (updates[field] ? 1 : 0) : updates[field]);
    }
  }

  if (fields.length === 0) return null;

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  await database.runAsync(
    `UPDATE learning_items SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  return getItemById(id);
};

export const updateProgress = async (id, progress, lastPosition) => {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE learning_items 
     SET progress = ?, last_position = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [progress, lastPosition, id]
  );
  return getItemById(id);
};

export const markCompleted = async (id, completed = true) => {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE learning_items 
     SET is_completed = ?, progress = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [completed ? 1 : 0, completed ? 100 : 0, id]
  );
  return getItemById(id);
};

export const updateItemCollection = async (id, collectionId) => {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE learning_items SET collection_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [collectionId, id]
  );
  return getItemById(id);
};

export const deleteItem = async (id) => {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM learning_items WHERE id = ?', [id]);
  return true;
};

export const deleteItems = async (ids) => {
  const database = await getDatabase();
  const placeholders = ids.map(() => '?').join(', ');
  await database.runAsync(
    `DELETE FROM learning_items WHERE id IN (${placeholders})`,
    ids
  );
  return true;
};

export const moveItemsToCollection = async (ids, collectionId) => {
  const database = await getDatabase();
  const placeholders = ids.map(() => '?').join(', ');
  await database.runAsync(
    `UPDATE learning_items SET collection_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
    [collectionId, ...ids]
  );
  return true;
};

export const reorderItems = async (items) => {
  const database = await getDatabase();
  for (let i = 0; i < items.length; i++) {
    await database.runAsync(
      'UPDATE learning_items SET order_index = ? WHERE id = ?',
      [i, items[i].id]
    );
  }
  return true;
};

// ============================================
// PROGRESS HISTORY & ANALYTICS
// ============================================

export const logProgress = async (itemId, progress, timeSpent = 0) => {
  const database = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  
  await database.runAsync(
    `INSERT INTO progress_history (item_id, progress, time_spent, session_date)
     VALUES (?, ?, ?, ?)`,
    [itemId, progress, timeSpent, today]
  );
  return true;
};

export const getHeatmapData = async (days = 365) => {
  const database = await getDatabase();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const result = await database.getAllAsync(
    `SELECT session_date, COUNT(*) as count, SUM(time_spent) as total_time
     FROM progress_history
     WHERE session_date >= ?
     GROUP BY session_date
     ORDER BY session_date ASC`,
    [startDateStr]
  );
  return result;
};

export const getStreak = async () => {
  const database = await getDatabase();
  
  // Get all unique learning dates
  const dates = await database.getAllAsync(
    `SELECT DISTINCT session_date FROM progress_history ORDER BY session_date DESC`
  );

  if (dates.length === 0) {
    return { current: 0, longest: 0 };
  }

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;
  
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Check if today or yesterday has activity for current streak
  const lastDate = dates[0].session_date;
  if (lastDate === today || lastDate === yesterdayStr) {
    currentStreak = 1;
    
    // Count consecutive days
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1].session_date);
      const currDate = new Date(dates[i].session_date);
      const diffDays = Math.floor((prevDate - currDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1].session_date);
    const currDate = new Date(dates[i].session_date);
    const diffDays = Math.floor((prevDate - currDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

  return { current: currentStreak, longest: longestStreak };
};

export const getTodayStats = async () => {
  const database = await getDatabase();
  const today = new Date().toISOString().split('T')[0];

  const result = await database.getFirstAsync(
    `SELECT COUNT(*) as sessions, COALESCE(SUM(time_spent), 0) as total_time
     FROM progress_history
     WHERE session_date = ?`,
    [today]
  );
  
  return {
    sessions: result?.sessions || 0,
    totalTime: result?.total_time || 0,
  };
};

export const getWeeklyStats = async () => {
  const database = await getDatabase();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];

  const result = await database.getFirstAsync(
    `SELECT 
       COUNT(*) as sessions,
       COALESCE(SUM(time_spent), 0) as total_time,
       COUNT(DISTINCT session_date) as active_days
     FROM progress_history
     WHERE session_date >= ?`,
    [weekAgoStr]
  );

  return {
    sessions: result?.sessions || 0,
    totalTime: result?.total_time || 0,
    activeDays: result?.active_days || 0,
  };
};

export const getWeekdayPattern = async () => {
  const database = await getDatabase();
  
  const result = await database.getAllAsync(
    `SELECT 
       CAST(strftime('%w', session_date) AS INTEGER) as weekday,
       COUNT(*) as count,
       COALESCE(SUM(time_spent), 0) as total_time
     FROM progress_history
     GROUP BY weekday
     ORDER BY weekday`
  );
  
  // Ensure all weekdays are represented (0=Sunday to 6=Saturday)
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const pattern = weekdays.map((name, index) => {
    const found = result.find(r => r.weekday === index);
    return {
      day: name,
      count: found?.count || 0,
      time: found?.total_time || 0,
    };
  });
  
  return pattern;
};

export const getRecentCompletions = async (limit = 5) => {
  const database = await getDatabase();
  
  const result = await database.getAllAsync(
    `SELECT * FROM learning_items 
     WHERE is_completed = 1
     ORDER BY updated_at DESC
     LIMIT ?`,
    [limit]
  );
  
  return result.map(item => ({
    ...item,
    is_completed: Boolean(item.is_completed),
  }));
};

export const getCollectionProgress = async () => {
  const database = await getDatabase();
  
  const result = await database.getAllAsync(
    `SELECT 
       c.id,
       c.name,
       c.color,
       COUNT(li.id) as total_items,
       SUM(CASE WHEN li.is_completed = 1 THEN 1 ELSE 0 END) as completed_items,
       AVG(li.progress) as avg_progress
     FROM collections c
     LEFT JOIN learning_items li ON c.id = li.collection_id
     GROUP BY c.id
     ORDER BY c.order_index ASC`
  );
  
  return result;
};

export const getTotalHoursLearned = async () => {
  const database = await getDatabase();
  
  const result = await database.getFirstAsync(
    `SELECT COALESCE(SUM(time_spent), 0) as total_seconds FROM progress_history`
  );
  
  return Math.round((result?.total_seconds || 0) / 3600 * 10) / 10; // Hours with 1 decimal
};
