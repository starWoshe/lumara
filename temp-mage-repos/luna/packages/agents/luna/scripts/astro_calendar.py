#!/usr/bin/env python3
"""
Астрономічний календар LUNA
Обчислює астрологічні події на наступні 30 днів:
- Знаки та фази Місяця
- Ретроградні планети
- Новолуння і Повня
- Входи планет у нові знаки
"""

import ephem
import json
from datetime import datetime, timedelta, timezone
from typing import Optional

# Часовий пояс Київ (UTC+2, або UTC+3 влітку — беремо UTC+2 як базу)
KYIV_UTC_OFFSET = 2

ZODIAC_SIGNS_UA = [
    'Овен', 'Тілець', 'Близнюки', 'Рак', 'Лев', 'Діва',
    'Терези', 'Скорпіон', 'Стрілець', 'Козоріг', 'Водолій', 'Риби'
]

MOON_PHASES_UA = {
    'new': 'Новолуння 🌑',
    'waxing_crescent': 'Молодий Місяць 🌒',
    'first_quarter': 'Перша чверть 🌓',
    'waxing_gibbous': 'Зростаючий Місяць 🌔',
    'full': 'Повня 🌕',
    'waning_gibbous': 'Спадний Місяць 🌖',
    'last_quarter': 'Остання чверть 🌗',
    'waning_crescent': 'Темний Місяць 🌘',
}


def get_zodiac_sign(longitude_deg: float) -> str:
    """Повертає знак зодіаку за еклептичною довготою (0-360°)."""
    sign_index = int(longitude_deg / 30) % 12
    return ZODIAC_SIGNS_UA[sign_index]


def get_moon_phase(moon: ephem.Moon) -> str:
    """Визначає фазу Місяця за освітленістю."""
    phase = moon.phase  # 0-100 (відсоток освітленості)
    # Отримуємо попередній і наступний новомісяці для визначення зростання/спадання
    # Спрощена логіка: < 50 = зростає або 0-7 день після новолуння
    if phase < 2:
        return 'new'
    elif phase < 45:
        return 'waxing_crescent'
    elif phase < 55:
        return 'first_quarter'
    elif phase < 98:
        return 'waxing_gibbous'
    elif phase >= 98:
        return 'full'
    else:
        return 'waning_gibbous'


def get_moon_phase_precise(date: datetime) -> str:
    """Точна фаза Місяця на конкретну дату."""
    moon = ephem.Moon(date)
    prev_new = ephem.previous_new_moon(date)
    next_new = ephem.next_new_moon(date)

    cycle_length = next_new - prev_new
    elapsed = ephem.Date(date) - prev_new
    ratio = elapsed / cycle_length

    if ratio < 0.03 or ratio > 0.97:
        return 'new'
    elif ratio < 0.23:
        return 'waxing_crescent'
    elif ratio < 0.27:
        return 'first_quarter'
    elif ratio < 0.47:
        return 'waxing_gibbous'
    elif ratio < 0.53:
        return 'full'
    elif ratio < 0.73:
        return 'waning_gibbous'
    elif ratio < 0.77:
        return 'last_quarter'
    else:
        return 'waning_crescent'


def get_planet_sign(planet_obj: ephem.Body) -> str:
    """Повертає знак зодіаку планети."""
    ecl = ephem.Ecliptic(planet_obj)
    lon_deg = float(ecl.lon) * 180 / ephem.pi
    return get_zodiac_sign(lon_deg % 360)


def is_retrograde(planet_class, date: datetime, prev_date: datetime) -> bool:
    """Визначає чи планета ретроградна (рухається назад)."""
    p1 = planet_class(prev_date)
    p2 = planet_class(date)
    ecl1 = ephem.Ecliptic(p1)
    ecl2 = ephem.Ecliptic(p2)
    lon1 = float(ecl1.lon) * 180 / ephem.pi
    lon2 = float(ecl2.lon) * 180 / ephem.pi

    # Враховуємо перехід через 0°/360°
    diff = (lon2 - lon1 + 180) % 360 - 180
    return diff < 0


def get_next_new_moon(from_date: datetime) -> datetime:
    """Наступне новолуння після дати."""
    d = ephem.next_new_moon(from_date)
    return ephem.Date(d).datetime()


def get_next_full_moon(from_date: datetime) -> datetime:
    """Наступня повня після дати."""
    d = ephem.next_full_moon(from_date)
    return ephem.Date(d).datetime()


