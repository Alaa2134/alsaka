/**
 * نظام التخزين المحلي المتقدم - يعمل بدون إنترنت
 * يستخدم IndexedDB للبيانات الكبيرة و localStorage للإعدادات
 */

const DB_NAME = 'invoice_system_offline';
const DB_VERSION = 1;

// الجداول المدعومة للتخزين المحلي
export type OfflineTable = 
  | 'products' 
  | 'clients' 
  | 'invoices' 
  | 'invoice_items'
  | 'warehouses' 
  | 'categories'
  | 'payments'
  | 'returns'
  | 'return_items'
  | 'tenants'
  | 'company_settings'
  | 'app_users';

interface PendingOperation {
  id: string;
  table: OfflineTable;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
}

// فتح قاعدة البيانات
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // إنشاء الجداول
      const tables: OfflineTable[] = [
        'products', 'clients', 'invoices', 'invoice_items',
        'warehouses', 'categories', 'payments', 'returns',
        'return_items', 'tenants', 'company_settings', 'app_users'
      ];

      tables.forEach(table => {
        if (!db.objectStoreNames.contains(table)) {
          const store = db.createObjectStore(table, { keyPath: 'id' });
          store.createIndex('updated_at', 'updated_at', { unique: false });
          store.createIndex('tenant_id', 'tenant_id', { unique: false });
        }
      });

      // جدول العمليات المعلقة
      if (!db.objectStoreNames.contains('pending_operations')) {
        const pendingStore = db.createObjectStore('pending_operations', { keyPath: 'id' });
        pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
        pendingStore.createIndex('table', 'table', { unique: false });
      }

      // جدول الإعدادات
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
}

// حفظ البيانات محلياً
export async function saveToLocal<T extends { id: string }>(
  table: OfflineTable,
  data: T | T[]
): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(table, 'readwrite');
  const store = tx.objectStore(table);

  const items = Array.isArray(data) ? data : [data];
  
  for (const item of items) {
    store.put({
      ...item,
      _offline_saved_at: Date.now()
    });
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

// قراءة البيانات من التخزين المحلي
export async function getFromLocal<T>(
  table: OfflineTable,
  tenantId?: string
): Promise<T[]> {
  const db = await openDatabase();
  const tx = db.transaction(table, 'readonly');
  const store = tx.objectStore(table);

  return new Promise((resolve, reject) => {
    let request: IDBRequest;

    if (tenantId) {
      const index = store.index('tenant_id');
      request = index.getAll(tenantId);
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => {
      db.close();
      resolve(request.result || []);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

// قراءة عنصر واحد
export async function getOneFromLocal<T>(
  table: OfflineTable,
  id: string
): Promise<T | null> {
  const db = await openDatabase();
  const tx = db.transaction(table, 'readonly');
  const store = tx.objectStore(table);

  return new Promise((resolve, reject) => {
    const request = store.get(id);

    request.onsuccess = () => {
      db.close();
      resolve(request.result || null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

// حذف من التخزين المحلي
export async function deleteFromLocal(
  table: OfflineTable,
  id: string
): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(table, 'readwrite');
  const store = tx.objectStore(table);

  return new Promise((resolve, reject) => {
    const request = store.delete(id);

    request.onsuccess = () => {
      db.close();
      resolve();
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

// مسح كل البيانات من جدول
export async function clearTable(table: OfflineTable): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(table, 'readwrite');
  const store = tx.objectStore(table);

  return new Promise((resolve, reject) => {
    const request = store.clear();

    request.onsuccess = () => {
      db.close();
      resolve();
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

// إضافة عملية معلقة
export async function addPendingOperation(
  table: OfflineTable,
  operation: 'insert' | 'update' | 'delete',
  data: any
): Promise<string> {
  const db = await openDatabase();
  const tx = db.transaction('pending_operations', 'readwrite');
  const store = tx.objectStore('pending_operations');

  const pendingOp: PendingOperation = {
    id: crypto.randomUUID(),
    table,
    operation,
    data,
    timestamp: Date.now(),
    retryCount: 0
  };

  return new Promise((resolve, reject) => {
    const request = store.add(pendingOp);

    request.onsuccess = () => {
      db.close();
      resolve(pendingOp.id);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

// الحصول على العمليات المعلقة
export async function getPendingOperations(): Promise<PendingOperation[]> {
  const db = await openDatabase();
  const tx = db.transaction('pending_operations', 'readonly');
  const store = tx.objectStore('pending_operations');
  const index = store.index('timestamp');

  return new Promise((resolve, reject) => {
    const request = index.getAll();

    request.onsuccess = () => {
      db.close();
      resolve(request.result || []);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

// حذف عملية معلقة
export async function removePendingOperation(id: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('pending_operations', 'readwrite');
  const store = tx.objectStore('pending_operations');

  return new Promise((resolve, reject) => {
    const request = store.delete(id);

    request.onsuccess = () => {
      db.close();
      resolve();
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

// تحديث عدد المحاولات
export async function updateRetryCount(id: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('pending_operations', 'readwrite');
  const store = tx.objectStore('pending_operations');

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const op = getRequest.result as PendingOperation;
      if (op) {
        op.retryCount += 1;
        store.put(op);
      }
      db.close();
      resolve();
    };
    getRequest.onerror = () => {
      db.close();
      reject(getRequest.error);
    };
  });
}

// حفظ الإعدادات
export async function saveSetting(key: string, value: any): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('settings', 'readwrite');
  const store = tx.objectStore('settings');

  return new Promise((resolve, reject) => {
    const request = store.put({ key, value, updated_at: Date.now() });

    request.onsuccess = () => {
      db.close();
      resolve();
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

// قراءة الإعدادات
export async function getSetting<T>(key: string): Promise<T | null> {
  const db = await openDatabase();
  const tx = db.transaction('settings', 'readonly');
  const store = tx.objectStore('settings');

  return new Promise((resolve, reject) => {
    const request = store.get(key);

    request.onsuccess = () => {
      db.close();
      resolve(request.result?.value || null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

// الحصول على عدد العمليات المعلقة
export async function getPendingCount(): Promise<number> {
  const ops = await getPendingOperations();
  return ops.length;
}

// تنظيف البيانات القديمة (أكثر من 30 يوم)
export async function cleanupOldData(): Promise<void> {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  const db = await openDatabase();
  const tx = db.transaction('pending_operations', 'readwrite');
  const store = tx.objectStore('pending_operations');
  const index = store.index('timestamp');

  return new Promise((resolve, reject) => {
    const range = IDBKeyRange.upperBound(thirtyDaysAgo);
    const request = index.openCursor(range);

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        db.close();
        resolve();
      }
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

// التحقق من دعم IndexedDB
export function isIndexedDBSupported(): boolean {
  return typeof indexedDB !== 'undefined';
}

// حجم التخزين المستخدم
export async function getStorageUsage(): Promise<{ used: number; quota: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0
    };
  }
  return { used: 0, quota: 0 };
}
