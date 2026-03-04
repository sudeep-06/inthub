/**
 * SkeletonCard — animated shimmer placeholder for loading states.
 * Replaces spinners with an instant-feel skeleton layout.
 */
import React from 'react';

function SkeletonPulse({ className = '' }) {
    return (
        <div
            className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`}
        />
    );
}

export const InternshipSkeletonCard = React.memo(function InternshipSkeletonCard() {
    return (
        <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="p-5 pb-4">
                {/* Title + badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 space-y-2">
                        <SkeletonPulse className="h-4 w-4/5" />
                        <SkeletonPulse className="h-3 w-2/5" />
                    </div>
                    <SkeletonPulse className="h-6 w-12 rounded-full shrink-0" />
                </div>
                {/* Location + remote row */}
                <div className="flex gap-2 mb-3">
                    <SkeletonPulse className="h-6 w-28 rounded-lg" />
                    <SkeletonPulse className="h-6 w-16 rounded-lg" />
                </div>
                {/* Tags */}
                <div className="flex gap-1.5 mb-3">
                    <SkeletonPulse className="h-5 w-16 rounded-full" />
                    <SkeletonPulse className="h-5 w-20 rounded-full" />
                    <SkeletonPulse className="h-5 w-14 rounded-full" />
                </div>
                {/* Description */}
                <div className="space-y-1.5">
                    <SkeletonPulse className="h-3 w-full" />
                    <SkeletonPulse className="h-3 w-3/4" />
                </div>
            </div>
            {/* Footer */}
            <div className="flex items-center gap-2 px-5 py-3 border-t bg-[#f8fafc] dark:bg-secondary/20">
                <SkeletonPulse className="h-8 flex-1 rounded-[10px]" />
                <SkeletonPulse className="h-8 w-20 rounded-[10px]" />
                <SkeletonPulse className="h-8 w-8 rounded-[10px]" />
            </div>
        </div>
    );
});

/** LinkedIn-style feed skeleton — matches OpportunityCard layout */
export const FeedSkeletonCard = React.memo(function FeedSkeletonCard() {
    return (
        <div className="relative rounded-2xl border bg-white shadow-sm overflow-hidden">
            <SkeletonPulse className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" />
            <div className="pl-5 pr-4 py-4">
                {/* Header: logo + org + timestamp + badge */}
                <div className="flex items-start gap-3 mb-4">
                    <SkeletonPulse className="w-10 h-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            <SkeletonPulse className="h-4 w-32" />
                            <SkeletonPulse className="h-3 w-16" />
                            <SkeletonPulse className="h-5 w-20 rounded-full" />
                        </div>
                    </div>
                    <SkeletonPulse className="w-8 h-8 rounded-lg shrink-0" />
                </div>
                {/* Title */}
                <SkeletonPulse className="h-5 w-4/5 mb-2" />
                {/* Description */}
                <div className="space-y-2 mb-4">
                    <SkeletonPulse className="h-3 w-full" />
                    <SkeletonPulse className="h-3 w-full" />
                    <SkeletonPulse className="h-3 w-2/3" />
                </div>
                {/* Tags */}
                <div className="flex gap-2 mb-4">
                    <SkeletonPulse className="h-7 w-16 rounded-full" />
                    <SkeletonPulse className="h-7 w-20 rounded-full" />
                    <SkeletonPulse className="h-7 w-14 rounded-full" />
                    <SkeletonPulse className="h-7 w-18 rounded-full" />
                </div>
                {/* Action bar */}
                <div className="flex gap-1 pt-3 border-t border-gray-100">
                    <SkeletonPulse className="h-9 w-20 rounded-lg" />
                    <SkeletonPulse className="h-9 w-16 rounded-lg" />
                </div>
            </div>
        </div>
    );
});

/** Generic skeleton layout — single column for feed, grid for internships */
export function SkeletonGrid({ count = 6, variant = 'internship' }) {
    const Card = variant === 'feed' ? FeedSkeletonCard : InternshipSkeletonCard;
    const containerClass =
        variant === 'feed'
            ? 'flex flex-col gap-4'
            : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4';
    return (
        <div className={containerClass}>
            {Array.from({ length: count }, (_, i) => (
                <Card key={i} />
            ))}
        </div>
    );
}
