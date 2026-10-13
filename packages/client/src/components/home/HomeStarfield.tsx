import type { CSSProperties } from "react";

/** The wallpaper's star palette, unchanged from the pre-desktop shell. */
const HOME_STAR_COLORS = [
  "oklch(0.79 0.16 205)",
  "oklch(0.76 0.19 52)",
  "var(--marinara-chat-chrome-accent)",
  "oklch(0.92 0.04 303)",
];

const HOME_STARS = Array.from({ length: 42 }, (_, index) => ({
  x: (index * 37 + 7) % 100,
  y: (index * 53 + 11) % 100,
  size: 1 + ((index * 13) % 4),
  delay: -((index * 0.71) % 8),
  duration: 4.8 + ((index * 0.43) % 5),
  color: HOME_STAR_COLORS[index % HOME_STAR_COLORS.length],
}));

export function HomeStarfield() {
  return (
    <div className="mari-home-browser-starfield" aria-hidden="true">
      {HOME_STARS.map((star, index) => (
        <span
          key={index}
          className="mari-home-browser-star"
          style={
            {
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              color: star.color,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
