with open('apps/web/src/app/(app)/admin/health/page.tsx', 'rb') as f:
    lines = f.readlines()
    line77 = lines[76]
    print('Line 77 bytes:', line77)
    print(b"'" in line77)
