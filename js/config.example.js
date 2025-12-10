// Пример конфигурационного файла
// Скопируйте этот файл в config.js и заполните своими данными

export const SUPABASE_CONFIG = {
    // URL вашего Supabase проекта
    // Найти в: Supabase Dashboard → Settings → API → Project URL
    url: 'https://YOUR_PROJECT_ID.supabase.co',
    
    // Anon (public) key
    // Найти в: Supabase Dashboard → Settings → API → anon public
    anonKey: 'YOUR_ANON_KEY_HERE',
    
    // Включить синхронизацию (true/false)
    enabled: false
};

// Для Firebase (альтернативный вариант)
export const FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "123456789",
    appId: "YOUR_APP_ID"
};

