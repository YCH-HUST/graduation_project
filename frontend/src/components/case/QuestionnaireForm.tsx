"use client"

/**
 * 问诊表单组件
 */
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { QuestionnaireData } from '@/types'

interface QuestionnaireFormProps {
    value: QuestionnaireData
    onChange: (value: QuestionnaireData) => void
    errors?: Partial<Record<keyof QuestionnaireData, string>>
    disabled?: boolean
}

export function QuestionnaireForm({ value, onChange, errors, disabled }: QuestionnaireFormProps) {
    const updateField = (field: keyof QuestionnaireData, fieldValue: string) => {
        onChange({ ...value, [field]: fieldValue })
    }

    return (
        <div className="space-y-6">
            {/* 主诉 - 必填 */}
            <div className="space-y-2">
                <Label htmlFor="chief_complaint" className="flex items-center gap-1">
                    主诉 <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="chief_complaint"
                    placeholder="如：胁肋胀痛半月余"
                    value={value.chief_complaint || ''}
                    onChange={(e) => updateField('chief_complaint', e.target.value)}
                    disabled={disabled}
                    className={errors?.chief_complaint ? 'border-red-500' : ''}
                />
                {errors?.chief_complaint && (
                    <p className="text-sm text-red-500">{errors.chief_complaint}</p>
                )}
            </div>

            {/* 现病史 - 必填 */}
            <div className="space-y-2">
                <Label htmlFor="present_illness" className="flex items-center gap-1">
                    现病史 <span className="text-red-500">*</span>
                </Label>
                <Textarea
                    id="present_illness"
                    placeholder="请详细描述目前的症状、发病时间、诱因等"
                    value={value.present_illness || ''}
                    onChange={(e) => updateField('present_illness', e.target.value)}
                    disabled={disabled}
                    className={errors?.present_illness ? 'border-red-500' : ''}
                    rows={4}
                />
                {errors?.present_illness && (
                    <p className="text-sm text-red-500">{errors.present_illness}</p>
                )}
            </div>

            {/* 既往史 */}
            <div className="space-y-2">
                <Label htmlFor="past_history">既往史</Label>
                <Textarea
                    id="past_history"
                    placeholder="如有既往病史请描述"
                    value={value.past_history || ''}
                    onChange={(e) => updateField('past_history', e.target.value)}
                    disabled={disabled}
                    rows={2}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 睡眠质量 */}
                <div className="space-y-2">
                    <Label htmlFor="sleep_quality">睡眠质量</Label>
                    <Input
                        id="sleep_quality"
                        placeholder="如：睡眠差，多梦易醒"
                        value={value.sleep_quality || ''}
                        onChange={(e) => updateField('sleep_quality', e.target.value)}
                        disabled={disabled}
                    />
                </div>

                {/* 食欲 */}
                <div className="space-y-2">
                    <Label htmlFor="appetite">食欲</Label>
                    <Input
                        id="appetite"
                        placeholder="如：食欲减退"
                        value={value.appetite || ''}
                        onChange={(e) => updateField('appetite', e.target.value)}
                        disabled={disabled}
                    />
                </div>

                {/* 大便情况 */}
                <div className="space-y-2">
                    <Label htmlFor="bowel_movement">大便情况</Label>
                    <Input
                        id="bowel_movement"
                        placeholder="如：大便溏薄，每日1-2次"
                        value={value.bowel_movement || ''}
                        onChange={(e) => updateField('bowel_movement', e.target.value)}
                        disabled={disabled}
                    />
                </div>

                {/* 小便情况 */}
                <div className="space-y-2">
                    <Label htmlFor="urination">小便情况</Label>
                    <Input
                        id="urination"
                        placeholder="如：小便正常"
                        value={value.urination || ''}
                        onChange={(e) => updateField('urination', e.target.value)}
                        disabled={disabled}
                    />
                </div>
            </div>

            {/* 补充说明 */}
            <div className="space-y-2">
                <Label htmlFor="additional_notes">补充说明</Label>
                <Textarea
                    id="additional_notes"
                    placeholder="其他需要补充的信息"
                    value={value.additional_notes || ''}
                    onChange={(e) => updateField('additional_notes', e.target.value)}
                    disabled={disabled}
                    rows={3}
                />
            </div>
        </div>
    )
}
