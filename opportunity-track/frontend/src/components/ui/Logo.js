/**
 * IntHub Logo — reusable brand component
 *
 * Renders "Int" in white/foreground + "Hub" in a bold orange pill.
 * Works in both light and dark themes. Accepts size prop.
 */

export default function Logo({ size = 'md', className = '' }) {
    const sizes = {
        sm: { text: 'text-base', pill: 'px-1.5 py-0.5 text-base', gap: 'gap-0' },
        md: { text: 'text-xl', pill: 'px-2 py-0.5 text-xl', gap: 'gap-0' },
        lg: { text: 'text-3xl', pill: 'px-2.5 py-1 text-3xl', gap: 'gap-0.5' },
        xl: { text: 'text-4xl', pill: 'px-3 py-1 text-4xl', gap: 'gap-0.5' },
    };

    const s = sizes[size] || sizes.md;

    return (
        <span
            className={`inline-flex items-center ${s.gap} font-extrabold tracking-tight select-none ${className}`}
            aria-label="IntHub"
        >
            <span className={`${s.text} text-current`}>Int</span>
            <span
                className={`${s.pill} font-extrabold rounded-md text-black`}
                style={{ backgroundColor: '#f97316' }}
            >
                Hub
            </span>
        </span>
    );
}
