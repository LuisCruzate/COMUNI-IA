// js/db.js - Capa de persistencia local (Backend Fase 1)
const DB_NAME = 'ComuniAI_DB';
const DB_VERSION = 1;

const dbPromise = new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    // Almacén de Historial
    if (!db.objectStoreNames.contains('history')) {
      db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
    }
    // Almacén de Frases
    if (!db.objectStoreNames.contains('phrases')) {
      db.createObjectStore('phrases', { keyPath: 'id', autoIncrement: true });
    }
    // Almacén de Métricas (Para la investigación)
    if (!db.objectStoreNames.contains('metrics')) {
      db.createObjectStore('metrics', { keyPath: 'id', autoIncrement: true });
    }
  };

  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

// Funciones de utilidad
const DB = {
  async add(storeName, data) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.add(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAll(storeName) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async clear(storeName) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async delete(storeName, id) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};