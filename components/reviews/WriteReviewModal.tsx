"use client";
import { useState } from "react";
import { Star, X, Loader2, CheckCircle2, Plane, Hotel } from "lucide-react";
import { cn } from "@/lib/utils";
import { reviewApi } from "@/lib/api/services";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils/errors";

interface WriteReviewModalProps {
  booking: {
    id: string;
    bookingRef: string;
    type: "flight" | "hotel";
    entityId: string;
    entityName: string;
    route?: string;
  };
  onClose: () => void;
}

const RATING_LABELS = ["", "Terrible", "Poor", "Average", "Good", "Excellent"];

function StarRating({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "md";
}) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  const sz = size === "sm" ? "h-5 w-5" : "h-7 w-7";
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(i)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              sz,
              "transition-colors",
              i <= active
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function WriteReviewModal({ booking, onClose }: WriteReviewModalProps) {
  const isFlight = booking.type === "flight";

  const [overallRating, setOverallRating] = useState(0);
  const [punctualityRating, setPunctualityRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [valueRating, setValueRating] = useState(0);
  const [cleanlinessRating, setCleanlinessRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (overallRating === 0) {
      toast.error("Please give an overall rating");
      return;
    }
    if (comment.trim().length < 10) {
      toast.error("Please write at least 10 characters in your review");
      return;
    }

    setSubmitting(true);
    try {
      await reviewApi.submit({
        type: booking.type,
        entityId: booking.entityId,
        entityName: booking.entityName,
        bookingRef: booking.bookingRef,
        overallRating,
        ...(isFlight
          ? { punctualityRating, serviceRating, valueRating }
          : { cleanlinessRating, serviceRating, valueRating }),
        comment: comment.trim(),
      });
      setDone(true);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to submit review"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              {isFlight ? (
                <Plane className="h-4 w-4 text-amber-500" />
              ) : (
                <Hotel className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm">{booking.entityName}</p>
              <p className="text-xs text-muted-foreground">
                {booking.route || `Booking ${booking.bookingRef}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {done ? (
            /* Success state */
            <div className="py-8 text-center space-y-3">
              <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <p className="font-semibold text-lg">Thanks for your review!</p>
              <p className="text-sm text-muted-foreground">
                Your review has been submitted and is pending approval.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Overall rating */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Overall Rating *</label>
                <div className="flex items-center gap-3">
                  <StarRating value={overallRating} onChange={setOverallRating} />
                  {overallRating > 0 && (
                    <span className="text-sm text-amber-500 font-medium">
                      {RATING_LABELS[overallRating]}
                    </span>
                  )}
                </div>
              </div>

              {/* Sub-ratings */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-muted/40 rounded-xl">
                {isFlight ? (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Punctuality</p>
                      <StarRating size="sm" value={punctualityRating} onChange={setPunctualityRating} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Service</p>
                      <StarRating size="sm" value={serviceRating} onChange={setServiceRating} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Value for Money</p>
                      <StarRating size="sm" value={valueRating} onChange={setValueRating} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Cleanliness</p>
                      <StarRating size="sm" value={cleanlinessRating} onChange={setCleanlinessRating} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Service</p>
                      <StarRating size="sm" value={serviceRating} onChange={setServiceRating} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Value for Money</p>
                      <StarRating size="sm" value={valueRating} onChange={setValueRating} />
                    </div>
                  </>
                )}
              </div>

              {/* Comment */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Your Review *</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    isFlight
                      ? "How was your flight experience? Tell us about the staff, comfort, punctuality..."
                      : "How was your stay? Tell us about the rooms, cleanliness, service..."
                  }
                  rows={4}
                  maxLength={1000}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary transition-colors resize-none placeholder:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {comment.length}/1000
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || overallRating === 0}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Star className="h-4 w-4" />
                      Submit Review
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
