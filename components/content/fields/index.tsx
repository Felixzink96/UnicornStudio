'use client'

import { TextField } from './TextField'
import { TextareaField } from './TextareaField'
import { RichtextField } from './RichtextField'
import { NumberField } from './NumberField'
import { RangeField } from './RangeField'
import { ImageField } from './ImageField'
import { GalleryField } from './GalleryField'
import { SelectField } from './SelectField'
import { RadioField } from './RadioField'
import { CheckboxField } from './CheckboxField'
import { ToggleField } from './ToggleField'
import { DateField } from './DateField'
import { DatetimeField } from './DatetimeField'
import { TimeField } from './TimeField'
import { ColorField } from './ColorField'
import { LinkField } from './LinkField'
import { EmailField } from './EmailField'
import { UrlField } from './UrlField'
import { RelationField } from './RelationField'
import { TaxonomyField } from './TaxonomyField'
import { GroupField } from './GroupField'
import { RepeaterField } from './RepeaterField'
import type { Field, FieldType } from '@/types/cms'

export interface FieldRendererProps {
  field: Field
  value: unknown
  onChange: (value: unknown) => void
  error?: string
  disabled?: boolean
  siteId: string
}

// Field renderer map
export const FIELD_RENDERERS: Record<
  FieldType,
  React.ComponentType<FieldRendererProps>
> = {
  text: TextField,
  textarea: TextareaField,
  richtext: RichtextField,
  number: NumberField,
  range: RangeField,
  image: ImageField,
  gallery: GalleryField,
  file: ImageField, // Use ImageField for now
  video: TextField, // Use TextField for now
  select: SelectField,
  radio: RadioField,
  checkbox: CheckboxField,
  toggle: ToggleField,
  date: DateField,
  datetime: DatetimeField,
  time: TimeField,
  color: ColorField,
  link: LinkField,
  email: EmailField,
  url: UrlField,
  relation: RelationField,
  taxonomy: TaxonomyField,
  group: GroupField,
  repeater: RepeaterField,
  flexible: RepeaterField, // Use RepeaterField for now
}

// Dynamic field renderer
export function FieldRenderer(props: FieldRendererProps) {
  const Renderer = FIELD_RENDERERS[props.field.type]

  if (!Renderer) {
    return (
      <div className="p-3 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">
        Unbekannter Feldtyp: {props.field.type}
      </div>
    )
  }

  return <Renderer {...props} />
}

// Field wrapper with label and error
export function FieldWrapper({
  field,
  error,
  children,
}: {
  field: Field
  error?: string
  children: React.ReactNode
}) {
  return (
    <div
      className="space-y-2"
      style={{ width: field.width === '100%' ? '100%' : field.width }}
    >
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-300">
          {field.label}
          {field.required && <span className="text-red-400 ml-1">*</span>}
        </label>
      </div>
      {field.instructions && (
        <p className="text-xs text-slate-500">{field.instructions}</p>
      )}
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
