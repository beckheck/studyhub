import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface ColorPickerProps {
  label?: string
  value: string
  onChange: (color: string) => void
  htmlFor?: string
}

const predefinedColors = [
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
]

export default function ColorPicker({ label = 'Color', value, onChange, htmlFor }: ColorPickerProps) {
  const generateRandomColor = (): string => {
    return (
      '#' +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, '0')
    )
  }

  const handleRandomColor = () => {
    onChange(generateRandomColor())
  }

  return (
    <div>
      <Label htmlFor={htmlFor} className="text-gray-700 dark:text-gray-300">
        {label}
      </Label>
      <div className="flex items-center justify-center gap-3 mt-1">
        <div className="flex items-center gap-2 mt-1.5">
          <Input
            id={htmlFor}
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="h-10 w-10 rounded-xl cursor-pointer p-0 border-0"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {predefinedColors.map((color, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full shadow-sm hover:scale-110 transition-transform cursor-pointer"
              style={{
                backgroundColor: color,
                border: '2px solid white',
              }}
              onClick={() => onChange(color)}
            />
          ))}
        </div>
        <div
          onClick={handleRandomColor}
          className="whitespace-nowrap text-xs px-2 py-1 rounded-md font-bold cursor-pointer select-none"
          style={{
            background: `linear-gradient(45deg, ${predefinedColors.join(', ')})`,
            color: '#000000',
            textShadow: '0 0 3px #ffffff, 0 0 6px #ffffff, 0 0 9px #ffffff, 0 0 12px #ffffff, 0 0 15px #ffffff',
          }}
        >
          YOLO
        </div>
      </div>
    </div>
  )
}
