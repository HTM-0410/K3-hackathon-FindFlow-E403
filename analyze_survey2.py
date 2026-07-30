import openpyxl
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

wb = openpyxl.load_workbook(r'C:\Users\Admin\Downloads\Trả lời sự kiện (Câu trả lời).xlsx', data_only=True)
ws = wb['Câu trả lời biểu mẫu 1']

rows = list(ws.iter_rows(values_only=True))
data = rows[1:]
valid = [r for r in data if r[1] is not None]

# ============== KEY METRICS for spec.md ==============

n = len(valid)

# 1. Pain confirmation
pain_count = n - sum(1 for r in valid if r[1] == '0 lần')
pain_pct = pain_count / n * 100
print(f'PAIN: {pain_count}/{n} ({pain_pct:.1f}%) xác nhận gặp pain trong 7 ngày')

# 2. Frequency segments
freqs = {'1–2 lần': 0, '3–5 lần': 0, 'Trên 5 lần': 0, '0 lần': 0}
for r in valid:
    if r[1] in freqs:
        freqs[r[1]] += 1
print(f'FREQ: 1-2: {freqs["1–2 lần"]}, 3-5: {freqs["3–5 lần"]}, >5: {freqs["Trên 5 lần"]}, 0: {freqs["0 lần"]}')

# High frequency = 3+ times/week
high_freq = sum(1 for r in valid if r[1] in ['3–5 lần', 'Trên 5 lần'])
print(f'HIGH FREQ (>=3 lần/tuần): {high_freq}/{n} ({high_freq/n*100:.1f}%)')

# 3. Not remember channel
not_remember_channel = sum(1 for r in valid if r[6] and 'Không nhớ tài liệu nằm ở kênh nào' in str(r[6]))
print(f'NOT REMEMBER CHANNEL: {not_remember_channel}/{n} ({not_remember_channel/n*100:.1f}%)')

# 4. Time spent distribution
time_med = {'Dưới 2 phút': 1, '2–5 phút': 3.5, '5–10 phút': 7.5, 'Trên 10 phút': 12}
times = [r[4] for r in valid if r[4] in time_med]
if times:
    times_numeric = [time_med[t] for t in times]
    times_numeric.sort()
    median = (times_numeric[len(times_numeric)//2] if len(times_numeric) % 2
              else (times_numeric[len(times_numeric)//2 - 1] + times_numeric[len(times_numeric)//2]) / 2)
    print(f'TIME: median = {median} phút (n={len(times)})')
    # Weighted avg
    avg = sum(times_numeric) / len(times_numeric)
    print(f'TIME: avg = {avg:.1f} phút')

# 5. Main causes
mains = {}
for r in valid:
    if r[7]:
        mains[r[7]] = mains.get(r[7], 0) + 1
print('MAIN CAUSES:')
for k, v in sorted(mains.items(), key=lambda x: -x[1]):
    print(f'  {k}: {v} ({v/n*100:.1f}%)')

# 6. Impact
impacts = {}
for r in valid:
    if r[8]:
        for i in str(r[8]).split(', '):
            impacts[i.strip()] = impacts.get(i.strip(), 0) + 1
print('IMPACTS:')
for k, v in sorted(impacts.items(), key=lambda x: -x[1]):
    print(f'  {k}: {v} ({v/n*100:.1f}%)')

# 7. Satisfaction
sats = {}
for r in valid:
    if r[9]:
        sats[r[9]] = sats.get(r[9], 0) + 1
print('SATISFACTION:')
for k, v in sorted(sats.items(), key=lambda x: -x[1]):
    print(f'  {k}: {v} ({v/n*100:.1f}%)')

# Negative satisfaction
neg_sat = sum(v for k, v in sats.items() if 'Hoàn toàn không' in k or 'rất ít' in k)
print(f'NEGATIVE SAT: {neg_sat}/{n} ({neg_sat/n*100:.1f}%)')

# 8. Willing
wills = {}
for r in valid:
    if r[10]:
        wills[r[10]] = wills.get(r[10], 0) + 1
print('WILLING:')
for k, v in sorted(wills.items(), key=lambda x: -x[1]):
    print(f'  {k}: {v} ({v/n*100:.1f}%)')

willing_total = sum(v for k, v in wills.items() if 'Có' in k)
print(f'WILLING TOTAL: {willing_total}/{n} ({willing_total/n*100:.1f}%)')

# 9. Quote diversity
print('\n=== TOP DOCUMENT TYPES (trích từ COL_WHAT) ===')
docs = {}
for r in valid:
    if r[2]:
        # normalize
        text = str(r[2]).lower().strip()
        # group by keyword
        if any(k in text for k in ['slide', 'slide']):
            k = 'Slide bài giảng/lab'
            docs[k] = docs.get(k, 0) + 1
        if any(k in text for k in ['hackathon', 'hackathon']):
            k = 'Tài liệu Hackathon'
            docs[k] = docs.get(k, 0) + 1
        if any(k in text for k in ['lab']):
            k = 'Bài lab'
            docs[k] = docs.get(k, 0) + 1
        if any(k in text for k in ['video', 'link video']):
            k = 'Link video'
            docs[k] = docs.get(k, 0) + 1
        if any(k in text for k in ['github', 'git']):
            k = 'Link GitHub'
            docs[k] = docs.get(k, 0) + 1
        if any(k in text for k in ['kho', 'đề', 'ngân hàng']):
            k = 'Kho đề/ngân hàng đề'
            docs[k] = docs.get(k, 0) + 1
        if any(k in text for k in ['workshop']):
            k = 'Tài liệu workshop'
            docs[k] = docs.get(k, 0) + 1
        if any(k in text for k in ['thông báo', 'chung']):
            k = 'Thông báo chung'
            docs[k] = docs.get(k, 0) + 1
for k, v in sorted(docs.items(), key=lambda x: -x[1]):
    print(f'  {k}: {v}')

# 10. Vague queries
vague = sum(1 for r in valid if r[2] and any(
    kw in str(r[2]).lower() for kw in ['không nhớ', 'chả nhớ', 'forgot', 'slide', 'hackathon']
) and len(str(r[2]).split()) <= 3)
print(f'\nVAGUE QUERIES (<=3 words): {vague}/{n} ({vague/n*100:.1f}%)')