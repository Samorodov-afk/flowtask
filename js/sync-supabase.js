// Модуль синхронизации с Supabase
// Замените YOUR_SUPABASE_URL и YOUR_SUPABASE_ANON_KEY на ваши ключи

let supabaseClient = null;
let isInitialized = false;

/**
 * Инициализация Supabase клиента
 * @param {string} supabaseUrl - URL вашего Supabase проекта
 * @param {string} supabaseKey - Anon (public) key
 */
export function initSupabase(supabaseUrl, supabaseKey) {
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase client not loaded. Add script tag: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
        return false;
    }
    
    try {
        supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
        isInitialized = true;
        console.log('Supabase initialized');
        return true;
    } catch (error) {
        console.error('Supabase initialization error:', error);
        return false;
    }
}

/**
 * Регистрация нового пользователя
 * @param {string} email - Email
 * @param {string} password - Пароль
 * @param {string} name - Имя
 */
export async function signUp(email, password, name) {
    if (!isInitialized) {
        throw new Error('Supabase not initialized');
    }
    
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name
                }
            }
        });
        
        if (error) throw error;
        
        // Создаем запись пользователя в таблице users
        if (data.user) {
            const { error: dbError } = await supabaseClient
                .from('users')
                .insert({
                    id: data.user.id,
                    email: email,
                    name: name,
                    password_hash: '' // Пароль хранится в auth, не в БД
                });
            
            if (dbError) {
                console.error('Error creating user record:', dbError);
            }
        }
        
        return { success: true, user: data.user, error: null };
    } catch (error) {
        console.error('Sign up error:', error);
        return { success: false, user: null, error: error.message };
    }
}

/**
 * Вход пользователя
 * @param {string} email - Email
 * @param {string} password - Пароль
 */
export async function signIn(email, password) {
    if (!isInitialized) {
        throw new Error('Supabase not initialized');
    }
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        return { success: true, user: data.user, error: null };
    } catch (error) {
        console.error('Sign in error:', error);
        return { success: false, user: null, error: error.message };
    }
}

/**
 * Выход пользователя
 */
