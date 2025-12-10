# Отладка неактивных кнопок

## Быстрая диагностика

Откройте консоль браузера (F12) и выполните:

```javascript
// Проверка кнопки "Добавить"
const btn = document.getElementById('add-task-btn');
console.log('Кнопка:', btn);
console.log('disabled:', btn?.disabled);
console.log('hasAttribute disabled:', btn?.hasAttribute('disabled'));
console.log('className:', btn?.className);
console.log('computed style:', {
    pointerEvents: window.getComputedStyle(btn).pointerEvents,
    cursor: window.getComputedStyle(btn).cursor,
    opacity: window.getComputedStyle(btn).opacity
});

// Принудительная активация
if (btn) {
    btn.disabled = false;
    btn.removeAttribute('disabled');
    btn.classList.remove('disabled');
    console.log('✅ Кнопка активирована вручную');
}

// Проверка всех disabled кнопок
document.querySelectorAll('button[disabled]').forEach(b => {
    console.log('Disabled button:', b.id || b.className, b);
});
```

## Проверка обработчиков

```javascript
// Проверка что обработчик добавлен
const btn = document.getElementById('add-task-btn');
const listeners = getEventListeners(btn); // Работает только в Chrome DevTools
console.log('Listeners:', listeners);

// Проверка вручную
btn.onclick = function() {
    console.log('Кнопка кликнута!');
    addTask();
};
```

## Проверка после авторизации

После авторизации выполните:

```javascript
// Проверка что приложение показано
const appContainer = document.getElementById('app-container');
console.log('app-container display:', appContainer?.style.display);

// Принудительная активация всех кнопок
activateAllButtons();

// Проверка валидации
validateTaskInput();

// Введите текст в поле
const input = document.getElementById('task-input');
input.value = 'Тестовая задача';
input.dispatchEvent(new Event('input'));
validateTaskInput();

// Проверка кнопки снова
const btn = document.getElementById('add-task-btn');
console.log('После ввода текста:', {
    disabled: btn?.disabled,
    value: input?.value
});
```

## Возможные причины

1. **CSS блокирует клики** - проверьте `pointer-events: none`
2. **Элемент перекрыт другим** - проверьте z-index
3. **Обработчик не добавлен** - проверьте addEventListener
4. **Кнопка вне видимой области** - проверьте display и visibility

## Исправления применены

✅ Убран `disabled` из HTML
✅ Добавлена функция `activateAllButtons()`
✅ Улучшена инициализация после авторизации
✅ Добавлено логирование для отладки

