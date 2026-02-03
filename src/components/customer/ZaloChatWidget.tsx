'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Zalo Chat Widget Component
// Displays floating Zalo icon on product detail page
// Allows users to choose between Quick Chat and Direct Zalo Chat

type ZaloChatWidgetProps = {
  enableQuickChat?: boolean; // Toggle để ẩn/hiện "Chat nhanh" (có thể quản lý từ admin settings)
};

export default function ZaloChatWidget({ enableQuickChat = true }: ZaloChatWidgetProps) {
  const [mounted, setMounted] = useState(false);
  const [showChatOptions, setShowChatOptions] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load Zalo Chat Widget script
  useEffect(() => {
    if (!mounted) return;

    // Zalo Chat Widget Script
    // Reference: https://developers.zalo.me/docs/social/zalo-chat-widget
    // Script URL: https://sp.zalo.me/plugins/sdk.js
    const scriptId = 'zalo-chat-widget-sdk';
    
    // Check if script already exists
    if (document.getElementById(scriptId)) {
      return; // Script already loaded
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://sp.zalo.me/plugins/sdk.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      // Script loaded successfully
      console.log('[Zalo Chat Widget] Script loaded');
    };
    
    script.onerror = () => {
      console.error('[Zalo Chat Widget] Failed to load script');
    };

    document.body.appendChild(script);

    return () => {
      // Don't remove script on unmount (shared across pages)
      // Script will be reused if component remounts
    };
  }, [mounted]);

  const handleZaloClick = () => {
    setShowChatOptions(true);
  };

  const handleQuickChat = () => {
    // TODO: Implement quick chat functionality (local chat box)
    // For now, just close the modal
    setShowChatOptions(false);
    // You can implement a local chat box here if needed
  };

  const handleDirectZaloChat = () => {
    // Trigger Zalo Chat Widget
    // Reference: https://developers.zalo.me/docs/social/zalo-chat-widget
    const zaloOaId = process.env.NEXT_PUBLIC_ZALO_OA_ID || ''; // Zalo Official Account ID
    
    if (!zaloOaId) {
      console.warn('[Zalo Chat Widget] ZALO_OA_ID is not configured. Please set NEXT_PUBLIC_ZALO_OA_ID in .env.local');
      setShowChatOptions(false);
      // Fallback: Direct link to Zalo (generic)
      window.open('https://zalo.me/', '_blank');
      return;
    }

    // Use Zalo Chat Widget API to open chat
    // This will trigger browser dialog "Mở Zalo?" as shown in hình 4
    // Method 1: Use ZaloSocialSDK if available (from SDK script)
    if ((window as any).ZaloSocialSDK && (window as any).ZaloSocialSDK.openChat) {
      try {
        (window as any).ZaloSocialSDK.openChat({
          zaloOaId: zaloOaId,
        });
      } catch (err) {
        console.error('[Zalo Chat Widget] Error calling openChat:', err);
        // Fallback to direct link
        window.open(`https://zalo.me/${zaloOaId}`, '_blank');
      }
    } else {
      // Method 2: Direct link to Zalo Official Account (fallback)
      // Format: https://zalo.me/[OA_ID] or https://zalo.me/oa/[OA_ID]
      window.open(`https://zalo.me/${zaloOaId}`, '_blank');
    }
    
    setShowChatOptions(false);
  };

  const handleCloseOptions = () => {
    setShowChatOptions(false);
  };

  if (!mounted) return null;

  return (
    <>
      {/* Floating Zalo Icon */}
      <button
        onClick={handleZaloClick}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-[#0180c7] shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group hover:scale-110"
        aria-label="Chat với chúng tôi qua Zalo"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="h-8 w-8 text-white"
          fill="currentColor"
        >
          <path d="M12 2C6.48 2 2 5.58 2 10c0 2.5 1.37 4.74 3.53 6.24L5 22l5.94-2.5c.69.11 1.42.17 2.06.17 5.52 0 10-3.58 10-8S17.52 2 12 2zm0 14c-.55 0-1.1-.05-1.64-.14l-.64-.14-3.15 1.32L7.5 15.5l-.64-.14c-.54-.09-1.09-.14-1.64-.14-3.31 0-6-2.24-6-5s2.69-5 6-5 6 2.24 6 5-2.69 5-6 5z" />
        </svg>
      </button>

      {/* Chat Options Modal */}
      {showChatOptions &&
        mounted &&
        createPortal(
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
              onClick={handleCloseOptions}
            />
            {/* Modal Content */}
            <div className="fixed bottom-24 right-6 z-50 bg-white rounded-lg shadow-2xl w-80 max-w-[calc(100vw-3rem)] overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#0180c7] to-[#00a8e8] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="h-6 w-6 text-[#0180c7]"
                      fill="currentColor"
                    >
                      <path d="M12 2C6.48 2 2 5.58 2 10c0 2.5 1.37 4.74 3.53 6.24L5 22l5.94-2.5c.69.11 1.42.17 2.06.17 5.52 0 10-3.58 10-8S17.52 2 12 2zm0 14c-.55 0-1.1-.05-1.64-.14l-.64-.14-3.15 1.32L7.5 15.5l-.64-.14c-.54-.09-1.09-.14-1.64-.14-3.31 0-6-2.24-6-5s2.69-5 6-5 6 2.24 6 5-2.69 5-6 5z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">Hoa Tươi NyNa</div>
                    <div className="text-white/90 text-xs">Xin chào! Rất vui khi được hỗ trợ bạn</div>
                  </div>
                </div>
                <button
                  onClick={handleCloseOptions}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <div className="text-sm text-gray-600 text-center">
                  Bắt đầu trò chuyện với Hoa Tươi NyNa
                </div>

                {/* Chat Options */}
                <div className="space-y-2">
                  {/* Direct Zalo Chat */}
                  <button
                    onClick={handleDirectZaloChat}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#0180c7] text-white px-4 py-3 font-semibold shadow-md hover:bg-[#016ba8] transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="currentColor"
                    >
                      <path d="M12 2C6.48 2 2 5.58 2 10c0 2.5 1.37 4.74 3.53 6.24L5 22l5.94-2.5c.69.11 1.42.17 2.06.17 5.52 0 10-3.58 10-8S17.52 2 12 2zm0 14c-.55 0-1.1-.05-1.64-.14l-.64-.14-3.15 1.32L7.5 15.5l-.64-.14c-.54-.09-1.09-.14-1.64-.14-3.31 0-6-2.24-6-5s2.69-5 6-5 6 2.24 6 5-2.69 5-6 5z" />
                    </svg>
                    Chat trực tiếp qua Zalo
                  </button>

                  {/* Quick Chat (optional - có thể ẩn) */}
                  {enableQuickChat && (
                    <button
                      onClick={handleQuickChat}
                      className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 text-gray-700 px-4 py-3 font-semibold hover:bg-gray-50 transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      Chat nhanh
                    </button>
                  )}
                </div>

                <div className="text-xs text-gray-500 text-center pt-2">
                  Thông tin của bạn được bảo mật
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
