import React, { useEffect, useMemo, useState } from 'react';
import QR from 'qrcode';

interface QRCodeProps {
    value: string;
    size?: number;
    className?: string;
}

export const QRCode: React.FC<QRCodeProps> = ({ value, size = 160, className }) => {
    const [dataUrl, setDataUrl] = useState<string>('');
    const opts = useMemo(() => ({ width: size, margin: 1 }), [size]);

    useEffect(() => {
        let active = true;
        QR.toDataURL(value, opts)
            .then(url => {
                if (active) setDataUrl(url);
            })
            .catch(() => setDataUrl(''));
        return () => { active = false; };
    }, [value, opts]);

    if (!value) return null;
    return (
        <img src={dataUrl} alt="QR code" width={size} height={size} className={className} />
    );
};

export default QRCode;
