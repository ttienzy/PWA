import React, { useState, useRef, useEffect } from 'react';
import { QrCode, Camera, Download, Upload, Copy, Check, X } from 'lucide-react';
import jsQR from 'jsqr'; // Giả sử jsQR đã được cài đặt qua npm install jsqr

const QRCodeApp: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'generate' | 'scan'>('generate');
    const [inputText, setInputText] = useState('');
    const [qrCodeData, setQrCodeData] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [scannedResult, setScannedResult] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<number | null>(null);

    // Generate QR Code using QR Server API
    const generateQRCode = () => {
        if (!inputText.trim()) {
            setError('Vui lòng nhập text hoặc link');
            return;
        }
        setError('');
        const encodedText = encodeURIComponent(inputText);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedText}`;
        setQrCodeData(qrUrl);
    };

    // Download QR Code
    const downloadQRCode = () => {
        if (!qrCodeData) return;

        const link = document.createElement('a');
        link.href = qrCodeData;
        link.download = 'qrcode.png';
        link.click();
    };

    // Copy result to clipboard
    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    // Start camera for scanning and show modal
    const startCamera = async () => {
        try {
            setError('');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                },
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                setIsScanning(true);
                setShowModal(true);
                startScanning();
            }
        } catch (err) {
            setError(
                'Không thể truy cập camera. Vui lòng cho phép quyền truy cập camera.'
            );
            console.error('Camera error:', err);
        }
    };

    // Stop camera and close modal
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsScanning(false);
        setShowModal(false);
    };

    // Start scanning interval
    const startScanning = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        intervalRef.current = setInterval(() => {
            captureAndAnalyze();
        }, 500); // Tăng tần suất quét để tốt hơn (mỗi 0.5 giây)
    };

    // Capture frame from video and analyze for QR code
    const captureAndAnalyze = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
            setScannedResult(code.data);
            stopCamera();
        }
    };

    // Handle file upload for QR scanning
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError('');
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = canvasRef.current;
                if (!canvas) return;

                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);

                if (code) {
                    setScannedResult(code.data);
                } else {
                    setError('Không tìm thấy QR code trong hình ảnh.');
                }
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    return (
        <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4'>
            <div className='max-w-4xl mx-auto'>
                <div className='bg-white rounded-2xl shadow-xl overflow-hidden'>
                    {/* Header */}
                    <div className='bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white'>
                        <div className='flex items-center space-x-3'>
                            <QrCode size={32} />
                            <h1 className='text-2xl font-bold'>
                                QR Code Generator & Scanner
                            </h1>
                        </div>
                        <p className='mt-2 opacity-90'>
                            Tạo và đọc QR code một cách dễ dàng
                        </p>
                    </div>

                    {/* Navigation */}
                    <div className='flex border-b'>
                        <button
                            onClick={() => setActiveTab('generate')}
                            className={`flex-1 py-4 px-6 text-center font-semibold transition-colors ${activeTab === 'generate'
                                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Tạo QR Code
                        </button>
                        <button
                            onClick={() => setActiveTab('scan')}
                            className={`flex-1 py-4 px-6 text-center font-semibold transition-colors ${activeTab === 'scan'
                                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Quét QR Code
                        </button>
                    </div>

                    <div className='p-6'>
                        {activeTab === 'generate' ? (
                            /* QR Code Generator */
                            <div className='space-y-6'>
                                <div>
                                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                                        Nhập text hoặc link
                                    </label>
                                    <textarea
                                        value={inputText}
                                        onChange={e => setInputText(e.target.value)}
                                        placeholder='Nhập text, URL, hoặc bất kỳ nội dung nào bạn muốn tạo QR code...'
                                        className='w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none'
                                        rows={4}
                                    />
                                </div>

                                <button
                                    onClick={generateQRCode}
                                    className='w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2'
                                >
                                    <QrCode size={20} />
                                    <span>Tạo QR Code</span>
                                </button>

                                {error && (
                                    <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg'>
                                        {error}
                                    </div>
                                )}

                                {qrCodeData && (
                                    <div className='text-center space-y-4'>
                                        <div className='inline-block p-4 bg-white border border-gray-200 rounded-lg shadow-sm'>
                                            <img
                                                src={qrCodeData}
                                                alt='Generated QR Code'
                                                className='max-w-full h-auto'
                                            />
                                        </div>

                                        <div className='flex space-x-4 justify-center'>
                                            <button
                                                onClick={downloadQRCode}
                                                className='flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors'
                                            >
                                                <Download size={16} />
                                                <span>Tải xuống</span>
                                            </button>

                                            <button
                                                onClick={() => copyToClipboard(inputText)}
                                                className='flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors'
                                            >
                                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                                <span>{copied ? 'Đã sao chép!' : 'Sao chép text'}</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* QR Code Scanner */
                            <div className='space-y-6'>
                                <div className='text-center'>
                                    <p className='text-gray-600 mb-4'>
                                        Quét QR code bằng camera hoặc tải lên hình ảnh
                                    </p>

                                    <div className='flex space-x-4 justify-center'>
                                        {!isScanning ? (
                                            <button
                                                onClick={startCamera}
                                                className='flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors'
                                            >
                                                <Camera size={20} />
                                                <span>Bắt đầu quét</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={stopCamera}
                                                className='flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors'
                                            >
                                                <X size={20} />
                                                <span>Dừng quét</span>
                                            </button>
                                        )}

                                        <label className='flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors cursor-pointer'>
                                            <Upload size={20} />
                                            <span>Tải lên hình ảnh</span>
                                            <input
                                                type='file'
                                                accept='image/*'
                                                onChange={handleFileUpload}
                                                className='hidden'
                                            />
                                        </label>
                                    </div>
                                </div>

                                {error && (
                                    <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg'>
                                        {error}
                                    </div>
                                )}

                                <canvas ref={canvasRef} className='hidden' />

                                {scannedResult && (
                                    <div className='space-y-4'>
                                        <div className='bg-green-50 border border-green-200 rounded-lg p-4'>
                                            <h3 className='font-semibold text-green-800 mb-2'>
                                                Kết quả quét:
                                            </h3>
                                            <p className='text-green-700 break-all'>
                                                {scannedResult}
                                            </p>
                                        </div>

                                        <div className='flex space-x-4 justify-center'>
                                            <button
                                                onClick={() => copyToClipboard(scannedResult)}
                                                className='flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors'
                                            >
                                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                                <span>
                                                    {copied ? 'Đã sao chép!' : 'Sao chép kết quả'}
                                                </span>
                                            </button>

                                            <button
                                                onClick={() => setScannedResult('')}
                                                className='flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors'
                                            >
                                                <X size={16} />
                                                <span>Xóa kết quả</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal for Camera Scanning */}
            {showModal && (
                <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
                    <div className='bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full'>
                        <div className='flex justify-between items-center mb-4'>
                            <h2 className='text-xl font-bold'>Quét QR Code bằng Camera</h2>
                            <button
                                title='Đóng'
                                onClick={stopCamera}
                                className='text-gray-500 hover:text-gray-700'
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className='relative'>
                            <video
                                ref={videoRef}
                                className='w-full h-auto rounded-lg border border-gray-300'
                                autoPlay
                                playsInline
                                muted
                            />
                            <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
                                <div className='w-48 h-48 border-2 border-red-500 border-dashed rounded-lg'></div>
                            </div>
                        </div>
                        <p className='text-center text-gray-600 mt-4'>
                            Đưa QR code vào khung vuông để quét...
                        </p>
                        <div className='mt-6 flex justify-center'>
                            <button
                                onClick={stopCamera}
                                className='flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors'
                            >
                                <X size={20} />
                                <span>Dừng quét</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QRCodeApp;