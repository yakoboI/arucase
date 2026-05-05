/**
 * Comprehensive Data Persistence Manager
 * Implements multiple layers of data protection to prevent data loss
 */

class DataPersistenceManager {
  constructor() {
    this.storageKeys = {
      localStorage: 'preformone_scores_',
      sessionStorage: 'preformone_scores_session_',
      indexedDB: 'preformone_scores_db'
    };
    this.autoSaveInterval = 30000; // 30 seconds
    this.autoSaveTimer = null;
    this.isOnline = navigator.onLine;
    this.pendingSaves = new Map();
    
    // Initialize event listeners
    this.initializeEventListeners();
  }

  /**
   * Initialize event listeners for data protection
   */
  initializeEventListeners() {
    // Page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.saveAllData();
      }
    });

    // Page unload
    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedData()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
      this.saveAllData();
    });

    // Online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Storage events (cross-tab synchronization)
    window.addEventListener('storage', (e) => {
      if (e.key?.startsWith(this.storageKeys.localStorage)) {
        this.handleStorageChange(e);
      }
    });
  }

  /**
   * Save data to multiple storage layers
   */
  async saveData(subjectId, scoreType, scores) {
    const timestamp = Date.now();
    const data = {
      scores,
      timestamp,
      version: '1.0'
    };

    try {
      // Layer 1: localStorage (persistent)
      this.saveToLocalStorage(subjectId, scoreType, data);
      
      // Layer 2: sessionStorage (session backup)
      this.saveToSessionStorage(subjectId, scoreType, data);
      
      // Layer 3: IndexedDB (large data backup)
      await this.saveToIndexedDB(subjectId, scoreType, data);
      
      // Layer 4: Memory (immediate access)
      this.saveToMemory(subjectId, scoreType, data);
      
      // Layer 5: Server (if online)
      if (this.isOnline) {
        this.saveToServer(subjectId, scoreType, data);
      } else {
        this.queueForServerSync(subjectId, scoreType, data);
      }
      
      console.log('🔒 DATA PERSISTENCE: Data saved to all layers');
      return true;
    } catch (error) {
      console.error('❌ DATA PERSISTENCE: Error saving data:', error);
      return false;
    }
  }

  /**
   * Load data from multiple storage layers with fallback
   */
  async loadData(subjectId, scoreType) {
    const storageKey = this.getStorageKey(subjectId, scoreType);
    
    try {
      // Layer 1: Memory (fastest)
      const memoryData = this.loadFromMemory(subjectId, scoreType);
      if (memoryData && this.isValidData(memoryData)) {
        console.log('🔒 DATA PERSISTENCE: Loaded from memory');
        return memoryData.scores;
      }

      // Layer 2: localStorage (persistent)
      const localData = this.loadFromLocalStorage(subjectId, scoreType);
      if (localData && this.isValidData(localData)) {
        console.log('🔒 DATA PERSISTENCE: Loaded from localStorage');
        // Restore to memory for faster access
        this.saveToMemory(subjectId, scoreType, localData);
        return localData.scores;
      }

      // Layer 3: sessionStorage (session backup)
      const sessionData = this.loadFromSessionStorage(subjectId, scoreType);
      if (sessionData && this.isValidData(sessionData)) {
        console.log('🔒 DATA PERSISTENCE: Loaded from sessionStorage');
        this.saveToMemory(subjectId, scoreType, sessionData);
        return sessionData.scores;
      }

      // Layer 4: IndexedDB (large data)
      const indexedData = await this.loadFromIndexedDB(subjectId, scoreType);
      if (indexedData && this.isValidData(indexedData)) {
        console.log('🔒 DATA PERSISTENCE: Loaded from IndexedDB');
        this.saveToMemory(subjectId, scoreType, indexedData);
        return indexedData.scores;
      }

      // Layer 5: Server (if online)
      if (this.isOnline) {
        try {
          const serverData = await this.loadFromServer(subjectId, scoreType);
          if (serverData) {
            console.log('🔒 DATA PERSISTENCE: Loaded from server');
            this.saveToMemory(subjectId, scoreType, serverData);
            return serverData.scores;
          }
        } catch (error) {
          console.error('❌ DATA PERSISTENCE: Error loading from server:', error);
        }
      }

      console.log('🔒 DATA PERSISTENCE: No data found, returning empty object');
      return {};
    } catch (error) {
      console.error('❌ DATA PERSISTENCE: Error loading data:', error);
      return {};
    }
  }

  /**
   * localStorage operations
   */
  saveToLocalStorage(subjectId, scoreType, data) {
    try {
      const key = this.storageKeys.localStorage + `${subjectId}_${scoreType}`;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('❌ LocalStorage save error:', error);
    }
  }

  loadFromLocalStorage(subjectId, scoreType) {
    try {
      const key = this.storageKeys.localStorage + `${subjectId}_${scoreType}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ LocalStorage load error:', error);
      return null;
    }
  }

  /**
   * sessionStorage operations
   */
  saveToSessionStorage(subjectId, scoreType, data) {
    try {
      const key = this.storageKeys.sessionStorage + `${subjectId}_${scoreType}`;
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('❌ SessionStorage save error:', error);
    }
  }

  loadFromSessionStorage(subjectId, scoreType) {
    try {
      const key = this.storageKeys.sessionStorage + `${subjectId}_${scoreType}`;
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ SessionStorage load error:', error);
      return null;
    }
  }

  /**
   * IndexedDB operations
   */
  async saveToIndexedDB(subjectId, scoreType, data) {
    try {
      const db = await this.getIndexedDB();
      const transaction = db.transaction(['scores'], 'readwrite');
      const store = transaction.objectStore('scores');
      const key = `${subjectId}_${scoreType}`;
      
      await store.put({ key, data, timestamp: Date.now() });
      return true;
    } catch (error) {
      console.error('❌ IndexedDB save error:', error);
      return false;
    }
  }

  async loadFromIndexedDB(subjectId, scoreType) {
    try {
      const db = await this.getIndexedDB();
      const transaction = db.transaction(['scores'], 'readonly');
      const store = transaction.objectStore('scores');
      const key = `${subjectId}_${scoreType}`;
      
      const result = await store.get(key);
      return result ? result.data : null;
    } catch (error) {
      console.error('❌ IndexedDB load error:', error);
      return null;
    }
  }

  async getIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.storageKeys.indexedDB, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('scores')) {
          db.createObjectStore('scores');
        }
      };
    });
  }

  /**
   * Memory storage operations
   */
  saveToMemory(subjectId, scoreType, data) {
    const key = `${subjectId}_${scoreType}`;
    this.memoryStore = this.memoryStore || new Map();
    this.memoryStore.set(key, data);
  }

  loadFromMemory(subjectId, scoreType) {
    const key = `${subjectId}_${scoreType}`;
    this.memoryStore = this.memoryStore || new Map();
    return this.memoryStore.get(key) || null;
  }

  /**
   * Server operations
   */
  async saveToServer(subjectId, scoreType, data) {
    try {
      // This would integrate with your existing API
      console.log('🔒 DATA PERSISTENCE: Saving to server (would implement API call)');
      return true;
    } catch (error) {
      console.error('❌ Server save error:', error);
      return false;
    }
  }

  async loadFromServer(subjectId, scoreType) {
    try {
      // This would integrate with your existing API
      console.log('🔒 DATA PERSISTENCE: Loading from server (would implement API call)');
      return null;
    } catch (error) {
      console.error('❌ Server load error:', error);
      return null;
    }
  }

  /**
   * Auto-save functionality
   */
  startAutoSave(subjectId, scoreType, saveCallback) {
    this.stopAutoSave();
    
    this.autoSaveTimer = setInterval(() => {
      if (this.hasUnsavedData()) {
        saveCallback();
        console.log('🔒 DATA PERSISTENCE: Auto-save triggered');
      }
    }, this.autoSaveInterval);
    
    console.log('🔒 DATA PERSISTENCE: Auto-save started');
  }

  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      console.log('🔒 DATA PERSISTENCE: Auto-save stopped');
    }
  }

  /**
   * Data validation and cleanup
   */
  isValidData(data) {
    return data && 
           data.scores && 
           typeof data.scores === 'object' && 
           data.timestamp && 
           !this.isDataExpired(data.timestamp);
  }

  isDataExpired(timestamp) {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    return (Date.now() - timestamp) > maxAge;
  }

  /**
   * Utility methods
   */
  getStorageKey(subjectId, scoreType) {
    return `${subjectId}_${scoreType}`;
  }

  hasUnsavedData() {
    // Check if there's any unsaved data in memory
    return this.memoryStore && this.memoryStore.size > 0;
  }

  saveAllData() {
    // Save all data in memory to persistent storage
    if (this.memoryStore) {
      this.memoryStore.forEach((data, key) => {
        const [subjectId, scoreType] = key.split('_');
        this.saveToLocalStorage(subjectId, scoreType, data);
        this.saveToSessionStorage(subjectId, scoreType, data);
      });
    }
  }

  clearData(subjectId, scoreType) {
    const key = this.getStorageKey(subjectId, scoreType);
    
    // Clear all storage layers
    localStorage.removeItem(this.storageKeys.localStorage + key);
    sessionStorage.removeItem(this.storageKeys.sessionStorage + key);
    
    // Clear memory
    if (this.memoryStore) {
      this.memoryStore.delete(key);
    }
    
    // Clear IndexedDB
    this.clearIndexedDB(key);
    
    console.log('🔒 DATA PERSISTENCE: Data cleared for', key);
  }

  async clearIndexedDB(key) {
    try {
      const db = await this.getIndexedDB();
      const transaction = db.transaction(['scores'], 'readwrite');
      const store = transaction.objectStore('scores');
      await store.delete(key);
    } catch (error) {
      console.error('❌ IndexedDB clear error:', error);
    }
  }

  handleStorageChange(event) {
    console.log('🔒 DATA PERSISTENCE: Storage change detected', event.key);
    // Handle cross-tab synchronization
    if (event.key?.startsWith(this.storageKeys.localStorage)) {
      // Reload data from localStorage
      window.location.reload();
    }
  }

  /**
   * Data recovery methods
   */
  async recoverData() {
    console.log('🔒 DATA PERSISTENCE: Attempting data recovery...');
    
    const recoveredData = new Map();
    
    // Try to recover from all storage layers
    const storageKeys = Object.keys(localStorage);
    const scoreKeys = storageKeys.filter(key => key.startsWith(this.storageKeys.localStorage));
    
    for (const key of scoreKeys) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (this.isValidData(data)) {
          recoveredData.set(key, data);
        }
      } catch (error) {
        console.error('❌ Recovery error for key:', key, error);
      }
    }
    
    console.log('🔒 DATA PERSISTENCE: Recovered', recoveredData.size, 'data sets');
    return recoveredData;
  }
}

// Create singleton instance
const dataPersistenceManager = new DataPersistenceManager();

export default dataPersistenceManager;
