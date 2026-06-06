import { useBrandImage } from "@/global-services/useBrandImage";

export function BrandBlock() {
  const brandImg = useBrandImage();

  return (
    <div className="brand-block items-center justify-end lg:justify-center">
      <div className="brandIcon">
        <img
          src={brandImg}
          alt="JAICE"
          className="h-8 w-8 object-contain md:h-9 md:w-9 lg:h-10 lg:w-10 animate-element"
        />
      </div>
      <div
        className="brand-tag text-xs md:text-sm lg:text-base whitespace-nowrap animate-element"
      >
        Simplify Your Job Hunt
      </div>
    </div>
  );
}
