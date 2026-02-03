# Hướng dẫn push project lên Git khi repo đang quá nặng

## Nguyên nhân repo nặng

- **Thư mục `.git` ~1.4GB** vì trước đây đã commit nhầm:
  - `node_modules/` (ví dụ file Next.js native ~115MB)
  - `.next/` (cache build, nhiều file 6–11MB)
- Một số file **không nên** nằm trong Git nhưng vẫn đang được track (commit từ trước khi thêm vào `.gitignore`):
  - `.env.local` (chứa bí mật)
  - `backup_before_migration/` (file backup DB)
  - `logs/` (log migration)
  - `.DS_Store` (file hệ điều hành)

GitHub/GitLab giới hạn push (ví dụ file đơn < 100MB, repo nên < 1GB). Repo hiện tại quá nặng nên push dễ fail hoặc rất chậm.

---

## Hai cách xử lý

### Cách 1: Repo mới – bỏ hết lịch sử (khuyến nghị, nhanh)

Tạo lại Git từ đầu, chỉ đưa code hiện tại lên (không đưa lịch sử cũ). Repo trên GitHub sẽ nhẹ, push bình thường.

**Lưu ý:** Bạn sẽ mất toàn bộ lịch sử commit cũ trên máy. Nếu cần giữ backup lịch sử, copy cả thư mục project ra chỗ khác trước khi làm.

**Bước 1 – Backup (nếu cần)**

- Copy cả thư mục project ra nơi khác, hoặc
- Ghi lại URL remote hiện tại: `git remote -v`

**Bước 2 – Xóa Git cũ và tạo repo mới**

Trong **terminal**, đứng tại thư mục gốc project (cùng cấp với `package.json`):

```bash
# Xóa thư mục .git (xóa toàn bộ lịch sử)
rm -rf .git

# Khởi tạo repo mới
git init

# Thêm remote (thay YOUR_USERNAME và YOUR_REPO bằng tên thật trên GitHub/GitLab)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
# Hoặc nếu dùng SSH:
# git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO.git
```

**Bước 3 – Đảm bảo không track file nhạy cảm / rác**

File `.gitignore` trong project đã có sẵn các mục cần thiết. Kiểm tra **không** có `.env.local` trong Git:

```bash
# Nếu vẫn thấy .env.local khi chạy git status thì đừng add nó
git status
```

Chỉ add những thứ cần thiết (code, config, ảnh public nếu bạn muốn). `.gitignore` sẽ tự loại `node_modules/`, `.next/`, `.env.local`, `backup_before_migration/`, `logs/`, `.DS_Store`.

**Bước 4 – Commit và push**

```bash
git add .
git status   # Kiểm tra không có .env.local, node_modules, .next
git commit -m "Initial commit - clean repo for Netlify deploy"
git branch -M main
git push -u origin main
```

Nếu repo trên GitHub/GitLab **đã có sẵn commit** (ví dụ có README), có thể phải pull trước hoặc force push:

```bash
git pull origin main --allow-unrelated-histories
# Giải quyết conflict nếu có, rồi:
git push -u origin main
```

Hoặc nếu bạn chắc chắn muốn ghi đè hoàn toàn bằng code local:

```bash
git push -u origin main --force
```

**Sau khi push:** Repo trên GitHub sẽ chỉ còn 1 commit, dung lượng nhỏ (vài chục MB nếu có ảnh trong `public/`, hoặc nhỏ hơn nếu không đưa ảnh nặng).

---

### Cách 2: Giữ lịch sử – xóa file nặng khỏi toàn bộ lịch sử

Cách này giữ lại lịch sử commit nhưng **xóa hẳn** `node_modules/` và `.next/` khỏi mọi commit (dùng công cụ rewrite history). Repo sau khi xử lý sẽ nhẹ hơn nhiều và có thể push được.

**Công cụ:** `git-filter-repo` (khuyến nghị) hoặc BFG Repo-Cleaner.

**Bước 1 – Cài git-filter-repo**

- **macOS (Homebrew):** `brew install git-filter-repo`
- **Python:** `pip install git-filter-repo`
- Trang chủ: https://github.com/newren/git-filter-repo

**Bước 2 – Clone repo thành bản copy (tránh làm hỏng bản gốc)**

```bash
cd /path/to/parent
git clone --mirror /Users/lamnhuttan/Documents/PJ-Website-Ban-Hoa PJ-Website-Ban-Hoa-clean.git
cd PJ-Website-Ban-Hoa-clean.git
```

**Bước 3 – Xóa node_modules và .next khỏi toàn bộ lịch sử**

```bash
git filter-repo --path node_modules --invert-paths --force
git filter-repo --path .next --invert-paths --force
```

**Bước 4 – Đưa lại thành repo bình thường và push**

```bash
cd ..
git clone PJ-Website-Ban-Hoa-clean.git PJ-Website-Ban-Hoa-new
cd PJ-Website-Ban-Hoa-new
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main --force
```

**Lưu ý:** `--force` sẽ ghi đè lịch sử trên remote. Chỉ dùng khi bạn chấp nhận mất lịch sử cũ trên GitHub hoặc đây là repo mới.

---

## Nên bỏ track những file nào (dù dùng cách 1 hay 2)

Sau khi có repo “sạch”, đảm bảo **không** commit:

| Nội dung | Đã có trong `.gitignore` |
|----------|--------------------------|
| `node_modules/` | Có |
| `.next/`, `out/` | Có |
| `.env`, `.env.local` | Có |
| `backup_before_migration/`, `*.bson`, `*.metadata.json` | Có |
| `logs/`, `*.log` | Có |
| `.DS_Store` | Có |

**Quan trọng:** Nếu `.env.local` đã từng được push lên GitHub, hãy xóa nó khỏi lịch sử (dùng Cách 2 với path `.env.local`) và **đổi hết mật khẩu/API key** đã lộ (MongoDB, NextAuth, SendGrid, Cloudinary, MoMo, VNPay, Google OAuth…).

---

## Giảm dung lượng thêm (tùy chọn)

- **Ảnh sản phẩm:** Nếu đã dùng Cloudinary cho ảnh, có thể không cần đưa `public/images/products/` vào Git (thêm `public/images/products/` vào `.gitignore` và xóa khỏi Git: `git rm -r --cached public/images/products/`). Chỉ giữ ảnh mặc định (logo, category, poster) nếu cần.
- **Backup DB:** Đừng bao giờ commit `backup_before_migration/`; giữ backup ở ổ cứng hoặc nơi riêng, không đưa lên Git.

---

## Tóm tắt nhanh (Cách 1 – repo mới)

1. Backup project nếu cần giữ bản cũ.
2. Trong thư mục project: `rm -rf .git` → `git init` → `git remote add origin <URL_REPO>`.
3. `git add .` → kiểm tra `git status` (không có `.env.local`, `node_modules`, `.next`).
4. `git commit -m "Initial commit - clean repo"` → `git branch -M main` → `git push -u origin main` (hoặc `--force` nếu cần ghi đè remote).

Sau đó bạn có thể deploy lên Netlify theo `DEPLOY_NETLIFY.md` (kết nối repo Git vừa push).
