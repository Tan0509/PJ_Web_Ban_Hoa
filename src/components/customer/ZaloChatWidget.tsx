'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FACEBOOK_CONTACT_LINK, ZALO_ORDER_LINK } from '@/lib/contact';

type ZaloChatWidgetProps = {
  enableQuickChat?: boolean;
};

export default function ZaloChatWidget({ enableQuickChat = true }: ZaloChatWidgetProps) {
  const [mounted, setMounted] = useState(false);
  const [showChatOptions, setShowChatOptions] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <button
        onClick={() => setShowChatOptions(true)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-[#0180c7] shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group hover:scale-110"
        aria-label="Liên hệ nhanh"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="currentColor">
          <path d="M12 2C6.48 2 2 5.58 2 10c0 2.5 1.37 4.74 3.53 6.24L5 22l5.94-2.5c.69.11 1.42.17 2.06.17 5.52 0 10-3.58 10-8S17.52 2 12 2zm0 14c-.55 0-1.1-.05-1.64-.14l-.64-.14-3.15 1.32L7.5 15.5l-.64-.14c-.54-.09-1.09-.14-1.64-.14-3.31 0-6-2.24-6-5s2.69-5 6-5 6 2.24 6 5-2.69 5-6 5z" />
        </svg>
      </button>

      {showChatOptions &&
        createPortal(
          <>
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={() => setShowChatOptions(false)} />
            <div className="fixed bottom-24 right-6 z-50 bg-white rounded-lg shadow-2xl w-80 max-w-[calc(100vw-3rem)] overflow-hidden">
              <div className="bg-gradient-to-r from-[#0180c7] to-[#00a8e8] px-4 py-3 flex items-center justify-between">
                <div className="text-white font-semibold">Liên hệ tư vấn</div>
                <button onClick={() => setShowChatOptions(false)} className="text-white/80 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-4 space-y-2">
                <a
                  href={ZALO_ORDER_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#0180c7] text-white px-4 py-3 font-semibold shadow-md hover:bg-[#016ba8] transition-colors"
                >
                  Chat qua Zalo
                </a>

                {enableQuickChat && (
                  <a
                    href={FACEBOOK_CONTACT_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 text-gray-700 px-4 py-3 font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Chat qua Facebook
                  </a>
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}

