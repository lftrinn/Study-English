# TOEIC — định dạng dữ liệu tự thêm

Hướng dẫn soạn đề + media để import vào **TOEIC Training Center**. Toàn bộ
dữ liệu lưu **local** trên thiết bị (IndexedDB) — không có server, không upload
đi đâu. Muốn dùng trên máy khác: giữ folder gốc và import lại.

> In-app: TOEIC Hub → nút **Quản lý nội dung** (góc trên phải) cũng có guide rút gọn + nút import.

---

## 1. Cấu trúc folder

Tên folder tùy ý. Bên trong gồm file câu hỏi `.json` và file media:

```
my-toeic/
├── part1.json
├── part2.json
├── part5.json
├── p1-001.jpg        # ảnh cho câu p1-001 (Part 1)
├── p1-001.mp3        # audio cho câu p1-001
├── p2-005.mp3
└── g3-02.mp3         # audio dùng chung cho nhóm câu Part 3
```

Import: **Quản lý nội dung → Chọn folder** (Chrome/Edge/Firefox/Safari desktop).
Trên iPhone/iPad dùng **Chọn nhiều file** (chọn tất cả file một lúc).

---

## 2. File câu hỏi (JSON)

Mỗi Part một file. Cấu trúc:

```json
{
  "part": 1,
  "questions": [ /* mảng câu hỏi, xem mục 4 */ ]
}
```

- `part`: số nguyên 1–7.
- `questions`: mảng, mỗi phần tử là 1 câu hỏi.
- Import lại cùng `id` sẽ **ghi đè** câu cũ (idempotent).

---

## 3. Quy ước đặt tên

| Thành phần | Quy ước | Ví dụ |
|---|---|---|
| Question ID | `p{PART}-{NNN}` | `p1-001`, `p5-014` |
| Ảnh | `{id}.{jpg\|jpeg\|png\|webp\|gif\|avif}` | `p1-001.jpg` |
| Audio | `{id}.{mp3\|m4a\|ogg\|wav\|aac}` | `p2-005.mp3` |
| Audio nhóm | tên tùy ý, tham chiếu trong `audio` | `g3-02.mp3` |

Trong JSON, field `image` / `audio` ghi **đúng tên file** (không nhúng base64):

```json
{ "id": "p1-001", "kind": "photo", "image": "p1-001.jpg", "audio": "p1-001.mp3", ... }
```

App khớp file với câu hỏi theo tên file. Câu nào chưa có audio → tự fallback
sang giọng đọc máy (TTS).

---

## 4. Schema theo từng `kind`

Field chung (mọi kind): `id` (bắt buộc), `kind` (bắt buộc), `tags?`, `explain?`,
`image?`, `audio?`.

### `photo` — Part 1
```json
{
  "id": "p1-001", "kind": "photo", "topic": "office",
  "image": "p1-001.jpg", "audio": "p1-001.mp3",
  "options": ["A...", "B...", "C...", "D..."],
  "correct": 0,
  "explain": "...", "tags": ["Động từ trạng thái"]
}
```

### `qa` — Part 2
```json
{
  "id": "p2-001", "kind": "qa", "audio": "p2-001.mp3",
  "q": "When did the report arrive?",
  "options": ["Yesterday afternoon.", "In the conference room.", "Yes, it does."],
  "correct": 0, "explain": "...", "tags": ["Wh-questions"]
}
```

### `conv` — Part 3 / `talk` — Part 4
```json
{
  "id": "p3-001", "kind": "conv", "topic": "meeting", "audio": "g3-01.mp3",
  "context": "(M) ... (W) ...",
  "q": "What does the woman propose?",
  "options": ["...", "...", "...", "..."],
  "correct": 1, "explain": "...", "tags": ["Speaker intent"]
}
```
(`talk` giống hệt, dùng cho Part 4.)

### `fill` — Part 5
```json
{
  "id": "p5-001", "kind": "fill",
  "q": "The new policy will _____ next quarter.",
  "options": ["take effect", "taking effect", "taken effect", "takes effect"],
  "correct": 0, "explain": "...", "tags": ["Verb tense"]
}
```
Chỗ trống viết bằng `_____` (≥1 dấu gạch dưới).

### `cloze` — Part 6
```json
{
  "id": "p6-001", "kind": "cloze",
  "passage": "Dear team, ... (1) ___ the move ... (2) ___ the same code ...",
  "blanks": [
    { "idx": 1, "options": ["Despite", "Before", "Until", "During"], "correct": 1, "explain": "..." },
    { "idx": 2, "options": ["will use", "used", "has used", "is using"], "correct": 0, "explain": "..." }
  ],
  "tags": ["Cohesion"]
}
```
Chỗ trống trong `passage` viết dạng `(1) ___`, `(2) ___` khớp với `idx`.

### `passage` — Part 7
```json
{
  "id": "p7-001", "kind": "passage", "topic": "email",
  "passage": "Subject: ...\n\nHi Marcus, ...",
  "questions": [
    { "q": "What is the main purpose?", "options": ["...","...","...","..."], "correct": 1, "explain": "..." },
    { "q": "What concern is raised?", "options": ["...","...","...","..."], "correct": 1, "explain": "..." }
  ],
  "tags": ["Single passage"]
}
```

---

## 5. Quy tắc & validation

- `correct` là **index** (bắt đầu từ 0) trong mảng `options`.
- `options` ≥ 2 chuỗi.
- `tags` nên trùng tên skill của Part (để Skill Practice lọc đúng) — xem skill mỗi Part trong app.
- Import sẽ báo lỗi từng câu (id + lý do) nếu sai schema; câu hợp lệ vẫn được nhận, câu lỗi bị bỏ qua.

---

## 6. Lưu trữ & quyền

- Trình duyệt chỉ **đọc** folder bạn chọn; không sửa/xoá file gốc.
- Dữ liệu copy vào **IndexedDB** trên thiết bị hiện tại. Xoá trong app =
  chỉ xoá bản copy, file gốc của bạn vẫn còn.
- App xin **persistent storage** để trình duyệt không tự dọn khi thiếu dung lượng.
- Audio nặng (vài MB/file) → theo dõi mục "Dung lượng đã dùng" trong Quản lý nội dung.
