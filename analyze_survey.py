import openpyxl
import sys
import io
import json
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

wb = openpyxl.load_workbook(r'C:\Users\Admin\Downloads\Trả lời sự kiện (Câu trả lời).xlsx', data_only=True)
ws = wb['Câu trả lời biểu mẫu 1']

rows = list(ws.iter_rows(values_only=True))
headers = rows[0]
data = rows[1:]

# Filter valid responses (have at least the frequency question answered)
valid = [r for r in data if r[1] is not None]
print(f'Total responses: {len(data)}')
print(f'Valid (with frequency): {len(valid)}')
print()

# Column index reference
COL_FREQ = 1      # 7 days frequency
COL_WHAT = 2      # What document
COL_HOW = 3       # How searched
COL_TIME = 4      # How long
COL_RESULT = 5    # Result
COL_HARD = 6      # Hard factors
COL_MAIN = 7      # Main cause
COL_IMPACT = 8    # Impact
COL_SATISFACTION = 9  # Satisfaction
COL_WILLING = 10  # Willing to try
COL_NOTE = 11     # Note

# Frequency distribution
freqs = Counter(r[COL_FREQ] for r in valid)
print('=== 1. TẦN SUẤT (7 ngày gần nhất) ===')
for k, v in sorted(freqs.items(), key=lambda x: -x[1]):
    pct = v/len(valid)*100
    print(f'  {k}: {v} ({pct:.1f}%)')
print()

# How searched
hows = Counter()
for r in valid:
    if r[COL_HOW]:
        for h in str(r[COL_HOW]).split(', '):
            hows[h.strip()] += 1
print('=== 2. CÁCH TÌM KIẾM ===')
for k, v in hows.most_common():
    pct = v/len(valid)*100
    print(f'  {k}: {v} ({pct:.1f}%)')
print()

# Time spent
times = Counter(r[COL_TIME] for r in valid if r[COL_TIME])
print('=== 3. THỜI GIAN TÌM ===')
for k, v in times.most_common():
    pct = v/len(valid)*100
    print(f'  {k}: {v} ({pct:.1f}%)')
print()

# Result
results = Counter(r[COL_RESULT] for r in valid if r[COL_RESULT])
print('=== 4. KẾT QUẢ ===')
for k, v in results.most_common():
    pct = v/len(valid)*100
    print(f'  {k}: {v} ({pct:.1f}%)')
print()

# Hard factors
hards = Counter()
for r in valid:
    if r[COL_HARD]:
        for h in str(r[COL_HARD]).split(', '):
            hards[h.strip()] += 1
print('=== 5. YẾU TỐ KHÓ ===')
for k, v in hards.most_common():
    pct = v/len(valid)*100
    print(f'  {k}: {v} ({pct:.1f}%)')
print()

# Main cause
mains = Counter(r[COL_MAIN] for r in valid if r[COL_MAIN])
print('=== 6. NGUYÊN NHÂN LỚN NHẤT ===')
for k, v in mains.most_common():
    pct = v/len(valid)*100
    print(f'  {k}: {v} ({pct:.1f}%)')
print()

# Impact
impacts = Counter()
for r in valid:
    if r[COL_IMPACT]:
        for i in str(r[COL_IMPACT]).split(', '):
            impacts[i.strip()] += 1
print('=== 7. ẢNH HƯỞNG ===')
for k, v in impacts.most_common():
    pct = v/len(valid)*100
    print(f'  {k}: {v} ({pct:.1f}%)')
print()

# Satisfaction
sats = Counter(r[COL_SATISFACTION] for r in valid if r[COL_SATISFACTION])
print('=== 8. MỨC ĐỘ ĐÁP ỨNG HIỆN TẠI ===')
for k, v in sats.most_common():
    pct = v/len(valid)*100
    print(f'  {k}: {v} ({pct:.1f}%)')
print()

# Willing
wills = Counter(r[COL_WILLING] for r in valid if r[COL_WILLING])
print('=== 9. SẴN SÀNG THỬ PROTOTYPE ===')
for k, v in wills.most_common():
    pct = v/len(valid)*100
    print(f'  {k}: {v} ({pct:.1f}%)')
print()

# What documents (raw, for quote extraction)
print('=== 10. MỘT SỐ QUOTE NGUYÊN VĂN VỀ "MUỐN TÌM GÌ" ===')
for r in valid[:30]:
    if r[COL_WHAT]:
        print(f'  - "{r[COL_WHAT]}"')