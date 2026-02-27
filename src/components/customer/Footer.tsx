import Link from 'next/link';
import { FACEBOOK_CONTACT_LINK, CONTACT_PHONE, ZALO_ORDER_LINK } from '@/lib/contact';

const contact = [
  { icon: '📍', text: '196/3, Kp 2, Phường Long Khánh, Đồng Nai' },
  { icon: '☎️', text: `Phone: ${CONTACT_PHONE}` },
  { icon: '📞', text: `Zalo: ${CONTACT_PHONE}` },
  { icon: '✉️', text: 'bichny22t31@gmail.com' },
];

const brandLinks = [
  { label: 'Giới thiệu', href: '#' },
  { label: 'Liên hệ', href: '#' },
  { label: 'Kinh nghiệm chọn hoa tươi', href: '#' },
];

const supportLinks = [
  { label: 'Chính sách và điều khoản', href: '#' },
  { label: 'Thắc mắc và khiếu nại', href: '#' },
  { label: 'Chính sách bảo mật', href: '#' },
  { label: 'Chính sách vận chuyển', href: '#' },
  { label: 'Chính sách đổi trả và hoàn tiền', href: '#' },
  { label: 'Hướng dẫn thanh toán', href: '#' },
];

const socials = [
  { label: 'Facebook', href: FACEBOOK_CONTACT_LINK, char: 'f' },
  { label: 'Zalo', href: ZALO_ORDER_LINK, char: 'Z' },
];

export default function CustomerFooter() {
  return (
    <footer className="bg-[#0f5c5c] text-white mt-10 sm:mt-12">
      <div className="container-section py-10 sm:py-12 md:py-16">
        <div className="grid gap-8 sm:gap-10 lg:gap-14 lg:grid-cols-4 pt-6 sm:pt-7">
          <div className="space-y-4">
            <div>
              <div className="text-base sm:text-xl font-bold text-[#f6c142] uppercase">VỀ CHÚNG TÔI</div>
              <div className="text-2xl sm:text-3xl font-bold mt-1 leading-tight">HOA TƯƠI NYNA</div>
            </div>
            <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base">
              {contact.map((c) => (
                <li key={c.text} className="flex items-start gap-2">
                  <span>{c.icon}</span>
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <div className="text-base sm:text-xl font-bold text-[#f6c142] uppercase">THƯƠNG HIỆU</div>
            <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base">
              {brandLinks.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:text-[#f6c142] flex items-center gap-2">
                    <span className="text-[#f6c142]">›</span>
                    <span>{l.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <div className="text-base sm:text-xl font-bold text-[#f6c142] uppercase">HỖ TRỢ</div>
            <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base">
              {supportLinks.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:text-[#f6c142] flex items-center gap-2">
                    <span className="text-[#f6c142]">›</span>
                    <span>{l.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <div className="text-base sm:text-xl font-bold text-[#f6c142] uppercase">THEO DÕI</div>
            <div className="flex flex-wrap items-center gap-3">
              {socials.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white flex items-center justify-center text-[#0f5c5c] font-semibold text-base sm:text-lg shadow-sm"
                >
                  {s.char}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/10 text-center text-xs sm:text-sm text-white/70">
          © {new Date().getFullYear()} Hoa Tươi NYNA. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
