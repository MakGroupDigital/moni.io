import QRCode from 'qrcode';

export const generateMoniNumber = async (userIndex: number): Promise<string> => {
  // Format: MN1000 + order number (e.g., MN10001 for 1st user, MN10002 for 2nd, etc.)
  return `MN1000${userIndex}`;
};

export const generateQRCode = async (data: {
  moniNumber: string;
  email: string;
  name: string;
}): Promise<string> => {
  try {
    const qrData = JSON.stringify(data);
    const qrCode = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCode;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};
