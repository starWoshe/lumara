-- =============================================
-- LUMARA — ОЧИЩЕННЯ БАЗИ ДАНИХ
-- Залишає адміна (woshem68@gmail.com) БЕЗ ЗМІН
-- Видаляє лише 3 тестових юзерів та їх дані
-- ⚠️ DELETE FROM = видалення рядків, НЕ таблиць
-- =============================================

-- ЗАЛИШАЄТЬСЯ незмінним:
--   fdd5eaf7-... woshem68@gmail.com (ADMIN)

-- ВИДАЛЯЄТЬСЯ:
--   d58484c4-... sharkozal@gmail.com
--   eadbb9b9-... u92668401@gmail.com
--   7cd6ec84-... shemchukaga@gmail.com

-- Для зручності — CTE з ID адміна
WITH admin_ids AS (
  SELECT id FROM users WHERE role = 'ADMIN'
)

-- КРОК 1: повідомлення в розмовах неадмінів
, del_messages AS (
  DELETE FROM messages
  WHERE conversation_id IN (
    SELECT id FROM conversations
    WHERE user_id NOT IN (SELECT id FROM admin_ids)
  )
  RETURNING 1
)

-- КРОК 2: розмови неадмінів
, del_conversations AS (
  DELETE FROM conversations
  WHERE user_id NOT IN (SELECT id FROM admin_ids)
  RETURNING 1
)

-- КРОК 3: підписки
, del_subscriptions AS (
  DELETE FROM subscriptions
  WHERE user_id NOT IN (SELECT id FROM admin_ids)
  RETURNING 1
)

-- КРОК 4: записи на курси
, del_enrollments AS (
  DELETE FROM enrollments
  WHERE user_id NOT IN (SELECT id FROM admin_ids)
  RETURNING 1
)

-- КРОК 5: логи активності
, del_logs AS (
  DELETE FROM activity_logs
  WHERE user_id NOT IN (SELECT id FROM admin_ids)
  RETURNING 1
)

-- КРОК 6: стани анонсів
, del_announcements AS (
  DELETE FROM announcement_states
  WHERE user_id NOT IN (SELECT id FROM admin_ids)
  RETURNING 1
)

-- КРОК 7: сесії OAuth
, del_sessions AS (
  DELETE FROM sessions
  WHERE user_id NOT IN (SELECT id FROM admin_ids)
  RETURNING 1
)

-- КРОК 8: акаунти OAuth (Google тощо)
, del_accounts AS (
  DELETE FROM accounts
  WHERE user_id NOT IN (SELECT id FROM admin_ids)
  RETURNING 1
)

-- КРОК 9: профілі неадмінів
, del_profiles AS (
  DELETE FROM profiles
  WHERE user_id NOT IN (SELECT id FROM admin_ids)
  RETURNING 1
)

-- КРОК 10: самі юзери-неадміни
, del_users AS (
  DELETE FROM users
  WHERE role != 'ADMIN'
  RETURNING 1
)

-- Операційні таблиці (не прив'язані до юзерів)
, del_outreach AS (
  DELETE FROM outreach_responses RETURNING 1
)
, del_referral AS (
  DELETE FROM referral_clicks RETURNING 1
)
, del_keyword AS (
  DELETE FROM keyword_clicks RETURNING 1
)
, del_tokens AS (
  DELETE FROM token_usage RETURNING 1
)
, del_context AS (
  DELETE FROM user_context RETURNING 1
)
, del_tg_conv AS (
  DELETE FROM telegram_conversations RETURNING 1
)

-- РЕЗУЛЬТАТ: скільки рядків видалено
SELECT
  (SELECT count(*) FROM del_messages)      AS del_messages,
  (SELECT count(*) FROM del_conversations) AS del_conversations,
  (SELECT count(*) FROM del_users)         AS del_users,
  (SELECT count(*) FROM del_profiles)      AS del_profiles,
  (SELECT count(*) FROM del_outreach)      AS del_outreach;
