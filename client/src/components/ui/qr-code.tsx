import { QrCode } from "lucide-react";
import { cn } from "@/lib/utils";

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
  showValue?: boolean;
}

export function QRCodeDisplay({ value, size = 200, className, showValue = true }: QRCodeProps) {
  // In a real app, you'd use a QR code library like 'qrcode' or 'qr-code-generator'
  // For now, we'll show a placeholder with the QR icon
  
  return (
    <div className={cn("flex flex-col items-center space-y-2", className)}>
      <div 
        className="bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center shadow-sm"
        style={{ width: size, height: size }}
      >
        <div className="text-center text-gray-500">
          <QrCode className="w-16 h-16 mx-auto mb-2" />
          <p className="text-xs font-mono break-all px-2">
            QR: {value.substring(0, 12)}...
          </p>
        </div>
      </div>
      {showValue && (
        <p className="text-xs text-gray-500 font-mono max-w-xs break-all text-center">
          {value}
        </p>
      )}
    </div>
  );
}

export function QRCodeScanner({ onScan, className }: { onScan: (value: string) => void; className?: string }) {
  // In a real app, you'd integrate with a camera library
  const handleMockScan = () => {
    const mockQRValue = `attendance_${Date.now()}`;
    onScan(mockQRValue);
  };

  return (
    <div className={cn("flex flex-col items-center space-y-4", className)}>
      <div className="w-64 h-64 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <QrCode className="w-16 h-16 mx-auto mb-2" />
          <p className="text-sm">Point camera at QR code</p>
          <button 
            onClick={handleMockScan}
            className="mt-2 text-xs bg-blue-500 text-white px-3 py-1 rounded"
          >
            Simulate Scan
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500 text-center">
        Camera scanner will appear here in production
      </p>
    </div>
  );
}
