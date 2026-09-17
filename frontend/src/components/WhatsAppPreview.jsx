import React from 'react';
import { CheckCheck } from 'lucide-react';

export default function WhatsAppPreview({ text, senderName = 'AI Community Lead', timeStr }) {
  const currentTime = timeStr || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Format WhatsApp markdown into HTML elements safely
  const formatWhatsAppText = (raw) => {
    if (!raw) return 'No content to preview yet.';

    // Replace code blocks ```...```
    let formatted = raw.replace(/```([\s\S]*?)```/g, '<pre style="background:rgba(0,0,0,0.3);padding:8px;border-radius:4px;font-family:var(--font-mono);font-size:0.85rem;overflow-x:auto;">$1</pre>');

    // Replace inline code `...`
    formatted = formatted.replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.25);padding:2px 4px;border-radius:3px;font-family:var(--font-mono);">$1</code>');

    // Replace bold *...*
    formatted = formatted.replace(/\*([^\*]+)\*/g, '<strong>$1</strong>');

    // Replace italics _..._
    formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Replace bullet points
    formatted = formatted.replace(/^[\s]*[-•][\s]+(.*)$/gm, '• $1');

    return formatted;
  };

  return (
    <div className="whatsapp-chat-preview">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '0.75rem', fontWeight: 700 }}>
          WA
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#E9EDEF' }}>{senderName}</div>
          <div style={{ fontSize: '0.7rem', color: '#8696A0' }}>Simulated WhatsApp Delivery</div>
        </div>
      </div>

      <div className="whatsapp-bubble">
        <div
          dangerouslySetInnerHTML={{ __html: formatWhatsAppText(text) }}
        />
        <div className="whatsapp-bubble-time">
          <span>{currentTime}</span>
          <CheckCheck size={14} color="#53BDEB" />
        </div>
      </div>
    </div>
  );
}
