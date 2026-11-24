/**
 * Store & WhatsApp Business Configuration
 * --------------------------------------
 * Update WHATSAPP_BUSINESS_NUMBER with your active WhatsApp Business number
 * in international format without "+" or spaces (e.g., "923001234567").
 */

export const STORE_CONFIG = {
  brandName: 'Zaveri Atelier',
  tagline: 'Fine 22K Gold, Polki & Bridal Jewellery',
  // Pakistan WhatsApp Business number (international format without "+")
  whatsappBusinessNumber: '923001234567',
  whatsappDisplayNumber: '+92 300 123 4567',
  email: 'concierge@zaveriatelier.pk',
  currencyCode: 'PKR',
  currencyPrefix: 'Rs.',
  freeDeliveryThresholdPkr: 50000,
  standardDeliveryFeePkr: 500,
  boutiques: [
    {
      city: 'Lahore Flagship',
      address: '24-B MM Alam Road, Gulberg III, Lahore',
      hours: 'Monday – Saturday · 11:30 AM – 9:00 PM',
      phone: '+92 42 3575 8812',
    },
    {
      city: 'Karachi Salon',
      address: '12th Street, Block 4 Clifton, Karachi',
      hours: 'Monday – Saturday · 12:00 PM – 9:30 PM',
      phone: '+92 21 3583 4419',
    },
  ],
} as const;

/**
 * Formats any numeric amount consistently in Pakistani Rupees (PKR).
 * Example: 12500 -> "Rs. 12,500"
 */
export function formatPKR(amount: number): string {
  const safeAmount = Math.max(0, Math.round(Number.isFinite(amount) ? amount : 0));
  return `${STORE_CONFIG.currencyPrefix} ${safeAmount.toLocaleString('en-PK')}`;
}

export interface WhatsAppSingleOrderItem {
  name: string;
  sku: string;
  category: string;
  material: string;
  size: string;
  quantity: number;
  unitPricePkr: number;
}

export interface WhatsAppCartOrderItem {
  name: string;
  sku: string;
  size: string;
  quantity: number;
  unitPricePkr: number;
}

export function buildSingleProductWhatsAppMessage(
  item: WhatsAppSingleOrderItem,
  customerNote?: string
): string {
  const total = item.unitPricePkr * item.quantity;
  const lines = [
    'Assalam-o-Alaikum! I want to order this jewellery product:',
    '',
    `Product: ${item.name} (${item.sku})`,
    `Category: ${item.category}`,
    `Material: ${item.material}`,
    `Selected Size: ${item.size}`,
    `Quantity: ${item.quantity}`,
    `Price: ${formatPKR(item.unitPricePkr)}`,
    `Total: ${formatPKR(total)}`,
  ];

  if (customerNote && customerNote.trim()) {
    lines.push('', `Customer Details / Note: ${customerNote.trim()}`);
  }

  lines.push('', 'Please share availability and confirmation details.');
  return lines.join('\n');
}

export function buildCartWhatsAppMessage(
  items: WhatsAppCartOrderItem[],
  subtotalPkr: number,
  deliveryPkr: number,
  totalPkr: number,
  customerNote?: string
): string {
  const lines = ['Assalam-o-Alaikum! I would like to place an order for these pieces:', ''];

  items.forEach((item, index) => {
    const lineTotal = item.unitPricePkr * item.quantity;
    lines.push(
      `${index + 1}. ${item.name} (${item.sku})`,
      `   Size: ${item.size} | Qty: ${item.quantity} | Price: ${formatPKR(item.unitPricePkr)} | Line Total: ${formatPKR(lineTotal)}`
    );
  });

  lines.push(
    '',
    `Subtotal: ${formatPKR(subtotalPkr)}`,
    `Insured Delivery: ${deliveryPkr === 0 ? 'Complimentary (Rs. 0)' : formatPKR(deliveryPkr)}`,
    `Total Payable: ${formatPKR(totalPkr)}`
  );

  if (customerNote && customerNote.trim()) {
    lines.push('', `Customer Details / Note: ${customerNote.trim()}`);
  }

  lines.push('', 'Please confirm availability and next steps for order confirmation.');
  return lines.join('\n');
}

export function buildInquiryWhatsAppMessage(
  name: string,
  phone: string,
  city: string,
  subject: string,
  message: string
): string {
  return [
    'Assalam-o-Alaikum! Jewellery Concierge Inquiry:',
    '',
    `Name: ${name || 'Guest'}`,
    `Phone: ${phone || 'Not provided'}`,
    `City: ${city || 'Not provided'}`,
    `Subject: ${subject || 'General Inquiry'}`,
    '',
    `Message: ${message}`,
  ].join('\n');
}

export function getWhatsAppUrl(message: string): string {
  const phone = STORE_CONFIG.whatsappBusinessNumber.replace(/[^\d]/g, '');
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encoded}`;
}
