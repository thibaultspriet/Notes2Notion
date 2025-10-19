"use client";

import { useEffect, useState, useRef } from "react";

export default function RefreshHandler() {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const currentPullDistance = useRef(0);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if at the top of the page
      if (window.scrollY === 0) {
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartY.current === 0) return;
      if (window.scrollY > 0) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - touchStartY.current;


      // Only pull down, not up
      if (distance > 0) {
        const clampedDistance = Math.min(distance * 0.5, 120); // Damping effect
        currentPullDistance.current = clampedDistance;
        setIsPulling(true);
        setPullDistance(clampedDistance);

        // Prevent default scrolling behavior
        if (distance > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {

      if (currentPullDistance.current > 80) {
        // Trigger refresh
        window.location.reload();
      }

      setIsPulling(false);
      setPullDistance(0);
      touchStartY.current = 0;
      currentPullDistance.current = 0;
    };

    // Add event listeners
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  return (
    <>
      {/* Pull-to-refresh indicator */}
      {isPulling && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex justify-center will-change-transform"
          style={{
            transform: `translateY(${pullDistance - 60}px)`,
            transition: 'none', // Remove transition for smoother pull
          }}
        >
          <div className="bg-white rounded-full shadow-lg p-3 flex items-center gap-2">
            <div
              className={`w-6 h-6 border-3 border-primary border-t-transparent rounded-full ${pullDistance > 80 ? 'animate-spin' : ''}`}
              style={{
                opacity: Math.min(pullDistance / 80, 1),
                transform: `rotate(${pullDistance * 3.6}deg)`,
              }}
            />
            <span className="text-sm text-gray-700 font-medium">
              {pullDistance > 80 ? "Relâchez pour rafraîchir" : "Tirez pour rafraîchir"}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