def build_calendar(days: int = 30) -> dict:
    """
    Будує астрологічний календар на наступні N днів.
    Повертає JSON з основними подіями.
    """
    now = datetime.utcnow()
    calendar = {
        'generated_at': now.isoformat() + 'Z',
        'kyiv_offset': KYIV_UTC_OFFSET,
        'today': {},
        'events': [],
        'moon_phases': [],
        'retrogrades': [],
    }

    # Обчислення поточного дня
    moon_today = ephem.Moon(now)
    sun_today = ephem.Sun(now)

    ecl_moon = ephem.Ecliptic(moon_today)
    ecl_sun = ephem.Ecliptic(sun_today)
    lon_moon = float(ecl_moon.lon) * 180 / ephem.pi % 360
    lon_sun = float(ecl_sun.lon) * 180 / ephem.pi % 360

    phase_key = get_moon_phase_precise(now)

    calendar['today'] = {
        'date': (now + timedelta(hours=KYIV_UTC_OFFSET)).strftime('%Y-%m-%d'),
        'moon_sign': get_zodiac_sign(lon_moon),
        'moon_phase': MOON_PHASES_UA.get(phase_key, ''),
        'moon_phase_key': phase_key,
        'sun_sign': get_zodiac_sign(lon_sun),
        'moon_illumination': round(float(moon_today.phase), 1),
    }

    # Перевірка ретроградних планет (Меркурій, Венера, Марс)
    planets_to_check = [
        ('Меркурій', ephem.Mercury),
        ('Венера', ephem.Venus),
        ('Марс', ephem.Mars),
        ('Юпітер', ephem.Jupiter),
        ('Сатурн', ephem.Saturn),
    ]

    prev_date = now - timedelta(days=1)
    for name, planet_class in planets_to_check:
        retro = is_retrograde(planet_class, now, prev_date)
        if retro:
            calendar['retrogrades'].append({
                'planet': name,
                'retrograde': True,
                'sign': get_planet_sign(planet_class(now)),
            })

    # Пошук новолунь і повень у наступні N днів
    check_date = now
    while check_date < now + timedelta(days=days):
        next_nm = get_next_new_moon(check_date)
        next_fm = get_next_full_moon(check_date)

        if next_nm < now + timedelta(days=days):
            kyiv_time = next_nm + timedelta(hours=KYIV_UTC_OFFSET)
            moon_at_nm = ephem.Moon(next_nm)
            ecl = ephem.Ecliptic(moon_at_nm)
            lon = float(ecl.lon) * 180 / ephem.pi % 360
            calendar['moon_phases'].append({
                'type': 'new_moon',
                'label': 'Новолуння 🌑',
                'date': kyiv_time.strftime('%Y-%m-%d'),
                'time_kyiv': kyiv_time.strftime('%H:%M'),
                'sign': get_zodiac_sign(lon),
            })

        if next_fm < now + timedelta(days=days):
            kyiv_time = next_fm + timedelta(hours=KYIV_UTC_OFFSET)
            moon_at_fm = ephem.Moon(next_fm)
            ecl = ephem.Ecliptic(moon_at_fm)
            lon = float(ecl.lon) * 180 / ephem.pi % 360
            calendar['moon_phases'].append({
                'type': 'full_moon',
                'label': 'Повня 🌕',
                'date': kyiv_time.strftime('%Y-%m-%d'),
                'time_kyiv': kyiv_time.strftime('%H:%M'),
                'sign': get_zodiac_sign(lon),
            })

        # Пересуваємося на 15 днів вперед щоб не дублювати
        check_date = min(next_nm, next_fm) + timedelta(days=10)
        if check_date <= now:
            check_date = now + timedelta(days=10)

    # Прибираємо дублікати і сортуємо
    seen = set()
    unique_phases = []
    for p in calendar['moon_phases']:
        key = f"{p['type']}_{p['date']}"
        if key not in seen:
            seen.add(key)
            unique_phases.append(p)
    calendar['moon_phases'] = sorted(unique_phases, key=lambda x: x['date'])

    return calendar


def format_daily_context(calendar: dict) -> str:
    """
    Форматує астрологічний контекст для щоденного поста LUNA.
    Повертає рядок для передачі в Claude API.
    """
    today = calendar['today']
    retrogrades = calendar['retrogrades']
    upcoming_phases = [p for p in calendar['moon_phases'] if p['date'] >= today['date']][:2]

    lines = [
        f"📅 Дата: {today['date']}",
        f"🌙 Місяць у {today['moon_sign']} ({today['moon_phase']}, освітленість {today['moon_illumination']}%)",
        f"☀️ Сонце у {today['sun_sign']}",
    ]

    if retrogrades:
        retro_list = ', '.join([f"{r['planet']} у {r['sign']}" for r in retrogrades])
        lines.append(f"⬅️ Ретроградні: {retro_list}")
    else:
        lines.append("✅ Жодна особиста планета не ретроградна")

    if upcoming_phases:
        phase = upcoming_phases[0]
        lines.append(f"🔜 Наступне: {phase['label']} {phase['date']} о {phase['time_kyiv']} у {phase['sign']}")

    return '\n'.join(lines)


if __name__ == '__main__':
    print("=== Астрономічний календар LUNA ===\n")
    cal = build_calendar(30)

    print("📍 Сьогодні:")
    today = cal['today']
    print(f"  Дата: {today['date']}")
    print(f"  Місяць: {today['moon_sign']} | {today['moon_phase']} | {today['moon_illumination']}% освітлення")
    print(f"  Сонце: {today['sun_sign']}")

    if cal['retrogrades']:
        print("\n⬅️ Ретроградні планети:")
        for r in cal['retrogrades']:
            print(f"  {r['planet']} у {r['sign']}")
    else:
        print("\n✅ Ретроградних особистих планет немає")

    print("\n🌙 Найближчі фази Місяця:")
    for phase in cal['moon_phases'][:4]:
        print(f"  {phase['label']} — {phase['date']} о {phase['time_kyiv']} (Київ) у {phase['sign']}")

    print("\n=== Контекст для LUNA ===")
    print(format_daily_context(cal))

    print("\n=== JSON (для передачі в скрипт) ===")
    print(json.dumps(cal, ensure_ascii=False, indent=2))
