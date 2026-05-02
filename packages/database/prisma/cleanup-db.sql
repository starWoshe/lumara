-- =============================================
-- LUMARA — ОЧИЩЕННЯ БАЗИ ДАНИХ
-- Залишає лише адмін-акаунт, видаляє все інше
-- =============================================
-- КРОК 0: Спочатку переглянь всі акаунти і знайди свій
-- SELECT id, email, role FROM users ORDER BY created_at;

-- КРОК 1: Встанови свій email нижче і задай role = ADMIN
-- ⚠️ ЗАМІН 'your@email.com' на свій реальний email
UPDATE users SET role = 'ADMIN' WHERE email = 'your@email.com';

-- КРОК 2: Перевір що правильний акаунт отримав ADMIN
-- SELECT id, email, role FROM users WHERE role = 'ADMIN';
-- Якщо бачиш правильний рядок — продовжуй

-- =============================================
-- ВИДАЛЕННЯ ВСІХ РОЗМОВ І ПОВІДОМЛЕНЬ
-- =============================================

-- Спочатку повідомлення (залежать від conversations)
DELETE FROM messages;

-- Потім самі розмови
DELETE FROM conversations;

-- =============================================
-- ВИДАЛЕННЯ ВСІХ ДАНИХ НЕАДМІН-КОРИСТУВАЧІВ
-- =============================================

-- Підписки
DELETE FROM subscriptions WHERE user_id NOT IN (
  SELECT id FROM users WHERE role = 'ADMIN'
);

-- Записи на курси
DELETE FROM enrollments WHERE user_id NOT IN (
  SELECT id FROM users WHERE role = 'ADMIN'
);

-- Логи активності
DELETE FROM activity_logs WHERE user_id NOT IN (
  SELECT id FROM users WHERE role = 'ADMIN'
);

-- Стани анонсів
DELETE FROM announcement_states WHERE user_id NOT IN (
  SELECT id FROM users WHERE role = 'ADMIN'
);

-- Сесії OAuth
DELETE FROM sessions WHERE user_id NOT IN (
  SELECT id FROM users WHERE role = 'ADMIN'
);

-- Акаунти OAuth (Google тощо)
DELETE FROM accounts WHERE user_id NOT IN (
  SELECT id FROM users WHERE role = 'ADMIN'
);

-- Профілі неадмінів
DELETE FROM profiles WHERE user_id NOT IN (
  SELECT id FROM users WHERE role = 'ADMIN'
);

-- Самі користувачі (неадміни)
DELETE FROM users WHERE role != 'ADMIN';

-- =============================================
-- ОЧИЩЕННЯ ОПЕРАЦІЙНИХ ТАБЛИЦЬ
-- =============================================

DELETE FROM outreach_responses;
DELETE FROM referral_clicks;
DELETE FROM keyword_clicks;
DELETE FROM token_usage;
DELETE FROM user_context;
DELETE FROM telegram_conversations;

-- =============================================
-- ЗАЛИШАЄТЬСЯ (не чіпаємо):
-- academy_gossip  — контент плітків
-- admin_settings  — конфіг
-- telegram_groups — список груп
-- agents          — конфіг агентів
-- monitor_states  — стан моніторів
-- =============================================

-- ФІНАЛЬНА ПЕРЕВІРКА
SELECT 'users' as tbl, count(*) FROM users
UNION ALL SELECT 'profiles', count(*) FROM profiles
UNION ALL SELECT 'conversations', count(*) FROM conversations
UNION ALL SELECT 'messages', count(*) FROM messages
UNION ALL SELECT 'outreach_responses', count(*) FROM outreach_responses;
