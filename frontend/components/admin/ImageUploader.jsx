import { useState, useRef, useCallback } from 'react';
import { 
  Upload, Link, X, Copy, Check, 
  Image as ImageIcon, Loader, AlertCircle 
} from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

const supabase = createBrowserClient();

export default function ImageUploader({ 
  onImageSet,      // callback(url) when image is ready
  existingUrl      // pre-fill if editing existing post
}) {
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedUrl, setUploadedUrl] = useState(
    existingUrl || null
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [pasteUrl, setPasteUrl] = useState('');
  const [pasteError, setPasteError] = useState(false);
  
  const fileInputRef = useRef(null);

  // =============================================
  // CORE UPLOAD FUNCTION - Uploads to Supabase
  // =============================================
  const uploadToSupabase = useCallback(async (file) => {
    // Reset states
    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Validate file type
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 
        'image/png', 'image/webp', 'image/gif'
      ];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(
          'Invalid file type. Please use JPG, PNG, WebP, or GIF.'
        );
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        throw new Error(
          `File too large. Maximum size is 5MB. 
           Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB`
        );
      }

      // Generate unique filename to avoid conflicts
      const fileExt = file.name.split('.').pop().toLowerCase();
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substr(2, 9);
      const fileName = `blog-${timestamp}-${randomStr}.${fileExt}`;

      // Simulate progress (Supabase JS SDK doesn't have 
      // onUploadProgress, so we simulate it)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return 85;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      // *** ACTUAL UPLOAD TO SUPABASE STORAGE ***
      const { data, error: uploadError } = await supabase
        .storage
        .from('blog-images')  // bucket name
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,        // don't overwrite existing files
        });

      clearInterval(progressInterval);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Upload complete - set progress to 100
      setUploadProgress(100);

      // *** GET THE PUBLIC URL ***
      const { data: { publicUrl } } = supabase
        .storage
        .from('blog-images')
        .getPublicUrl(fileName);

      // Small delay to show 100% progress
      await new Promise(r => setTimeout(r, 400));

      // Set the URL in state
      setUploadedUrl(publicUrl);
      
      // Call parent callback with the permanent URL
      onImageSet(publicUrl);

      console.log('✅ Image uploaded successfully:', publicUrl);

    } catch (err) {
      console.error('❌ Upload failed:', err);
      setUploadError(err.message);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  }, [onImageSet]);

  // =============================================
  // FILE INPUT HANDLERS
  // =============================================
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadToSupabase(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadToSupabase(file);
  }, [uploadToSupabase]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  // =============================================
  // REMOVE IMAGE
  // =============================================
  const handleRemove = () => {
    setUploadedUrl(null);
    setUploadProgress(0);
    setUploadError(null);
    onImageSet(null);
    // Note: We don't delete from Supabase storage here
    // to keep it simple. Old images can be cleaned up
    // manually from Supabase dashboard if needed.
  };

  // =============================================
  // COPY URL
  // =============================================
  const handleCopyUrl = async () => {
    if (!uploadedUrl) return;
    await navigator.clipboard.writeText(uploadedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // =============================================
  // PASTE URL TAB
  // =============================================
  const handlePasteUrl = () => {
    if (!pasteUrl.trim()) return;
    
    // Basic URL validation
    try {
      new URL(pasteUrl);
      setUploadedUrl(pasteUrl);
      onImageSet(pasteUrl);
      setPasteError(false);
    } catch {
      setPasteError(true);
    }
  };

  // =============================================
  // RENDER
  // =============================================
  return (
    <div className="w-full">
      
      {/* Tab Switcher */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className="flex items-center gap-1.5 px-3 py-1.5 
                     rounded-lg text-xs font-medium 
                     transition-all duration-200"
          style={{
            background: activeTab === 'upload'
              ? 'rgba(124,58,237,0.2)'
              : 'rgba(255,255,255,0.04)',
            border: activeTab === 'upload'
              ? '1px solid rgba(124,58,237,0.4)'
              : '1px solid rgba(255,255,255,0.08)',
            color: activeTab === 'upload' 
              ? '#a78bfa' : 'rgb(156,163,175)'
          }}>
          <Upload className="w-3 h-3" />
          Upload Image
        </button>
        
        <button
          type="button"
          onClick={() => setActiveTab('url')}
          className="flex items-center gap-1.5 px-3 py-1.5 
                     rounded-lg text-xs font-medium 
                     transition-all duration-200"
          style={{
            background: activeTab === 'url'
              ? 'rgba(124,58,237,0.2)'
              : 'rgba(255,255,255,0.04)',
            border: activeTab === 'url'
              ? '1px solid rgba(124,58,237,0.4)'
              : '1px solid rgba(255,255,255,0.08)',
            color: activeTab === 'url' 
              ? '#a78bfa' : 'rgb(156,163,175)'
          }}>
          <Link className="w-3 h-3" />
          Paste URL
        </button>
      </div>

      {/* ====================================
          UPLOAD TAB
      ==================================== */}
      {activeTab === 'upload' && (
        <div>
          {/* Show uploaded image preview */}
          {uploadedUrl && !isUploading ? (
            <div className="rounded-xl overflow-hidden"
                 style={{
                   border: '1px solid rgba(255,255,255,0.08)'
                 }}>
              
              {/* Image Preview */}
              <div className="relative flex items-center justify-center bg-black/20" 
                   style={{ height: '180px' }}>
                <img
                  src={uploadedUrl}
                  alt="Cover preview"
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    // If image fails to load, show error
                    e.target.style.display = 'none';
                    setUploadError('Image failed to load');
                  }}
                />
                {/* Dark overlay on hover */}
                <div className="absolute inset-0 opacity-0 
                                hover:opacity-100 transition-opacity
                                flex items-center justify-center"
                     style={{ background: 'rgba(0,0,0,0.5)' }}>
                  <span className="text-white text-sm">
                    Click Remove to change image
                  </span>
                </div>
              </div>

              {/* URL + Actions */}
              <div className="p-3 flex items-center gap-2"
                   style={{ 
                     background: 'rgba(255,255,255,0.02)' 
                   }}>
                
                {/* Truncated URL */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate"
                     style={{ 
                       color: 'rgb(156,163,175)',
                       fontFamily: 'monospace'
                     }}>
                    {uploadedUrl}
                  </p>
                  <p className="text-xs mt-0.5"
                     style={{ color: '#10b981' }}>
                    ✓ Uploaded to Supabase Storage
                  </p>
                </div>

                {/* Copy URL Button */}
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="flex items-center gap-1.5 
                             px-3 py-1.5 rounded-lg text-xs 
                             font-medium transition-all flex-shrink-0"
                  style={{
                    background: copied 
                      ? 'rgba(16,185,129,0.15)' 
                      : 'rgba(124,58,237,0.15)',
                    border: copied
                      ? '1px solid rgba(16,185,129,0.3)'
                      : '1px solid rgba(124,58,237,0.3)',
                    color: copied ? '#10b981' : '#a78bfa'
                  }}>
                  {copied 
                    ? <><Check className="w-3 h-3" /> Copied!</>
                    : <><Copy className="w-3 h-3" /> Copy URL</>
                  }
                </button>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={handleRemove}
                  className="flex items-center gap-1.5 
                             px-3 py-1.5 rounded-lg text-xs 
                             font-medium transition-all flex-shrink-0"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: 'rgba(239,68,68,0.8)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 
                      'rgba(239,68,68,0.15)';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 
                      'rgba(239,68,68,0.08)';
                    e.currentTarget.style.color = 
                      'rgba(239,68,68,0.8)';
                  }}>
                  <X className="w-3 h-3" />
                  Remove
                </button>
              </div>
            </div>

          ) : isUploading ? (
            /* Uploading State */
            <div className="rounded-xl p-6 text-center"
                 style={{
                   background: 'rgba(255,255,255,0.02)',
                   border: '1px solid rgba(124,58,237,0.2)'
                 }}>
              
              <Loader className="w-8 h-8 mx-auto mb-3 
                                  animate-spin"
                      style={{ color: '#8b5cf6' }} />
              
              <p className="text-sm text-white mb-1">
                Uploading to Supabase...
              </p>
              <p className="text-xs mb-4"
                 style={{ color: 'rgb(156,163,175)' }}>
                {Math.round(uploadProgress)}%
              </p>
              
              {/* Progress Bar */}
              <div className="w-full rounded-full h-1.5 mb-2"
                   style={{ 
                     background: 'rgba(255,255,255,0.08)' 
                   }}>
                <div 
                  className="h-1.5 rounded-full transition-all 
                             duration-300"
                  style={{
                    width: `${uploadProgress}%`,
                    background: 
                      'linear-gradient(90deg, #7c3aed, #8b5cf6)'
                  }}
                />
              </div>
              
              <p className="text-xs"
                 style={{ color: 'rgb(107,114,128)' }}>
                Image will be stored permanently in Supabase
              </p>
            </div>

          ) : (
            /* Drop Zone - Idle State */
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className="rounded-xl p-8 text-center 
                         cursor-pointer transition-all duration-200"
              style={{
                border: isDragOver
                  ? '2px dashed rgba(124,58,237,0.8)'
                  : '2px dashed rgba(124,58,237,0.25)',
                background: isDragOver
                  ? 'rgba(124,58,237,0.08)'
                  : 'rgba(255,255,255,0.02)',
                transform: isDragOver ? 'scale(1.01)' : 'scale(1)'
              }}>
              
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl 
                                flex items-center justify-center 
                                mb-4"
                     style={{ 
                       background: 'rgba(124,58,237,0.1)' 
                     }}>
                  <Upload className="w-6 h-6"
                          style={{ color: '#8b5cf6' }} />
                </div>
                
                <p className="text-white text-sm font-medium mb-1">
                  {isDragOver 
                    ? 'Drop image here!' 
                    : 'Drag & drop your image here'
                  }
                </p>
                <p className="text-xs mb-3"
                   style={{ color: 'rgb(107,114,128)' }}>
                  or{' '}
                  <span style={{ color: '#a78bfa' }}
                        className="cursor-pointer">
                    click to browse files
                  </span>
                </p>
                <p className="text-xs"
                   style={{ color: 'rgb(75,85,99)' }}>
                  JPG, PNG, WebP, GIF · Max 5MB
                </p>
                <p className="text-xs mt-1"
                   style={{ color: 'rgb(75,85,99)' }}>
                  📦 Stored in Supabase Storage
                </p>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Error Message */}
          {uploadError && (
            <div className="flex items-start gap-2 mt-3 
                            p-3 rounded-lg"
                 style={{
                   background: 'rgba(239,68,68,0.08)',
                   border: '1px solid rgba(239,68,68,0.2)'
                 }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5"
                           style={{ color: '#ef4444' }} />
              <div>
                <p className="text-xs font-medium"
                   style={{ color: '#ef4444' }}>
                  Upload failed
                </p>
                <p className="text-xs mt-0.5"
                   style={{ color: 'rgba(239,68,68,0.7)' }}>
                  {uploadError}
                </p>
                <button
                  type="button"
                  onClick={() => setUploadError(null)}
                  className="text-xs mt-1 underline"
                  style={{ color: '#ef4444' }}>
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================================
          PASTE URL TAB
      ==================================== */}
      {activeTab === 'url' && (
        <div>
          <div className="flex gap-2">
            <input
              type="url"
              value={pasteUrl}
              onChange={(e) => {
                setPasteUrl(e.target.value);
                setPasteError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePasteUrl();
              }}
              placeholder="https://example.com/image.jpg"
              className="flex-1 h-11 px-4 rounded-xl text-sm text-white outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: pasteError
                  ? '1px solid rgba(239,68,68,0.5)'
                  : '1px solid rgba(255,255,255,0.08)',
              }}
              onFocus={(e) => {
                if (!pasteError) {
                  e.target.style.border = '1px solid rgba(124,58,237,0.5)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)';
                }
              }}
              onBlur={(e) => {
                if (!pasteError) {
                  e.target.style.border = '1px solid rgba(255,255,255,0.08)';
                  e.target.style.boxShadow = 'none';
                }
              }}
            />
            <button
              type="button"
              onClick={handlePasteUrl}
              className="px-4 h-11 rounded-xl text-sm 
                         font-medium text-white 
                         transition-all flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)'
              }}>
              Use Image
            </button>
          </div>

          {pasteError && (
            <p className="text-xs mt-2"
               style={{ color: '#ef4444' }}>
              ✗ Please enter a valid image URL
            </p>
          )}

          {/* URL Image Preview */}
          {uploadedUrl && activeTab === 'url' && (
            <div className="mt-3 rounded-xl overflow-hidden flex items-center justify-center bg-black/20"
                 style={{
                   border: '1px solid rgba(255,255,255,0.08)',
                   height: '150px'
                 }}>
              <img
                src={uploadedUrl}
                alt="URL preview"
                className="max-w-full max-h-full object-contain"
                onLoad={() => setPasteError(false)}
                onError={() => setPasteError(true)}
              />
              <div className="p-2 flex items-center justify-between"
                   style={{ background: 'rgba(255,255,255,0.02)' }}>
                <span className="text-xs"
                      style={{ color: '#10b981' }}>
                  ✓ Image loaded successfully
                </span>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="text-xs"
                  style={{ color: 'rgba(239,68,68,0.7)' }}>
                  Remove
                </button>
              </div>
            </div>
          )}

          <p className="text-xs mt-2"
             style={{ color: 'rgb(75,85,99)' }}>
            💡 Tip: For best results, upload the image 
            instead of using a URL. Uploaded images are 
            stored permanently in Supabase.
          </p>
        </div>
      )}
    </div>
  );
}
