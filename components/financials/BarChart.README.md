# BarChart Component

A responsive and customizable bar chart component built with React and TypeScript, using Tailwind CSS for styling.

## Features

- 📊 **Responsive Design**: Adapts to different container sizes
- 🎨 **Customizable Styling**: Support for custom colors and themes
- 📈 **Multiple Data Types**: Supports currency, percentages, and numeric values
- 🌓 **Dark Mode Support**: Built-in dark/light mode compatibility
- ⚡ **Performance Optimized**: Uses React.useMemo for efficient re-renders
- 🔢 **Negative Values**: Handles both positive and negative data points
- 📱 **Mobile Friendly**: Touch-friendly with responsive design
- ✨ **Smooth Animations**: Optional animated transitions
- 🎯 **Accessibility**: Includes tooltips and proper ARIA support

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `BarChartData[]` | Required | Array of data points to display |
| `height` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Chart height preset |
| `showValues` | `boolean` | `false` | Show values above/below bars |
| `showGrid` | `boolean` | `true` | Show horizontal grid lines |
| `barColor` | `string` | `'bg-blue-500'` | Default bar color (Tailwind class) |
| `currency` | `boolean` | `true` | Format values as currency |
| `className` | `string` | `''` | Additional CSS classes |
| `animate` | `boolean` | `true` | Enable animations |

### BarChartData Interface

```typescript
interface BarChartData {
    label: string;    // Display label for the bar
    value: number;    // Numeric value
    color?: string;   // Optional custom color (Tailwind class)
}
```

## Height Presets

- `'sm'`: 128px (h-32)
- `'md'`: 192px (h-48) - Default
- `'lg'`: 256px (h-64)
- `'xl'`: 320px (h-80)

## Usage Examples

### Basic Usage

```tsx
import BarChart from './components/financials/BarChart';

const data = [
    { label: 'Jan', value: 12000 },
    { label: 'Feb', value: 15000 },
    { label: 'Mar', value: 18000 },
];

function MyComponent() {
    return (
        <BarChart
            data={data}
            height="md"
            showValues={true}
            currency={true}
        />
    );
}
```

### Custom Colors

```tsx
const expenseData = [
    { label: 'Materials', value: 25000, color: 'bg-red-500' },
    { label: 'Labor', value: 18000, color: 'bg-yellow-500' },
    { label: 'Equipment', value: 12000, color: 'bg-green-500' },
];

<BarChart
    data={expenseData}
    height="lg"
    showValues={true}
    currency={true}
/>
```

### Profit/Loss Chart with Negative Values

```tsx
const profitLossData = [
    { label: 'Q1', value: 5000 },
    { label: 'Q2', value: -2000 },  // Negative value
    { label: 'Q3', value: 8000 },
    { label: 'Q4', value: 12000 }
];

<BarChart
    data={profitLossData}
    height="md"
    showValues={true}
    barColor="bg-indigo-500"
    currency={true}
/>
```

### Non-Currency Data (Percentages, Counts, etc.)

```tsx
const progressData = [
    { label: 'Foundation', value: 100 },
    { label: 'Framing', value: 85 },
    { label: 'Roofing', value: 60 },
];

<BarChart
    data={progressData}
    height="sm"
    showValues={true}
    showGrid={false}
    barColor="bg-green-500"
    currency={false}  // Display as numbers, not currency
/>
```

### Minimal Chart

```tsx
<BarChart
    data={data}
    height="sm"
    showValues={false}
    showGrid={false}
    animate={false}
    className="max-w-md"
/>
```

## Styling

The component uses Tailwind CSS classes and supports both light and dark modes automatically. You can customize colors using any Tailwind background color class:

- `bg-blue-500` (default)
- `bg-red-500`
- `bg-green-500`
- `bg-yellow-500`
- `bg-purple-500`
- `bg-indigo-500`
- `bg-pink-500`
- `bg-teal-500`
- Custom Tailwind colors

## Features in Detail

### Grid Lines
Automatically calculated based on data range, showing 5 evenly distributed reference lines with formatted values.

### Negative Values
When data contains negative values, the chart automatically:
- Shows a zero reference line
- Positions negative bars below the line
- Uses appropriate rounding (bottom for negative, top for positive)

### Animations
Smooth transitions when data changes, with customizable duration and easing.

### Responsive Design
- Automatically adjusts to container width
- Touch-friendly on mobile devices
- Scales text and spacing appropriately

### Accessibility
- Tooltip on hover showing exact values
- Semantic HTML structure
- ARIA-compliant markup
- Keyboard navigation support

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Dependencies

- React 18+
- TypeScript 4.5+
- Tailwind CSS 3.0+
- `utils/finance.ts` (for formatCurrency function)

## Performance

The component is optimized for performance:
- Uses `React.useMemo` for expensive calculations
- Minimal re-renders when props don't change
- Efficient DOM updates with proper keys
- CSS-based animations for smooth performance

## Troubleshooting

### Common Issues

1. **Bars not showing**: Check that data values are numbers, not strings
2. **Colors not applying**: Ensure Tailwind classes are available in your build
3. **Animation issues**: Verify Tailwind's transition classes are included
4. **Currency formatting errors**: Ensure `utils/finance.ts` is properly imported

### Performance Tips

- Use `animate={false}` for large datasets
- Limit data points for better mobile performance
- Use `React.memo` if parent components re-render frequently

## License

This component is part of the Construction Management Application and follows the same license terms.