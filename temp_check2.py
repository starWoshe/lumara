with open('apps/web/src/app/(app)/admin/health/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all Unicode chars that look like apostrophes
for i, line in enumerate(content.split('\n'), 1):
    for j, ch in enumerate(line):
        if ch in "'\u2019\u02bc\u0060\u00b4":
            print(f'Line {i}, col {j+1}: U+{ord(ch):04X} {repr(ch)} in context: ...{line[max(0,j-10):j+10]}...')
