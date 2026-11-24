import React, { useMemo, useState } from 'react';
import { MapPin, MessageCircle, Phone, Mail, Clock, ExternalLink } from 'lucide-react';
import {
  STORE_CONFIG,
  buildInquiryWhatsAppMessage,
  getWhatsAppUrl,
} from '../config/storeConfig';
import { useStore } from '../context/StoreContext';

export function ContactView() {
  const { websiteSettings } = useStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Lahore');
  const [subject, setSubject] = useState('Bridal Appointment');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [preparedUrl, setPreparedUrl] = useState<string | null>(null);

  const waDigits = (
    websiteSettings.whatsappBusinessNumber || STORE_CONFIG.whatsappBusinessNumber
  ).replace(/[^\d]/g, '');

  const buildCustomWaUrl = (msg: string) =>
    waDigits
      ? `https://wa.me/${waDigits}?text=${encodeURIComponent(msg)}`
      : getWhatsAppUrl(msg);

  const directConciergeUrl = useMemo(
    () =>
      buildCustomWaUrl(
        'Assalam-o-Alaikum! I would like to connect with the Zaveri Atelier concierge team.'
      ),
    [waDigits]
  );

  const handlePrepareWhatsAppInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      setFormError('Please enter your name and your message before sending on WhatsApp.');
      return;
    }
    setFormError('');
    const formatted = buildInquiryWhatsAppMessage(name, phone, city, subject, message);
    setPreparedUrl(buildCustomWaUrl(formatted));
  };

  return (
    <section className="py-12 lg:py-20 bg-[#F8F5EF]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 space-y-12">
        <div className="border-b border-[#252525]/10 pb-6 max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8E6E30]">
            Private Concierge & Salons
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-medium text-[#252525] mt-1">
            Visit or Message the Atelier
          </h1>
          <p className="text-base text-[#252525]/70 mt-3 leading-relaxed">
            Reach our Lahore and Karachi specialists for sizing guidance, custom bridal sets, or insured nationwide delivery inquiries.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-5 space-y-6">
            {STORE_CONFIG.boutiques.map((b) => (
              <div key={b.city} className="p-6 bg-[#FFFDF8] border border-[#252525]/10 space-y-3">
                <h2 className="font-serif text-2xl font-semibold text-[#252525]">{b.city}</h2>
                <div className="space-y-2 text-sm text-[#252525]/75">
                  <p className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-[#8E6E30] shrink-0 mt-0.5" />
                    <span>{b.address}</span>
                  </p>
                  <p className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-[#8E6E30] shrink-0" />
                    <span>{b.hours}</span>
                  </p>
                  <p className="flex items-center gap-2.5 tabular-nums">
                    <Phone className="w-4 h-4 text-[#8E6E30] shrink-0" />
                    <span>{b.phone}</span>
                  </p>
                </div>
              </div>
            ))}

            <div className="p-6 bg-[#252525] text-[#FFFDF8] space-y-4">
              <h2 className="font-serif text-2xl font-medium">Direct WhatsApp Concierge</h2>
              <p className="text-sm text-[#FFFDF8]/75 leading-relaxed">
                Prefer instant assistance? Chat directly with our Lahore & Karachi jewellery specialists on WhatsApp.
              </p>
              <div className="space-y-2 text-xs text-[#FFFDF8]/70">
                <p className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-[#C6A15B]" />
                  <span>{websiteSettings.whatsappDisplayNumber || STORE_CONFIG.whatsappDisplayNumber}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#C6A15B]" />
                  <span>{websiteSettings.conciergeEmail || STORE_CONFIG.email}</span>
                </p>
              </div>
              <a
                href={directConciergeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] bg-[#FFFDF8] text-[#252525] text-xs font-medium hover:bg-[#E8DDCC] transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-[#8E6E30]" />
                <span>Open WhatsApp Chat</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-7 p-6 sm:p-8 bg-[#FFFDF8] border border-[#252525]/10">
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#252525] mb-2">
              Send an Atelier Inquiry
            </h2>
            <p className="text-sm text-[#252525]/65 mb-6">
              Complete the brief below to generate your formatted concierge message for WhatsApp.
            </p>

            <form onSubmit={handlePrepareWhatsAppInquiry} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-medium text-[#252525]/80 mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Zara Ahmed"
                    className="w-full px-3.5 py-2.5 min-h-[44px] bg-[#F8F5EF] border border-[#252525]/15 text-sm text-[#252525] focus:outline-none focus:border-[#C6A15B]"
                  />
                </div>
                <div>
                  <label htmlFor="contact-phone" className="block text-xs font-medium text-[#252525]/80 mb-1.5">
                    Phone / WhatsApp Number
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g., +92 300 0000000"
                    className="w-full px-3.5 py-2.5 min-h-[44px] bg-[#F8F5EF] border border-[#252525]/15 text-sm text-[#252525] focus:outline-none focus:border-[#C6A15B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-city" className="block text-xs font-medium text-[#252525]/80 mb-1.5">
                    City
                  </label>
                  <input
                    id="contact-city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[44px] bg-[#F8F5EF] border border-[#252525]/15 text-sm text-[#252525] focus:outline-none focus:border-[#C6A15B]"
                  />
                </div>
                <div>
                  <label htmlFor="contact-subject" className="block text-xs font-medium text-[#252525]/80 mb-1.5">
                    Inquiry Topic
                  </label>
                  <select
                    id="contact-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[44px] bg-[#F8F5EF] border border-[#252525]/15 text-sm text-[#252525] focus:outline-none focus:border-[#C6A15B]"
                  >
                    <option value="Bridal Appointment">Bridal Appointment</option>
                    <option value="Ring & Bangle Sizing">Ring & Bangle Sizing</option>
                    <option value="Custom 22K Commission">Custom 22K Commission</option>
                    <option value="Delivery & Purity Verification">Delivery & Purity Verification</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-xs font-medium text-[#252525]/80 mb-1.5">
                  Message or Piece of Interest
                </label>
                <textarea
                  id="contact-message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us which piece or custom design you would like to discuss..."
                  className="w-full px-3.5 py-2.5 bg-[#F8F5EF] border border-[#252525]/15 text-sm text-[#252525] focus:outline-none focus:border-[#C6A15B]"
                />
              </div>

              {formError && (
                <p className="text-xs font-medium text-red-700" role="alert">
                  {formError}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  className="px-6 py-3.5 min-h-[46px] bg-[#252525] text-[#FFFDF8] text-sm font-medium hover:bg-[#363636] transition-colors cursor-pointer"
                >
                  Prepare WhatsApp Message
                </button>

                {preparedUrl && (
                  <a
                    href={preparedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3.5 min-h-[46px] border border-[#C6A15B] bg-[#F8F5EF] text-[#252525] text-sm font-medium hover:bg-[#E8DDCC] transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-[#8E6E30]" />
                    <span>Send Inquiry on WhatsApp</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
