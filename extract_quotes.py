import openpyxl
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

wb = openpyxl.load_workbook(r'C:\Users\Admin\Downloads\Trả lời sự kiện (Câu trả lời).xlsx', data_only=True)
ws = wb['Câu trả lời biểu mẫu 1']

rows = list(ws.iter_rows(values_only=True))
data = rows[1:]
valid = [r for r in data if r[1] is not None]

# Select representative quotes (anonymous, no PII)
print('=== 5+ QUOTE NGUYÊN VĂN ĐẠI DIỆN ===\n')

# 1. Not remember channel
print('[1] Quote về "Không nhớ kênh":')
for r in valid:
    if r[1] == 'Trên 5 lần' and r[8] and 'Mất thời gian' in str(r[8]) and r[3]:
        print(f'  "{r[2]}"')
        print(f'  -> Cách tìm: {r[3]}')
        print(f'  -> Ảnh hưởng: {r[8]}')
        print()
        break

# 2. Vague query
print('[2] Quote về Query mơ hồ:')
for r in valid:
    if r[2] and ('chả nhớ' in str(r[2]).lower() or 'không nhớ' in str(r[2]).lower()):
        print(f'  Query: "{r[2]}"')
        print(f'  -> Cách tìm: {r[3]}')
        print(f'  -> Nguyên nhân: {r[7]}')
        print()
        break

# 3. Used wrong document version
print('[3] Quote về "Dùng nhầm phiên bản cũ":')
for r in valid:
    if r[8] and 'Dùng nhầm' in str(r[8]):
        print(f'  Query: "{r[2]}"')
        print(f'  -> Ảnh hưởng: {r[8]}')
        print()
        break

# 4. Gave up
print('[4] Quote về "Từ bỏ tìm kiếm":')
for r in valid:
    if r[8] and 'Từ bỏ' in str(r[8]):
        print(f'  Query: "{r[2]}"')
        print(f'  -> Ảnh hưởng: {r[8]}')
        print()
        break

# 5. Asked mentor/friend
print('[5] Quote về "Phải hỏi lại":')
for r in valid:
    if r[8] and 'hỏi lại' in str(r[8]).lower() and r[3] and 'Hỏi' in str(r[3]):
        print(f'  Query: "{r[2]}"')
        print(f'  -> Cách tìm: {r[3]}')
        print(f'  -> Kết quả: {r[5]}')
        print(f'  -> Ảnh hưởng: {r[8]}')
        print()
        break

# 6. Specific Slack/Discord issue
print('[6] Quote về trải nghiệm Discord Search:')
for r in valid:
    if r[3] and 'Discord Search' in str(r[3]) and r[4] and 'Trên 10' in str(r[4]):
        print(f'  Query: "{r[2]}"')
        print(f'  -> Cách tìm: {r[3]}')
        print(f'  -> Thời gian: {r[4]}')
        print(f'  -> Kết quả: {r[5]}')
        print()
        break

# Show unique document categories
print('\n=== CÁC LOẠI TÀI LIỆU ĐƯỢC TÌM (mẫu) ===')
seen = set()
for r in valid:
    if r[2] and str(r[2]) not in seen:
        text = str(r[2])
        if len(text) > 5 and text not in ['Tôi chả nhớ', 'Không nhớ', 'Forgot', 'slide', 'Hackathon']:
            seen.add(text)
            print(f'  - {text}')
        if len(seen) > 20:
            break