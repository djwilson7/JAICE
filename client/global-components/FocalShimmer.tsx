import type { ComponentPropsWithoutRef, CSSProperties } from "react";

type FocalShimmerProps = ComponentPropsWithoutRef<"div">;

type ParticleStyle = CSSProperties & {
  "--focal-particle-size": string;
  "--focal-particle-delay": string;
  "--focal-particle-duration": string;
  "--focal-particle-x-one": string;
  "--focal-particle-y-one": string;
  "--focal-particle-x-two": string;
  "--focal-particle-y-two": string;
};

const PARTICLES = Array.from({ length: 60 }, (_, index) => {
  const sideSequence = [
    "top",
    "bottom",
    "top",
    "right",
    "bottom",
    "left",
  ] as const;
  const side = sideSequence[index % sideSequence.length];
  const position = (index * 37.17 + (index % 5) * 8.63) % 96 + 2;
  const jitter = ((index * 13) % 7) - 3;
  const size = 0.9 + ((index * 17) % 13) / 9;
  const xOne = ((index * 19) % 11) - 5;
  const yOne = ((index * 31) % 13) - 6;
  const xTwo = ((index * 43 + 7) % 15) - 7;
  const yTwo = ((index * 23 + 3) % 11) - 5;
  const style: ParticleStyle = {
    "--focal-particle-size": `${size.toFixed(2)}px`,
    "--focal-particle-delay": `${(-((index * 0.61) % 5.3)).toFixed(2)}s`,
    "--focal-particle-duration": `${(2.8 + ((index * 29) % 23) / 10).toFixed(2)}s`,
    "--focal-particle-x-one": `${(xOne * 0.55).toFixed(2)}px`,
    "--focal-particle-y-one": `${(yOne * 0.48).toFixed(2)}px`,
    "--focal-particle-x-two": `${(xTwo * 0.46).toFixed(2)}px`,
    "--focal-particle-y-two": `${(yTwo * 0.58).toFixed(2)}px`,
  };

  if (side === "top" || side === "bottom") {
    style.left = `${position}%`;
    style[side] = `${jitter * 0.28}px`;
  } else {
    style.top = `${position}%`;
    style[side] = `${jitter * 0.28}px`;
  }

  return style;
});

export function FocalShimmer({
  children,
  className = "",
  ...props
}: FocalShimmerProps) {
  return (
    <div className={`focal-shimmer ${className}`.trim()} {...props}>
      {children}
      <span className="focal-shimmer-particles" aria-hidden="true">
        {PARTICLES.map((style, index) => (
          <i key={index} className="focal-shimmer-particle" style={style} />
        ))}
      </span>
    </div>
  );
}
