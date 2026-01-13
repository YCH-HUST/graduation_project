"use client"

/**
 * 舌象图片上传组件
 */
import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Upload, X, Image as ImageIcon, RefreshCw } from 'lucide-react'

interface ImageUploadProps {
    value?: File | null
    onChange: (file: File | null) => void
    disabled?: boolean
    error?: string
}

export function ImageUpload({ value, onChange, disabled, error }: ImageUploadProps) {
    const [preview, setPreview] = useState<string | null>(null)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)

    const handleFileChange = useCallback(async (file: File | null) => {
        if (!file) {
            setPreview(null)
            setUploadProgress(0)
            setUploadError(null)
            onChange(null)
            return
        }

        // 验证文件类型
        if (!file.type.startsWith('image/')) {
            setUploadError('请上传图片文件')
            return
        }

        // 验证文件大小 (最大 10MB)
        if (file.size > 10 * 1024 * 1024) {
            setUploadError('图片大小不能超过 10MB')
            return
        }

        setUploadError(null)
        setIsUploading(true)
        setUploadProgress(0)

        // 创建预览
        const reader = new FileReader()
        reader.onload = (e) => {
            setPreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)

        // 模拟上传进度
        for (let i = 0; i <= 100; i += 10) {
            await new Promise(resolve => setTimeout(resolve, 50))
            setUploadProgress(i)
        }

        setIsUploading(false)
        onChange(file)
    }, [onChange])

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        if (disabled) return

        const file = e.dataTransfer.files[0]
        if (file) {
            handleFileChange(file)
        }
    }, [disabled, handleFileChange])

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
    }, [])

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null
        handleFileChange(file)
    }, [handleFileChange])

    const handleRemove = useCallback(() => {
        handleFileChange(null)
    }, [handleFileChange])

    const handleRetry = useCallback(() => {
        setUploadError(null)
        if (value) {
            handleFileChange(value)
        }
    }, [value, handleFileChange])

    return (
        <div className="space-y-3">
            <div
                className={cn(
                    'relative border-2 border-dashed rounded-2xl transition-all duration-200 overflow-hidden',
                    disabled
                        ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
                        : preview
                            ? 'border-emerald-500/50 bg-emerald-50/30'
                            : error || uploadError
                                ? 'border-red-300 bg-red-50/30 hover:border-red-400'
                                : 'border-slate-300 hover:border-emerald-500 cursor-pointer bg-white dark:bg-slate-800 dark:border-slate-700'
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
            >
                {preview ? (
                    // 预览状态
                    <div className="relative aspect-[4/3]">
                        <img
                            src={preview}
                            alt="舌象预览"
                            className="w-full h-full object-cover"
                        />
                        {!disabled && (
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                        {isUploading && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <div className="w-3/4">
                                    <Progress value={uploadProgress} className="h-2" />
                                    <p className="text-white text-sm text-center mt-2">{uploadProgress}%</p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    // 上传状态
                    <label className="flex flex-col items-center justify-center gap-4 p-12 cursor-pointer">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-emerald-500" />
                        </div>
                        <div className="text-center">
                            <p className="text-slate-700 dark:text-slate-300 font-medium">
                                点击或拖拽上传舌象图片
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                支持 JPG、PNG 格式，最大 10MB
                            </p>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleInputChange}
                            className="hidden"
                            disabled={disabled}
                        />
                    </label>
                )}
            </div>

            {/* 错误提示 */}
            {(error || uploadError) && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400">{error || uploadError}</p>
                    {uploadError && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRetry}
                            className="text-red-600 hover:text-red-700 hover:bg-red-100"
                        >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            重试
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}
