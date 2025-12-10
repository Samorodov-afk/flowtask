// Модуль синхронизации с Firebase
// Требует: Firebase SDK (добавить в index.html)

import { firebaseConfig } from './firebase-config.js';
import { StorageManager } from './storage.js';

// Инициализация Firebase (будет выполнена при первом импорте)
let firebaseApp = null;
let firestore = null;
let auth = null;
let isInitialized = false;

/**
 * Инициализация Firebase
 */
async function initFirebase() {
    if (isInitialized) return;
    
    try {
        // Проверяем что Firebase загружен
        if (typeof firebase === 'undefined') {
            console.error('Firebase SDK не загружен! Добавьте скрипты в index.html');
            return false;
        }

        // Инициализируем Firebase
        firebaseApp = firebase.initializeApp(firebaseConfig);
        firestore = firebase.firestore();
        auth = firebase.auth();
        
        isInitialized = true;
        console.log('✅ Firebase инициализирован');
        return true;
    } catch (error) {
        console.error('Ошибка инициализации Firebase:', error);
        return false;
    }
}

/**
 * Получить текущего пользователя
 */
function getCurrentUser() {
    return auth?.currentUser;
}

/**
 * Регистрация нового пользователя
 */
export async function signUp(email, password) {
    try {
        await initFirebase();
        if (!auth) return { success: false, error: 'Firebase не инициализирован' };

        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Создаем документ пользователя в Firestore
        await firestore.collection('users').doc(user.uid).set({
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastSync: firebase.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, user: user };
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Вход пользователя
 */
export async function signIn(email, password) {
    try {
        await initFirebase();
        if (!auth) return { success: false, error: 'Firebase не инициализирован' };

        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Ошибка входа:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Выход пользователя
 */
export async function signOut() {
    try {
        if (auth) {
            await auth.signOut();
            return { success: true };
        }
        return { success: false, error: 'Не авторизован' };
    } catch (error) {
        console.error('Ошибка выхода:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Слушатель изменений авторизации
 */
export function onAuthStateChanged(callback) {
    initFirebase().then(() => {
        if (auth) {
            auth.onAuthStateChanged(callback);
        }
    });
}

/**
 * Синхронизация задач с Firebase
 */
export async function syncTasks(tasks) {
    try {
        const user = getCurrentUser();
        if (!user) return { success: false, error: 'Не авторизован' };

        await initFirebase();
        if (!firestore) return { success: false, error: 'Firebase не инициализирован' };

        const tasksRef = firestore.collection('users').doc(user.uid).collection('tasks');
        
        // Удаляем все старые задачи
        const snapshot = await tasksRef.get();
        const batch = firestore.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        // Добавляем новые задачи
        const addBatch = firestore.batch();
        tasks.forEach(task => {
            const taskRef = tasksRef.doc(task.id);
            addBatch.set(taskRef, {
                ...task,
                deadline: task.deadline ? firebase.firestore.Timestamp.fromDate(new Date(task.deadline)) : null,
                createdAt: task.createdAt ? firebase.firestore.Timestamp.fromDate(new Date(task.createdAt)) : firebase.firestore.FieldValue.serverTimestamp(),
                completedAt: task.completedAt ? firebase.firestore.Timestamp.fromDate(new Date(task.completedAt)) : null
            });
        });
        await addBatch.commit();

        // Обновляем время последней синхронизации
        await firestore.collection('users').doc(user.uid).update({
            lastSync: firebase.firestore.FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (error) {
        console.error('Ошибка синхронизации задач:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Загрузка задач из Firebase
 */
export async function loadTasks() {
    try {
        const user = getCurrentUser();
        if (!user) return { success: false, error: 'Не авторизован', tasks: [] };

        await initFirebase();
        if (!firestore) return { success: false, error: 'Firebase не инициализирован', tasks: [] };

        const snapshot = await firestore
            .collection('users')
            .doc(user.uid)
            .collection('tasks')
            .get();

        const tasks = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                deadline: data.deadline?.toDate()?.toISOString() || null,
                createdAt: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
                completedAt: data.completedAt?.toDate()?.toISOString() || null
            };
        });

        return { success: true, tasks };
    } catch (error) {
        console.error('Ошибка загрузки задач:', error);
        return { success: false, error: error.message, tasks: [] };
    }
}

/**
 * Слушатель изменений задач в реальном времени
 */
export function subscribeToTasks(callback) {
    const user = getCurrentUser();
    if (!user) return () => {};

    initFirebase().then(() => {
        if (!firestore) return;

        const unsubscribe = firestore
            .collection('users')
            .doc(user.uid)
            .collection('tasks')
            .onSnapshot(snapshot => {
                const tasks = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        deadline: data.deadline?.toDate()?.toISOString() || null,
                        createdAt: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
                        completedAt: data.completedAt?.toDate()?.toISOString() || null
                    };
                });
                callback(tasks);
            });

        return unsubscribe;
    });
}

/**
 * Синхронизация категорий
 */
export async function syncCategories(categories) {
    try {
        const user = getCurrentUser();
        if (!user) return { success: false, error: 'Не авторизован' };

        await initFirebase();
        if (!firestore) return { success: false, error: 'Firebase не инициализирован' };

        const categoriesRef = firestore.collection('users').doc(user.uid).collection('categories');
        
        const snapshot = await categoriesRef.get();
        const batch = firestore.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        const addBatch = firestore.batch();
        categories.forEach(category => {
            const catRef = categoriesRef.doc(category.id);
            addBatch.set(catRef, category);
        });
        await addBatch.commit();

        return { success: true };
    } catch (error) {
        console.error('Ошибка синхронизации категорий:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Загрузка категорий из Firebase
 */
export async function loadCategories() {
    try {
        const user = getCurrentUser();
        if (!user) return { success: false, error: 'Не авторизован', categories: [] };

        await initFirebase();
        if (!firestore) return { success: false, error: 'Firebase не инициализирован', categories: [] };

        const snapshot = await firestore
            .collection('users')
            .doc(user.uid)
            .collection('categories')
            .get();

        const categories = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return { success: true, categories };
    } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
        return { success: false, error: error.message, categories: [] };
    }
}

/**
 * Полная синхронизация всех данных
 */
export async function syncAll() {
    try {
        const user = getCurrentUser();
        if (!user) return { success: false, error: 'Не авторизован' };

        // Загружаем локальные данные
        const tasks = StorageManager.get('flowTasks', user.uid) || [];
        const categories = StorageManager.get('flowCategories', user.uid) || [];
        const quickTasks = StorageManager.get('flowQuickTasks', user.uid) || [];
        const settings = StorageManager.get('flowSettings', user.uid) || {};

        // Синхронизируем с Firebase
        const results = await Promise.all([
            syncTasks(tasks),
            syncCategories(categories)
        ]);

        const allSuccess = results.every(r => r.success);
        return { 
            success: allSuccess, 
            results: {
                tasks: results[0],
                categories: results[1]
            }
        };
    } catch (error) {
        console.error('Ошибка полной синхронизации:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Загрузка всех данных из Firebase
 */
export async function loadAll() {
    try {
        const user = getCurrentUser();
        if (!user) return { success: false, error: 'Не авторизован' };

        const [tasksResult, categoriesResult] = await Promise.all([
            loadTasks(),
            loadCategories()
        ]);

        // Сохраняем в localStorage
        if (tasksResult.success) {
            StorageManager.set('flowTasks', tasksResult.tasks, user.uid);
        }
        if (categoriesResult.success) {
            StorageManager.set('flowCategories', categoriesResult.categories, user.uid);
        }

        return {
            success: tasksResult.success && categoriesResult.success,
            tasks: tasksResult.tasks || [],
            categories: categoriesResult.categories || []
        };
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        return { success: false, error: error.message };
    }
}

// Автоматическая инициализация при импорте
initFirebase();

