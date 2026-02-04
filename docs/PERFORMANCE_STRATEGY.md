# Chiến lược tối ưu tốc độ — Phân tích & Hành động

## 1. Chẩn đoán: Vì sao vẫn chậm?

### 1.1 Waterfall (chuỗi chờ)
- **Layout** gọi DB (categories, session) → xong mới **Page** gọi DB (products, posters…) → xong mới trả HTML.
- Trên client: hydrate xong mới gọi thêm API (orders, favicon, v.v.).
- **Tổng thời gian = cộng dồn**, không chạy song song tối đa.

### 1.2 Vị trí server vs database
- App (Netlify/Vercel) và MongoDB Atlas **khác region** → mỗi query thêm **50–200ms+**.
- Serverless: mỗi request có thể **cold start** → thêm vài trăm ms lần đầu.

### 1.3 Mỗi request đều đụng DB
- Không cache HTML/API ở edge → mỗi user, mỗi lần vào = **full round-trip: Browser → CDN → Server → DB**.
- Cache hiện tại (`unstable_cache`) chủ yếu **trong process**; serverless tắt process sau request → cache mất.

### 1.4 Điều hướng (navigation) chậm
- Client-side nav vẫn cần **RSC payload** từ server (data cho trang mới).
- Nếu server xa hoặc cold start → mỗi lần đổi trang = **chờ server + DB** lại.

### 1.5 Chưa tách rõ “thấy nhanh” vs “data đầy đủ”
- Chưa dùng **streaming + skeleton** triệt để → user chờ đến khi đủ data mới thấy nội dung.
- Chưa có **loading UI** chuẩn (loading.tsx) cho từng segment → cảm giác “đơ” khi chuyển trang.

---

## 2. Nguyên tắc tư duy (kiến trúc 40 năm)

1. **Giảm round-trip**: Gom request, cache mạnh, đưa data gần user (edge).
2. **Giảm waterfall**: Song song hóa, streaming, không chờ “xong hết” mới trả.
3. **Ưu tiên cảm nhận**: Shell + skeleton trong < 1s, data đổ dần (stream/prefetch).
4. **Đo rồi mới tối ưu**: TTFB / LCP / FID — biết đang chậm ở đâu (server, DB, hay front-end).

---

## 3. Giải pháp ưu tiên (theo tác động / công sức)

### Mức 1 — Thay đổi ít, tác động lớn

| # | Hành động | Lý do |
|---|-----------|--------|
| **1.1** | **Đặt MongoDB và app cùng region** | Giảm latency DB từ hàng trăm ms xuống vài chục ms. Ưu tiên số 1 nếu đang khác region. |
| **1.2** | **Cache HTML công khai ở CDN (revalidate)** | Home / danh sách category / danh sách sản phẩm: cache 60–300s. Lần đầu 1 user trả; các user sau nhận bản cache → TTFB gần như chỉ còn CDN. |
| **1.3** | **Thêm `loading.tsx` cho layout và từng route** | Chuyển trang thấy skeleton ngay, không “trắng” → cảm nhận nhanh dù server vẫn đang xử lý. |
| **1.4** | **Streaming (Suspense) cho từng block nặng** | Trả shell (header, banner) trước; từng block (featured, category products) stream sau → FCP/LCP cải thiện. |

### Mức 2 — Cache và giảm đụng DB

| # | Hành động | Lý do |
|---|-----------|--------|
| **2.1** | **Cache dữ liệu “nóng” bên ngoài (Redis/Upstash)** | Categories, featured products, product list: TTL 60–300s. Nhiều request dùng chung cache, DB chỉ chạy khi hết TTL. |
| **2.2** | **Gom data layout + page (1 lần fetch)** | Một context/server request lấy luôn: session + categories + data trang (home/category). Giảm số lần gọi DB trên một request. |
| **2.3** | **API public cache header** | `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` cho GET công khai (categories, products) để CDN cache response. |

### Mức 3 — Điều hướng và payload

| # | Hành động | Lý do |
|---|-----------|--------|
| **3.1** | **Bật prefetch cho Link quan trọng** | Next Link mặc định prefetch; đảm bảo không tắt, ưu tiên link above-the-fold → click gần như instant. |
| **3.2** | **Giảm kích thước RSC payload** | Chỉ gửi field cần thiết; chi tiết sản phẩm có thể fetch client khi vào trang chi tiết. |
| **3.3** | **Xem xét Vercel nếu đang Netlify** | Vercel tối ưu Next (ISR, edge, RSC) sẵn; Netlify cần cấu hình thêm để cache/edge tương đương. |

### Mức 4 — Đo và theo dõi

| # | Hành động | Lý do |
|---|-----------|--------|
| **4.1** | **Đo Web Vitals (LCP, TTFB, FID)** | Biết chậm do server (TTFB), do ảnh (LCP), hay do JS (FID) → tối ưu đúng chỗ. |
| **4.2** | **Lighthouse / PageSpeed** | Chạy trước/sau từng đợt tối ưu để có số liệu. |

---

## 4. Thứ tự triển khai đề xuất

1. **Đo hiện tại**: Lighthouse + TTFB trên production (và so sánh region app vs DB).
2. **Cùng region DB + app** (nếu đang khác).
3. **loading.tsx** cho (customer) và các route chính → cảm nhận điều hướng tốt hơn ngay.
4. **Bật lại revalidate cho home** (và tránh build timeout: không gọi DB lúc build, hoặc fallback empty) → cache HTML ở edge.
5. **Streaming**: Tách home thành vài Suspense boundary; shell trả trước, block nặng stream sau.
6. **Cache API + Cache-Control** cho GET công khai.
7. **Redis/Upstash** cho categories + featured khi đã có số liệu chứng minh DB là nút thắt.

---

## 5. Kết luận

- **Load lâu** thường do: **DB xa + không cache HTML/API + waterfall**.
- **Điều hướng lâu** do: **mỗi lần đổi trang đều chờ server + DB**, thiếu **loading UI** và **prefetch** hiệu quả.

Giải pháp then chốt: **đưa data gần user (cùng region + CDN cache)**, **giảm số lần và độ sâu đụng DB (cache, gom request)**, **cải thiện cảm nhận (loading, streaming)**. Ưu tiên Mức 1 trước, đo lại rồi mới đầu tư Mức 2–3.
