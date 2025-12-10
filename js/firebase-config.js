// Конфигурация Firebase
// ⚠️ ВАЖНО: Замените эти значения на свои из Firebase Console
// Получить можно в: Project Settings → Your apps → Web app

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Проверка что конфигурация заполнена
if (firebaseConfig.apiKey === "YOUR_API_KEY") {
  console.warn('⚠️ Firebase не настроен! Замените значения в js/firebase-config.js');
}