export async function signOut() {
    if (!isInitialized) return;
    
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        return { success: true, error: null };
    } catch (error) {
        console.error('Sign out error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Получить текущего пользователя
 */
export async function getCurrentUser() {
    if (!isInitialized) return null;
    
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        return user;
    } catch (error) {
        console.error('Get user error:', error);
        return null;
    }
}

/**
 * Синхронизация задач с сервером
 * @param {Array} tasks - Массив задач
 */
export async function syncTasks(tasks) {
    if (!isInitialized) {
        throw new Error('Supabase not initialized');
    }
    
    const user = await getCurrentUser();
    if (!user) {
        throw new Error('User not authenticated');
    }
    
    try {
        // Удаляем все задачи пользователя
        await supabaseClient
            .from('tasks')
            .delete()
            .eq('user_id', user.id);
        
        // Вставляем новые задачи
        const tasksToInsert = tasks.map(task => ({
            user_id: user.id,
            text: task.text,
            priority: task.priority,
            category: task.category,
            deadline: task.deadline || null,
            completed: task.completed || false,
            completed_at: task.completedAt || null,
            archived: task.archived || false,
            notes: task.notes || null,
            created_at: task.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString()
        }));
        
        const { data, error } = await supabaseClient
            .from('tasks')
            .insert(tasksToInsert)
            .select();
        
        if (error) throw error;
        
        return { success: true, data, error: null };
    } catch (error) {
        console.error('Sync tasks error:', error);
        return { success: false, data: null, error: error.message };
    }
}

/**
 * Загрузка задач с сервера
 */
export async function loadTasks() {
    if (!isInitialized) {
        throw new Error('Supabase not initialized');
    }
    
    const user = await getCurrentUser();
    if (!user) {
        throw new Error('User not authenticated');
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Преобразуем в формат приложения
        const tasks = data.map(task => ({
            id: task.id,
            text: task.text,
            priority: task.priority,
            category: task.category,
            deadline: task.deadline,
            completed: task.completed,
            completedAt: task.completed_at,
            archived: task.archived,
            notes: task.notes,
            createdAt: task.created_at
        }));
        
        return { success: true, tasks, error: null };
    } catch (error) {
        console.error('Load tasks error:', error);
        return { success: false, tasks: [], error: error.message };
    }
}

/**
 * Добавление одной задачи
 */
export async function addTask(task) {
    if (!isInitialized) {
        throw new Error('Supabase not initialized');
    }
    
    const user = await getCurrentUser();
    if (!user) {
        throw new Error('User not authenticated');
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('tasks')
            .insert({
                user_id: user.id,
                text: task.text,
                priority: task.priority,
                category: task.category,
                deadline: task.deadline || null,
                completed: task.completed || false,
                archived: task.archived || false,
                notes: task.notes || null
            })
            .select()
            .single();
        
        if (error) throw error;
        
        return { success: true, task: data, error: null };
    } catch (error) {
        console.error('Add task error:', error);
        return { success: false, task: null, error: error.message };
    }
}

/**
 * Обновление задачи
 */
export async function updateTask(taskId, updates) {
    if (!isInitialized) {
        throw new Error('Supabase not initialized');
    }
    
    const user = await getCurrentUser();
    if (!user) {
        throw new Error('User not authenticated');
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('tasks')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', taskId)
            .eq('user_id', user.id)
            .select()
            .single();
        
        if (error) throw error;
        
        return { success: true, task: data, error: null };
    } catch (error) {
        console.error('Update task error:', error);
        return { success: false, task: null, error: error.message };
    }
}

/**
 * Удаление задачи
 */
export async function deleteTask(taskId) {
    if (!isInitialized) {
        throw new Error('Supabase not initialized');
    }
    
    const user = await getCurrentUser();
    if (!user) {
        throw new Error('User not authenticated');
    }
    
    try {
        const { error } = await supabaseClient
            .from('tasks')
            .delete()
            .eq('id', taskId)
            .eq('user_id', user.id);
        
        if (error) throw error;
        
        return { success: true, error: null };
    } catch (error) {
        console.error('Delete task error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Синхронизация категорий
 */
export async function syncCategories(categories) {
    if (!isInitialized) {
        throw new Error('Supabase not initialized');
    }
    
    const user = await getCurrentUser();
    if (!user) {
        throw new Error('User not authenticated');
    }
    
    try {
        // Удаляем все категории пользователя
        await supabaseClient
            .from('categories')
            .delete()
            .eq('user_id', user.id);
        
        // Вставляем новые категории
        const categoriesToInsert = categories.map(cat => ({
            user_id: user.id,
            name: cat.name,
            color: cat.color
        }));
        
        const { data, error } = await supabaseClient
            .from('categories')
            .insert(categoriesToInsert)
            .select();
        
        if (error) throw error;
        
        return { success: true, data, error: null };
    } catch (error) {
        console.error('Sync categories error:', error);
        return { success: false, data: null, error: error.message };
    }
}

/**
 * Загрузка категорий с сервера
 */
export async function loadCategories() {
    if (!isInitialized) {
        throw new Error('Supabase not initialized');
    }
    
    const user = await getCurrentUser();
    if (!user) {
        throw new Error('User not authenticated');
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('categories')
            .select('*')
            .eq('user_id', user.id);
        
        if (error) throw error;
        
        return { success: true, categories: data || [], error: null };
    } catch (error) {
        console.error('Load categories error:', error);
        return { success: false, categories: [], error: error.message };
    }
}

/**
 * Подписка на изменения задач (real-time)
 * @param {Function} callback - Функция обратного вызова
 */
export function subscribeToTasks(callback) {
    if (!isInitialized) {
        console.error('Supabase not initialized');
        return null;
    }
    
    const user = getCurrentUser();
    if (!user) {
        console.error('User not authenticated');
        return null;
    }
    
    const subscription = supabaseClient
        .channel('tasks-changes')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'tasks',
                filter: `user_id=eq.${user.id}`
            }, 
            (payload) => {
                callback(payload);
            }
        )
        .subscribe();
    
    return subscription;
}

/**
 * Проверка подключения к интернету
 */
export function isOnline() {
    return navigator.onLine;
}

/**
 * Гибридное сохранение: localStorage + Supabase
 */
export class HybridStorage {
    constructor() {
        this.useSync = isInitialized && isOnline();
    }
    
    async save(key, data, userId) {
        // Всегда сохраняем в localStorage (офлайн поддержка)
        try {
            const storageKey = userId ? `${key}_${userId}` : key;
            localStorage.setItem(storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('LocalStorage save error:', error);
        }
        
        // Если онлайн и Supabase инициализирован - синхронизируем
        if (this.useSync && isOnline()) {
            try {
                if (key === 'flowTasks') {
                    await syncTasks(data);
                } else if (key === 'flowCategories') {
                    await syncCategories(data);
                }
            } catch (error) {
                console.error('Sync error:', error);
                // Продолжаем работу с localStorage
            }
        }
    }
    
    async load(key, userId) {
        // Сначала пытаемся загрузить с сервера
        if (this.useSync && isOnline()) {
            try {
                if (key === 'flowTasks') {
                    const result = await loadTasks();
                    if (result.success && result.tasks.length > 0) {
                        // Сохраняем в localStorage
                        const storageKey = userId ? `${key}_${userId}` : key;
                        localStorage.setItem(storageKey, JSON.stringify(result.tasks));
                        return result.tasks;
                    }
                } else if (key === 'flowCategories') {
                    const result = await loadCategories();
                    if (result.success && result.categories.length > 0) {
                        const storageKey = userId ? `${key}_${userId}` : key;
                        localStorage.setItem(storageKey, JSON.stringify(result.categories));
                        return result.categories;
                    }
                }
            } catch (error) {
                console.error('Load from server error:', error);
                // Продолжаем с localStorage
            }
        }
        
        // Загружаем из localStorage
        try {
            const storageKey = userId ? `${key}_${userId}` : key;
            const data = localStorage.getItem(storageKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('LocalStorage load error:', error);
            return null;
        }
    }
}

// Экспортируем экземпляр
export const hybridStorage = new HybridStorage();

